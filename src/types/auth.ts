export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  mustChangePassword: boolean
  adminUser: boolean
  username: string
  canGenerateTokens: boolean
  maxTokenCount: number
}

export interface MeResponse {
  username: string
  adminUser: boolean
  canGenerateTokens: boolean
  maxTokenCount: number
}

export interface User {
  id: string
  username: string
  adminUser: boolean
  canGenerateTokens: boolean
  maxTokenCount: number
}

export interface ForcedChangePasswordRequest {
  username: string
  oldPassword: string
  newPassword: string
}