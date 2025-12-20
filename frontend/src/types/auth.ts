export type Role =
  | 'guest'
  | 'pending'
  | 'annotator'
  | 'reviewer'
  | 'curator'
  | 'admin'
  | 'assignment_engine'

export interface User {
  id: number
  username: string
  email?: string | null
  role: Role
  is_active: boolean
}

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  email?: string
  password: string
}

export interface AuthTokens {
  accessToken: string
}

export interface AuthResponse {
  token: AuthTokens
}
