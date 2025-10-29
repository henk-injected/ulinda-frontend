<template>
  <div class="tokens-container">
    <AppNavigation />
    <PageHeader title="API Tokens" description="Manage your API tokens for third-party application access." />

    <div class="tokens-content">
      <!-- No Permission Message -->
      <div v-if="!authStore.canGenerateTokens()" class="no-permission-message">
        <p>You do not have permission to generate API tokens. Please contact your administrator.</p>
      </div>

      <!-- Generate Token Section -->
      <div v-if="authStore.canGenerateTokens()" class="generate-section">
        <h2>Generate New Token</h2>
        <p class="info-text">
          You have {{ (authStore.user?.maxTokenCount || 0) - tokens.length }} of {{ authStore.user?.maxTokenCount || 0 }} tokens available.
        </p>

        <form @submit.prevent="handleGenerateToken" class="generate-form">
          <div class="form-group">
            <label for="tokenName">Token Name:</label>
            <input
              id="tokenName"
              v-model="tokenName"
              type="text"
              placeholder="e.g., My Mobile App"
              required
              :disabled="loading || tokens.length >= (authStore.user?.maxTokenCount || 0)"
            />
            <small>Choose a descriptive name to help you remember what this token is for.</small>
          </div>

          <div class="form-group">
            <label for="expiryDays">Expiry (days):</label>
            <input
              id="expiryDays"
              v-model.number="expiryDays"
              type="number"
              min="1"
              max="365"
              required
              :disabled="loading || tokens.length >= (authStore.user?.maxTokenCount || 0)"
            />
            <small>Token will expire after this many days.</small>
          </div>

          <button
            type="submit"
            class="generate-btn"
            :disabled="loading || tokens.length >= (authStore.user?.maxTokenCount || 0)"
          >
            {{ loading ? 'Generating...' : 'Generate Token' }}
          </button>
        </form>

        <!-- New Token Alert -->
        <div v-if="newlyGeneratedToken" class="new-token-alert">
          <h3>⚠️ Important: Save your token now!</h3>
          <p>This token will only be shown once. Make sure to copy it now:</p>
          <div class="token-display">
            <code>{{ newlyGeneratedToken.token }}</code>
            <button @click="copyToClipboard(newlyGeneratedToken.token)" class="copy-btn">
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <p class="token-details">
            <strong>Name:</strong> {{ newlyGeneratedToken.tokenName }}<br/>
            <strong>Expires:</strong> {{ formatDate(newlyGeneratedToken.expiryDateTime) }}
          </p>
          <button @click="closeNewTokenAlert" class="close-alert-btn">I've saved my token</button>
        </div>
      </div>

      <!-- Tokens List -->
      <div class="tokens-list-section">
        <h2>Your API Tokens</h2>

        <div v-if="loadingTokens" class="loading">Loading tokens...</div>

        <div v-else-if="tokens.length === 0" class="no-tokens">
          <p>You don't have any API tokens yet.</p>
          <p v-if="authStore.canGenerateTokens()">Generate one above to get started.</p>
        </div>

        <div v-else class="tokens-list">
          <div v-for="token in tokens" :key="token.id" class="token-item">
            <div class="token-info">
              <h3>{{ token.tokenName }}</h3>
              <p class="token-prefix">{{ token.tokenPrefix }}</p>
              <div class="token-meta">
                <span>Created: {{ formatDate(token.createdAt) }}</span>
                <span class="separator">|</span>
                <span :class="{'expired': isExpired(token.tokenExpiryDateTime)}">
                  {{ isExpired(token.tokenExpiryDateTime) ? 'Expired' : 'Expires' }}:
                  {{ formatDate(token.tokenExpiryDateTime) }}
                </span>
              </div>
            </div>
            <button
              @click="confirmDelete(token)"
              class="delete-btn"
              :disabled="deletingTokenId === token.id"
            >
              {{ deletingTokenId === token.id ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error">{{ error }}</div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="tokenToDelete" class="modal-overlay" @click="cancelDelete">
      <div class="modal" @click.stop>
        <h3>Delete Token?</h3>
        <p>Are you sure you want to delete the token <strong>"{{ tokenToDelete.tokenName }}"</strong>?</p>
        <p class="warning-text">This action cannot be undone.</p>
        <div class="modal-actions">
          <button @click="cancelDelete" class="cancel-btn">Cancel</button>
          <button @click="deleteToken" class="confirm-delete-btn">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { apiFetch, API_CONFIG } from '@/config/api'
import type { GenerateTokenRequest, GenerateTokenResponse, GetUserTokensResponse, UserTokenDto } from '@/types/tokens'
import AppNavigation from '@/components/AppNavigation.vue'
import PageHeader from '@/components/PageHeader.vue'

const authStore = useAuthStore()

const tokenName = ref('')
const expiryDays = ref(90)
const tokens = ref<UserTokenDto[]>([])
const loading = ref(false)
const loadingTokens = ref(false)
const error = ref('')
const newlyGeneratedToken = ref<GenerateTokenResponse | null>(null)
const copied = ref(false)
const tokenToDelete = ref<UserTokenDto | null>(null)
const deletingTokenId = ref<string | null>(null)

onMounted(() => {
  fetchTokens()
})

const fetchTokens = async () => {
  loadingTokens.value = true
  error.value = ''

  try {
    const response = await apiFetch(API_CONFIG.ENDPOINTS.TOKENS_MY, {
      method: 'GET'
    })

    if (!response.ok) {
      throw new Error('Failed to fetch tokens')
    }

    const data: GetUserTokensResponse = await response.json()
    tokens.value = data.tokens
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load tokens'
    console.error('Fetch tokens error:', err)
  } finally {
    loadingTokens.value = false
  }
}

const handleGenerateToken = async () => {
  if (tokens.value.length >= (authStore.user?.maxTokenCount || 0)) {
    error.value = 'You have reached the maximum number of tokens'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const request: GenerateTokenRequest = {
      tokenName: tokenName.value,
      expiryDays: expiryDays.value
    }

    const response = await apiFetch(API_CONFIG.ENDPOINTS.TOKENS_GENERATE, {
      method: 'POST',
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to generate token')
    }

    const data: GenerateTokenResponse = await response.json()
    newlyGeneratedToken.value = data

    // Reset form
    tokenName.value = ''
    expiryDays.value = 90

    // Refresh tokens list
    await fetchTokens()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to generate token'
    console.error('Generate token error:', err)
  } finally {
    loading.value = false
  }
}

const confirmDelete = (token: UserTokenDto) => {
  tokenToDelete.value = token
}

const cancelDelete = () => {
  tokenToDelete.value = null
}

const deleteToken = async () => {
  if (!tokenToDelete.value) return

  deletingTokenId.value = tokenToDelete.value.id
  error.value = ''

  try {
    const response = await apiFetch(API_CONFIG.ENDPOINTS.TOKENS_DELETE(tokenToDelete.value.id), {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Failed to delete token')
    }

    // Refresh tokens list
    await fetchTokens()
    tokenToDelete.value = null
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete token'
    console.error('Delete token error:', err)
  } finally {
    deletingTokenId.value = null
  }
}

const closeNewTokenAlert = () => {
  newlyGeneratedToken.value = null
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const isExpired = (expiryDate: string): boolean => {
  return new Date(expiryDate) < new Date()
}
</script>

<style scoped>
.tokens-container {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  background-color: #f5f5f5;
  margin: 0;
  padding: 0;
}

.tokens-content {
  padding-top: calc(195px + 2rem); /* 60px nav + 85px title + 50px description + padding */
  padding-left: 2rem;
  padding-right: 2rem;
  padding-bottom: 2rem;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
}

.no-permission-message {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  color: #856404;
}

.generate-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.generate-section h2 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #333;
}

.info-text {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.generate-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-group small {
  margin-top: 0.25rem;
  color: #666;
  font-size: 0.85rem;
}

.generate-btn {
  padding: 0.75rem 1.5rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  align-self: flex-start;
}

.generate-btn:hover:not(:disabled) {
  background-color: #218838;
}

.generate-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.new-token-alert {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #d4edda;
  border: 2px solid #28a745;
  border-radius: 8px;
}

.new-token-alert h3 {
  margin-top: 0;
  color: #155724;
}

.token-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
  padding: 1rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #c3e6cb;
}

.token-display code {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  word-break: break-all;
  color: #333;
}

.copy-btn {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.copy-btn:hover {
  background: #0056b3;
}

.token-details {
  margin: 1rem 0;
  color: #155724;
  font-size: 0.9rem;
}

.close-alert-btn {
  padding: 0.5rem 1rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.close-alert-btn:hover {
  background: #218838;
}

.tokens-list-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.tokens-list-section h2 {
  margin-top: 0;
  color: #333;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.no-tokens {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.tokens-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.token-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  transition: border-color 0.2s;
}

.token-item:hover {
  border-color: #007bff;
}

.token-info {
  flex: 1;
}

.token-info h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.1rem;
}

.token-prefix {
  font-family: 'Courier New', monospace;
  color: #666;
  font-size: 0.9rem;
  margin: 0.25rem 0;
}

.token-meta {
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.5rem;
}

.token-meta .separator {
  margin: 0 0.5rem;
}

.token-meta .expired {
  color: #dc3545;
  font-weight: 500;
}

.delete-btn {
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.delete-btn:hover:not(:disabled) {
  background: #c82333;
}

.delete-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.error {
  color: #dc3545;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 1rem;
  margin-top: 1rem;
  text-align: center;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
}

.modal h3 {
  margin-top: 0;
  color: #333;
}

.warning-text {
  color: #dc3545;
  font-size: 0.9rem;
  font-style: italic;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cancel-btn,
.confirm-delete-btn {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background: #5a6268;
}

.confirm-delete-btn {
  background: #dc3545;
  color: white;
}

.confirm-delete-btn:hover {
  background: #c82333;
}

@media (max-width: 768px) {
  .tokens-content {
    padding-top: calc(195px + 1rem);
    padding-left: 1rem;
    padding-right: 1rem;
    padding-bottom: 1rem;
  }

  .generate-section,
  .tokens-list-section {
    padding: 1.5rem;
  }

  .token-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .delete-btn {
    width: 100%;
  }

  .token-display {
    flex-direction: column;
  }

  .copy-btn {
    width: 100%;
  }
}
</style>
