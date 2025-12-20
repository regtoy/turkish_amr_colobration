import axios, { type AxiosRequestHeaders } from 'axios'

import { tokenStorage } from '@/auth/tokenStorage'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getToken()

  if (token) {
    const headers: AxiosRequestHeaders = config.headers ?? {}
    headers.Authorization = `Bearer ${token}`
    config.headers = headers
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStorage.clearToken()
    }

    return Promise.reject(error)
  },
)
