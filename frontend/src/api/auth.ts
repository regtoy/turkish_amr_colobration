import type { AuthResponse, LoginPayload, RegisterPayload, User } from '@/types/auth'

import { apiClient } from './client'

export const authApi = {
  async login(credentials: LoginPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<{
      access_token: string
      token_type: string
      user_id: number
      role: string
    }>('/auth/token', credentials)
    return { token: { accessToken: data.access_token } }
  },
  async register(payload: RegisterPayload): Promise<User> {
    const { data } = await apiClient.post<User>('/auth/register', payload)
    return data
  },
  async profile(): Promise<User> {
    const { data } = await apiClient.get<User>('/auth/me')
    return data
  },
}
