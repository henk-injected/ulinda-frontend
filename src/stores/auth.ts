import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiFetch, API_CONFIG } from '@/config/api'
import type { LoginRequest, LoginResponse, MeResponse, User } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const user = ref<User | null>(null)

  // Initialize from localStorage if available (just user data, session is in cookie)
  const savedUser = localStorage.getItem('auth_user')

  if (savedUser) {
    user.value = JSON.parse(savedUser)
    isAuthenticated.value = true
  }

  async function login(username: string, password: string): Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }> {
    try {
      const loginData: LoginRequest = { username, password }

      const response = await apiFetch(API_CONFIG.ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify(loginData)
      }, true) // Skip auto-redirect for login endpoint

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Invalid credentials' }
        }

        if (response.status === 500) {
          const errorData = await response.json()
          if (errorData.errorCode === 'USER_MUST_CHANGE_PASSWORD') {
            return {
              success: false,
              error: errorData.message || 'You must change your password',
              mustChangePassword: true
            }
          }
          return { success: false, error: errorData.message || 'Server error occurred' }
        }

        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: LoginResponse = await response.json()

      // Store user data (session cookie is automatically stored by browser)
      user.value = {
        id: data.username,
        username: data.username,
        adminUser: data.adminUser,
        canGenerateTokens: data.canGenerateTokens,
        maxTokenCount: data.maxTokenCount
      }
      isAuthenticated.value = true

      // Save user to localStorage
      localStorage.setItem('auth_user', JSON.stringify(user.value))

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      }
    }
  }

  async function logout() {
    // Call backend to invalidate session and clear cookie
    try {
      await apiFetch(API_CONFIG.ENDPOINTS.LOGOUT, {
        method: 'POST'
      }, true) // Skip auto-redirect for logout endpoint
    } catch (error) {
      // Log error but continue with local cleanup
      console.error('Logout API call failed:', error)
    }

    // Clear local state
    isAuthenticated.value = false
    user.value = null
    localStorage.removeItem('auth_user')
  }

  async function validateSession(): Promise<boolean> {
    try {
      const response = await apiFetch(API_CONFIG.ENDPOINTS.ME, {
        method: 'GET'
      }, true) // Skip auto-redirect - we handle it manually here

      if (!response.ok) {
        // Session invalid or expired
        logout()
        return false
      }

      const data: MeResponse = await response.json()

      // Update user data from backend
      user.value = {
        id: data.username,
        username: data.username,
        adminUser: data.adminUser,
        canGenerateTokens: data.canGenerateTokens,
        maxTokenCount: data.maxTokenCount
      }
      isAuthenticated.value = true

      // Save user to localStorage
      localStorage.setItem('auth_user', JSON.stringify(user.value))

      return true
    } catch (error) {
      console.error('Session validation error:', error)
      logout()
      return false
    }
  }

  function isAdminUser(): boolean {
    return user.value?.adminUser || false
  }

  function canGenerateTokens(): boolean {
    return user.value?.canGenerateTokens || false
  }

  return {
    isAuthenticated,
    user,
    login,
    logout,
    validateSession,
    isAdminUser,
    canGenerateTokens
  }
})