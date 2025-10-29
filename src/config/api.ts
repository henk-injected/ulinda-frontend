import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  ENDPOINTS: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    MODELS: '/v1/models',
    MODEL_BY_ID: (modelId: string) => `/api/v1/models/${modelId}`,
    TOKENS_GENERATE: '/tokens/generate',
    TOKENS_MY: '/tokens/my-tokens',
    TOKENS_DELETE: (tokenId: string) => `/tokens/${tokenId}`,
    // Add other endpoints here as needed
  },
}

// Module-level variable to store router instance
let routerInstance: Router | null = null

/**
 * Initialize the API module with the router instance
 * This must be called in main.ts after creating the router
 */
export const initializeApiRouter = (router: Router): void => {
  routerInstance = router
}

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`
}

export const getAuthHeaders = (): HeadersInit => {
  return {
    'Content-Type': 'application/json',
  }
}

/**
 * Global fetch wrapper that includes credentials (cookies) with every request.
 * Automatically handles 401/403 errors by logging out and redirecting to login.
 *
 * @param endpoint - API endpoint path (e.g., '/admin/tokens')
 * @param options - Standard fetch options
 * @param skipAuthRedirect - Set to true to bypass automatic 401/403 handling (for login/logout endpoints)
 * @returns Response object
 * @throws Error if 401/403 occurs (after redirect)
 */
export const apiFetch = async (
  endpoint: string,
  options?: RequestInit,
  skipAuthRedirect = false
): Promise<Response> => {
  const response = await fetch(getApiUrl(endpoint), {
    ...options,
    credentials: 'include', // Always send cookies
    headers: {
      ...getAuthHeaders(),
      ...options?.headers,
    },
  })

  // Global authentication error handler
  // Handle 401 (Unauthorized) and 403 (Forbidden - invalid session)
  if (!skipAuthRedirect && (response.status === 401 || response.status === 403)) {
    console.warn(`Authentication error ${response.status} detected. Logging out and redirecting to login.`)

    const authStore = useAuthStore()

    // Clear authentication state - MUST await to ensure isAuthenticated is false before redirect
    await authStore.logout()

    // Redirect to login page (after logout completes)
    if (routerInstance) {
      routerInstance.push('/')
    } else {
      console.error('Router not initialized in API module. Using window.location fallback.')
      window.location.href = '/'
    }

    // Throw error so calling code knows authentication failed
    throw new Error(`Authentication failed: ${response.status}`)
  }

  return response
}
