import type { AuthResponse, LoginPayload, User } from '@/types/auth'

import { apiClient } from './client'

export const authApi = {
  async login(credentials: LoginPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials)
    return data
  },
  async profile(): Promise<User> {
    const { data } = await apiClient.get<User>('/auth/me')
    return data
  },
}
