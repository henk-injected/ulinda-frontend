export interface GenerateTokenRequest {
  tokenName: string
  expiryDays: number
}

export interface GenerateTokenResponse {
  token: string
  tokenName: string
  expiryDateTime: string
}

export interface UserTokenDto {
  id: string
  tokenName: string
  createdAt: string
  tokenExpiryDateTime: string
  tokenPrefix: string
}

export interface GetUserTokensResponse {
  tokens: UserTokenDto[]
}
