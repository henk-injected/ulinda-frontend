<template>
  <div class="admin-tokens">
    <AppNavigation />
    <PageHeader title="Token Management" description="View and manage all API tokens across all users." />

    <div class="content">
      <div v-if="loading" class="loading">
        <p>Loading tokens...</p>
      </div>

      <div v-else-if="error" class="error-message">
        <p>Error loading tokens: {{ error }}</p>
        <button @click="fetchTokens" class="retry-btn">Retry</button>
      </div>

      <div v-else-if="tokens.length === 0" class="no-tokens">
        <p>No tokens found.</p>
      </div>

      <div v-else-if="tokens.length > 0" class="tokens-table-container">
        <table class="tokens-table">
          <thead>
            <tr>
              <th class="sortable" @click="handleSort('userId')">
                Username
                <span class="sort-indicator" v-if="sortBy === 'userId'">
                  {{ sortDirection === 'ASC' ? '▲' : '▼' }}
                </span>
              </th>
              <th class="sortable" @click="handleSort('tokenName')">
                Token Name
                <span class="sort-indicator" v-if="sortBy === 'tokenName'">
                  {{ sortDirection === 'ASC' ? '▲' : '▼' }}
                </span>
              </th>
              <th>Token Prefix</th>
              <th class="sortable" @click="handleSort('createdAt')">
                Created
                <span class="sort-indicator" v-if="sortBy === 'createdAt'">
                  {{ sortDirection === 'ASC' ? '▲' : '▼' }}
                </span>
              </th>
              <th class="sortable" @click="handleSort('tokenExpiryDateTime')">
                Expires
                <span class="sort-indicator" v-if="sortBy === 'tokenExpiryDateTime'">
                  {{ sortDirection === 'ASC' ? '▲' : '▼' }}
                </span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="token in tokens" :key="token.id">
              <td class="username">{{ token.username }}</td>
              <td class="token-name">{{ token.tokenName }}</td>
              <td class="token-prefix">{{ token.tokenPrefix }}</td>
              <td class="created-at">{{ formatTimestamp(token.createdAt) }}</td>
              <td class="expiry-date">{{ formatTimestamp(token.tokenExpiryDateTime) }}</td>
              <td class="actions">
                <button
                  @click="confirmDelete(token)"
                  class="delete-btn"
                  :disabled="deleting"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="pagingInfo" class="pagination-container">
          <div class="pagination-info">
            <p>
              Showing {{ pagingInfo.currentPage * pagingInfo.pageSize + 1 }} -
              {{
                Math.min(
                  (pagingInfo.currentPage + 1) * pagingInfo.pageSize,
                  pagingInfo.totalElements,
                )
              }}
              of {{ pagingInfo.totalElements }} tokens
            </p>
          </div>

          <div class="pagination-controls">
            <button
              @click="goToFirstPage"
              :disabled="pagingInfo.currentPage === 0 || loading"
              class="pagination-btn"
            >
              First
            </button>
            <button
              @click="goToPreviousPage"
              :disabled="!pagingInfo.hasPrevious || loading"
              class="pagination-btn"
            >
              Previous
            </button>
            <span class="page-info">
              Page {{ pagingInfo.currentPage + 1 }} of {{ pagingInfo.totalPages }}
            </span>
            <button
              @click="goToNextPage"
              :disabled="!pagingInfo.hasNext || loading"
              class="pagination-btn"
            >
              Next
            </button>
            <button
              @click="goToLastPage"
              :disabled="pagingInfo.currentPage === pagingInfo.totalPages - 1 || loading"
              class="pagination-btn"
            >
              Last
            </button>
          </div>

          <div class="page-size-selector">
            <label for="pageSize">Items per page:</label>
            <select
              id="pageSize"
              v-model="pageSize"
              @change="changePageSize"
              class="page-size-select"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content" @click.stop>
        <h3>Confirm Delete</h3>
        <p v-if="tokenToDelete">
          Are you sure you want to delete the token "<strong>{{ tokenToDelete.tokenName }}</strong>"
          belonging to user "<strong>{{ tokenToDelete.username }}</strong>"?
        </p>
        <p class="warning">This action cannot be undone.</p>
        <div class="modal-actions">
          <button @click="cancelDelete" class="cancel-btn" :disabled="deleting">Cancel</button>
          <button @click="deleteToken" class="confirm-delete-btn" :disabled="deleting">
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiFetch } from '@/config/api'
import type { AdminTokenDto, TokenPagingInfo, GetAllTokensResponse } from '@/types/models'
import AppNavigation from '@/components/AppNavigation.vue'
import PageHeader from '@/components/PageHeader.vue'

const router = useRouter()
const authStore = useAuthStore()

const tokens = ref<AdminTokenDto[]>([])
const pagingInfo = ref<TokenPagingInfo | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const currentPage = ref(0)
const pageSize = ref(10)
const sortBy = ref('createdAt')
const sortDirection = ref<'ASC' | 'DESC'>('DESC')

// Delete modal state
const showDeleteModal = ref(false)
const tokenToDelete = ref<AdminTokenDto | null>(null)
const deleting = ref(false)

const fetchTokens = async (page = 0, size = pageSize.value) => {
  loading.value = true
  error.value = null

  try {
    const response = await apiFetch(
      `/admin/tokens?size=${size}&pageNumber=${page}&sortBy=${sortBy.value}&sortDirection=${sortDirection.value}`,
      {
        method: 'GET',
      },
    )

    if (!response.ok) {
      if (response.status === 401) {
        authStore.logout()
        router.push('/')
        return
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: GetAllTokensResponse = await response.json()
    tokens.value = data.tokens
    pagingInfo.value = data.pagingInfo
    currentPage.value = page
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch tokens'
    console.error('Error fetching tokens:', err)
  } finally {
    loading.value = false
  }
}

const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const time = date.toLocaleTimeString()
    return `${year}/${month}/${day}, ${time}`
  } catch {
    return timestamp
  }
}

const goToFirstPage = () => {
  if (pagingInfo.value && pagingInfo.value.currentPage !== 0) {
    fetchTokens(0, pageSize.value)
  }
}

const goToPreviousPage = () => {
  if (pagingInfo.value && pagingInfo.value.hasPrevious) {
    fetchTokens(currentPage.value - 1, pageSize.value)
  }
}

const goToNextPage = () => {
  if (pagingInfo.value && pagingInfo.value.hasNext) {
    fetchTokens(currentPage.value + 1, pageSize.value)
  }
}

const goToLastPage = () => {
  if (pagingInfo.value && pagingInfo.value.currentPage !== pagingInfo.value.totalPages - 1) {
    fetchTokens(pagingInfo.value.totalPages - 1, pageSize.value)
  }
}

const changePageSize = () => {
  fetchTokens(0, pageSize.value)
}

const handleSort = (column: string) => {
  if (sortBy.value === column) {
    // Toggle direction if clicking the same column
    sortDirection.value = sortDirection.value === 'ASC' ? 'DESC' : 'ASC'
  } else {
    // Set new column and default to DESC
    sortBy.value = column
    sortDirection.value = 'DESC'
  }
  // Reset to first page when sorting changes
  fetchTokens(0, pageSize.value)
}

const confirmDelete = (token: AdminTokenDto) => {
  tokenToDelete.value = token
  showDeleteModal.value = true
}

const cancelDelete = () => {
  if (!deleting.value) {
    showDeleteModal.value = false
    tokenToDelete.value = null
  }
}

const deleteToken = async () => {
  if (!tokenToDelete.value) return

  deleting.value = true
  error.value = null

  try {
    const response = await apiFetch(`/admin/tokens/${tokenToDelete.value.id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      if (response.status === 401) {
        authStore.logout()
        router.push('/')
        return
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Refresh the current page
    await fetchTokens(currentPage.value, pageSize.value)

    // Close modal
    showDeleteModal.value = false
    tokenToDelete.value = null
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete token'
    console.error('Error deleting token:', err)
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  fetchTokens()
})
</script>

<style scoped>
.admin-tokens {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  background-color: #f5f5f5;
  margin: 0;
  padding: 0;
}

.content {
  padding-top: calc(195px + 2rem);
  padding-left: 2rem;
  padding-right: 2rem;
  padding-bottom: 2rem;
  width: 100%;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .content {
    padding-top: calc(195px + 1rem);
    padding-left: 1rem;
    padding-right: 1rem;
    padding-bottom: 1rem;
  }
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.error-message {
  text-align: center;
  padding: 2rem;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  margin: 2rem 0;
}

.error-message p {
  color: #721c24;
  margin-bottom: 1rem;
}

.retry-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background-color: #c82333;
}

.no-tokens {
  text-align: center;
  padding: 3rem;
  color: #6c757d;
  font-style: italic;
}

.tokens-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
  overflow: hidden;
  margin-bottom: 2rem;
}

.tokens-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.tokens-table thead {
  background: linear-gradient(135deg, #6f42c1, #5a2d91);
  color: white;
}

.tokens-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tokens-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  position: relative;
}

.tokens-table th.sortable:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.sort-indicator {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  opacity: 0.9;
}

.tokens-table td {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  vertical-align: middle;
}

.tokens-table tr:last-child td {
  border-bottom: none;
}

.tokens-table tbody tr:hover {
  background-color: #f8f9fa;
}

.username {
  font-weight: 600;
  color: #495057;
}

.token-name {
  color: #2c3e50;
  font-weight: 500;
}

.token-prefix {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  color: #6c757d;
  background-color: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.created-at,
.expiry-date {
  color: #495057;
  font-size: 0.85rem;
  white-space: nowrap;
}

.actions {
  text-align: center;
  white-space: nowrap;
  width: 100px;
}

.delete-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition:
    background-color 0.2s,
    transform 0.1s;
}

.delete-btn:hover:not(:disabled) {
  background-color: #c82333;
  transform: translateY(-1px);
}

.delete-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}

.delete-btn:active {
  transform: translateY(0);
}

.pagination-container {
  background-color: #f8f9fa;
  padding: 1.5rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.pagination-info p {
  color: #6c757d;
  font-size: 0.9rem;
  margin: 0;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pagination-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.pagination-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.page-info {
  color: #495057;
  font-weight: 500;
  margin: 0 1rem;
  font-size: 0.9rem;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-size-selector label {
  color: #495057;
  font-size: 0.9rem;
  font-weight: 500;
}

.page-size-select {
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: white;
  cursor: pointer;
}

.page-size-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

/* Delete Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 90%;
}

.modal-content h3 {
  margin-top: 0;
  color: #2c3e50;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.modal-content p {
  color: #495057;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.modal-content .warning {
  color: #dc3545;
  font-weight: 500;
  font-style: italic;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.cancel-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.cancel-btn:hover:not(:disabled) {
  background-color: #545b62;
}

.cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.confirm-delete-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.confirm-delete-btn:hover:not(:disabled) {
  background-color: #c82333;
}

.confirm-delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .tokens-table-container {
    overflow-x: auto;
  }

  .tokens-table {
    min-width: 800px;
  }

  .pagination-container {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .pagination-controls {
    justify-content: center;
  }

  .page-size-selector {
    justify-content: center;
  }

  .modal-content {
    padding: 1.5rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .cancel-btn,
  .confirm-delete-btn {
    width: 100%;
  }
}
</style>
