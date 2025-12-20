export type Role = 'annotator' | 'reviewer' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  roles: Role[]
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
}

export interface AuthResponse {
  user: User
  token: AuthTokens
}
