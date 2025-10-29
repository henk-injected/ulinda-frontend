<template>
  <div class="forced-change-password-container">
    <div class="forced-change-password-form">
      <h1>You Must Change Your Password</h1>
      <p class="warning-message">
        Your password must be changed before you can continue using the system.
      </p>
      <form @submit.prevent="handleForcedChangePassword">
        <div class="form-group">
          <label for="oldPassword">Current Password:</label>
          <input
            id="oldPassword"
            v-model="oldPassword"
            type="password"
            required
            autocomplete="current-password"
          />
        </div>
        <div class="form-group">
          <label for="newPassword">New Password:</label>
          <div class="password-input-wrapper">
            <input
              id="newPassword"
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              required
              autocomplete="new-password"
            />
            <button
              v-if="passwordSettings?.allowShowPasswordToggle"
              type="button"
              class="toggle-password"
              @click="showNewPassword = !showNewPassword"
            >
              {{ showNewPassword ? 'Hide' : 'Show' }}
            </button>
          </div>

          <!-- Password Strength Meter -->
          <div v-if="passwordSettings?.showPasswordStrengthMeter && newPassword" class="password-strength">
            <div class="strength-bar-container">
              <div
                class="strength-bar"
                :style="{ width: passwordStrength + '%', backgroundColor: passwordStrengthColor }"
              ></div>
            </div>
            <span class="strength-label" :style="{ color: passwordStrengthColor }">
              {{ passwordStrengthLabel }}
            </span>
          </div>

          <!-- Password Requirements -->
          <div v-if="passwordRequirements.length > 0" class="password-requirements">
            <p class="requirements-title">Password must contain:</p>
            <ul>
              <li
                v-for="(req, index) in passwordRequirements"
                :key="index"
                :class="{ met: req.met }"
              >
                {{ req.text }}
              </li>
            </ul>
          </div>
        </div>
        <div v-if="error" class="error">{{ error }}</div>
        <div v-if="success" class="success">{{ success }}</div>
        <div class="button-group">
          <button type="submit" class="change-password-btn" :disabled="loading">
            {{ loading ? 'Changing Password...' : 'Change Password & Login' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '@/config/api'

interface PasswordSettings {
  minimumPasswordLength: number
  passwordRequiresUppercaseLetters: boolean
  passwordRequiresUppercaseLettersMinimumCount: number
  passwordRequiresLowercaseLetters: boolean
  passwordRequiresLowercaseLettersMinimumCount: number
  passwordRequiresNumbers: boolean
  passwordRequiresNumbersMinimumCount: number
  passwordRequiresSpecialCharacters: boolean
  passwordRequiresSpecialCharactersMinimumCount: number
  passwordAllowedSpecialCharacters: string
  showPasswordStrengthMeter: boolean
  showPasswordRequirmentsOnForm: boolean
  allowShowPasswordToggle: boolean
}

const router = useRouter()

const oldPassword = ref('')
const newPassword = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)
const username = ref('')
const showNewPassword = ref(false)
const passwordSettings = ref<PasswordSettings | null>(null)

// Get username from sessionStorage when component mounts
onMounted(async () => {
  const tempUsername = sessionStorage.getItem('temp_username')
  if (!tempUsername) {
    error.value = 'Session expired. Please login again.'
    setTimeout(() => {
      router.push('/')
    }, 2000)
    return
  }
  username.value = tempUsername

  // Pre-fill old password if available
  const tempPassword = sessionStorage.getItem('temp_password')
  if (tempPassword) {
    oldPassword.value = tempPassword
  }

  // Fetch password settings
  try {
    const response = await apiFetch('/auth/password-settings', {
      method: 'GET',
    })
    if (response.ok) {
      passwordSettings.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to fetch password settings:', err)
  }
})

// Password validation
const validatePassword = (password: string): string[] => {
  if (!passwordSettings.value) return []

  const errors: string[] = []
  const settings = passwordSettings.value

  if (password.length < settings.minimumPasswordLength) {
    errors.push(`Password must be at least ${settings.minimumPasswordLength} characters`)
  }

  if (settings.passwordRequiresUppercaseLetters) {
    const uppercaseCount = (password.match(/[A-Z]/g) || []).length
    if (uppercaseCount < settings.passwordRequiresUppercaseLettersMinimumCount) {
      errors.push(`Password must contain at least ${settings.passwordRequiresUppercaseLettersMinimumCount} uppercase letter(s)`)
    }
  }

  if (settings.passwordRequiresLowercaseLetters) {
    const lowercaseCount = (password.match(/[a-z]/g) || []).length
    if (lowercaseCount < settings.passwordRequiresLowercaseLettersMinimumCount) {
      errors.push(`Password must contain at least ${settings.passwordRequiresLowercaseLettersMinimumCount} lowercase letter(s)`)
    }
  }

  if (settings.passwordRequiresNumbers) {
    const numberCount = (password.match(/[0-9]/g) || []).length
    if (numberCount < settings.passwordRequiresNumbersMinimumCount) {
      errors.push(`Password must contain at least ${settings.passwordRequiresNumbersMinimumCount} number(s)`)
    }
  }

  if (settings.passwordRequiresSpecialCharacters) {
    const specialChars = settings.passwordAllowedSpecialCharacters
    const regex = new RegExp(`[${specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g')
    const specialCount = (password.match(regex) || []).length
    if (specialCount < settings.passwordRequiresSpecialCharactersMinimumCount) {
      errors.push(`Password must contain at least ${settings.passwordRequiresSpecialCharactersMinimumCount} special character(s) from: ${specialChars}`)
    }
  }

  return errors
}

// Password strength calculation
const passwordStrength = computed(() => {
  if (!newPassword.value || !passwordSettings.value) return 0

  let strength = 0
  const password = newPassword.value
  const settings = passwordSettings.value

  // Length check
  if (password.length >= settings.minimumPasswordLength) strength += 20
  if (password.length >= settings.minimumPasswordLength + 4) strength += 10

  // Uppercase check
  const uppercaseCount = (password.match(/[A-Z]/g) || []).length
  if (uppercaseCount >= settings.passwordRequiresUppercaseLettersMinimumCount) strength += 20

  // Lowercase check
  const lowercaseCount = (password.match(/[a-z]/g) || []).length
  if (lowercaseCount >= settings.passwordRequiresLowercaseLettersMinimumCount) strength += 20

  // Number check
  const numberCount = (password.match(/[0-9]/g) || []).length
  if (numberCount >= settings.passwordRequiresNumbersMinimumCount) strength += 15

  // Special character check
  const specialChars = settings.passwordAllowedSpecialCharacters
  const regex = new RegExp(`[${specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g')
  const specialCount = (password.match(regex) || []).length
  if (specialCount >= settings.passwordRequiresSpecialCharactersMinimumCount) strength += 15

  return Math.min(strength, 100)
})

const passwordStrengthLabel = computed(() => {
  const strength = passwordStrength.value
  if (strength === 0) return ''
  if (strength < 30) return 'Weak'
  if (strength < 60) return 'Fair'
  if (strength < 80) return 'Good'
  return 'Strong'
})

const passwordStrengthColor = computed(() => {
  const strength = passwordStrength.value
  if (strength < 30) return '#dc3545'
  if (strength < 60) return '#ffc107'
  if (strength < 80) return '#17a2b8'
  return '#28a745'
})

const passwordRequirements = computed(() => {
  if (!passwordSettings.value || !passwordSettings.value.showPasswordRequirmentsOnForm) return []

  const settings = passwordSettings.value
  const requirements: { text: string; met: boolean }[] = []

  requirements.push({
    text: `At least ${settings.minimumPasswordLength} characters`,
    met: newPassword.value.length >= settings.minimumPasswordLength
  })

  if (settings.passwordRequiresUppercaseLetters) {
    const count = (newPassword.value.match(/[A-Z]/g) || []).length
    requirements.push({
      text: `At least ${settings.passwordRequiresUppercaseLettersMinimumCount} uppercase letter(s)`,
      met: count >= settings.passwordRequiresUppercaseLettersMinimumCount
    })
  }

  if (settings.passwordRequiresLowercaseLetters) {
    const count = (newPassword.value.match(/[a-z]/g) || []).length
    requirements.push({
      text: `At least ${settings.passwordRequiresLowercaseLettersMinimumCount} lowercase letter(s)`,
      met: count >= settings.passwordRequiresLowercaseLettersMinimumCount
    })
  }

  if (settings.passwordRequiresNumbers) {
    const count = (newPassword.value.match(/[0-9]/g) || []).length
    requirements.push({
      text: `At least ${settings.passwordRequiresNumbersMinimumCount} number(s)`,
      met: count >= settings.passwordRequiresNumbersMinimumCount
    })
  }

  if (settings.passwordRequiresSpecialCharacters) {
    const specialChars = settings.passwordAllowedSpecialCharacters
    const regex = new RegExp(`[${specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g')
    const count = (newPassword.value.match(regex) || []).length
    requirements.push({
      text: `At least ${settings.passwordRequiresSpecialCharactersMinimumCount} special character(s)`,
      met: count >= settings.passwordRequiresSpecialCharactersMinimumCount
    })
  }

  return requirements
})

const handleForcedChangePassword = async () => {
  error.value = ''
  success.value = ''
  loading.value = true

  try {
    if (!username.value) {
      error.value = 'Session expired. Please login again.'
      router.push('/')
      return
    }

    // Validate password before submitting
    const validationErrors = validatePassword(newPassword.value)
    if (validationErrors.length > 0) {
      error.value = validationErrors.join('. ')
      loading.value = false
      return
    }

    const response = await apiFetch('/auth/forced-change-password', {
      method: 'POST',
      body: JSON.stringify({
        username: username.value,
        oldPassword: oldPassword.value,
        newPassword: newPassword.value
      })
    })

    if (!response.ok) {
      if (response.status === 500) {
        const errorData = await response.json()
        error.value = errorData.message || 'Server error occurred'
        return
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Backend returns void, so no need to parse response
    success.value = 'Password changed successfully! Please login with your new password.'

    // Clear temporary credentials
    sessionStorage.removeItem('temp_username')
    sessionStorage.removeItem('temp_password')

    // Redirect to login page after success
    setTimeout(() => {
      router.push('/')
    }, 2000)

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to change password'
    console.error('Forced change password error:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.forced-change-password-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
  overflow: hidden;
}

.forced-change-password-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 400px;
  min-width: 300px;
}

h1 {
  text-align: center;
  margin-bottom: 1rem;
  color: #dc3545;
  font-size: 1.8rem;
}

.warning-message {
  text-align: center;
  color: #dc3545;
  margin-bottom: 2rem;
  font-weight: 500;
  background-color: #fff5f5;
  padding: 1rem;
  border-radius: 4px;
  border-left: 4px solid #dc3545;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.toggle-password {
  position: absolute;
  right: 10px;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  color: #007bff;
}

.toggle-password:hover {
  background: #f0f8ff;
}

.password-strength {
  margin-top: 0.5rem;
}

.strength-bar-container {
  width: 100%;
  height: 6px;
  background-color: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.strength-bar {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.strength-label {
  font-size: 0.75rem;
  font-weight: 500;
}

.password-requirements {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #fff5f5;
  border-radius: 4px;
  border-left: 3px solid #dc3545;
}

.requirements-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
}

.password-requirements ul {
  margin: 0;
  padding-left: 1.25rem;
  list-style: none;
}

.password-requirements li {
  font-size: 0.8rem;
  color: #dc3545;
  margin-bottom: 0.25rem;
  position: relative;
}

.password-requirements li::before {
  content: '✗';
  position: absolute;
  left: -1.25rem;
  font-weight: bold;
}

.password-requirements li.met {
  color: #28a745;
}

.password-requirements li.met::before {
  content: '✓';
}

.error {
  color: #dc3545;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  text-align: center;
}

.success {
  color: #28a745;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  text-align: center;
}

.button-group {
  margin-top: 1.5rem;
}

.change-password-btn {
  width: 100%;
  padding: 0.75rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  font-weight: 500;
}

.change-password-btn:hover:not(:disabled) {
  background-color: #c82333;
}

.change-password-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.change-password-btn:active:not(:disabled) {
  transform: translateY(1px);
}

@media (max-width: 768px) {
  .forced-change-password-form {
    width: 95%;
    padding: 1.5rem;
  }

  h1 {
    font-size: 1.5rem;
  }
}
</style>