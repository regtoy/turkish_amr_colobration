import type { User } from '@/types/auth'
import { safeStorage } from '@/utils/safeStorage'

const TOKEN_KEY = 'turkish-amr.jwt'
const USER_KEY = 'turkish-amr.user'
export const AUTH_CLEARED_EVENT = 'auth:cleared'

export const tokenStorage = {
  getToken(): string | null {
    return safeStorage.getItem(TOKEN_KEY)
  },
  saveToken(token: string) {
    safeStorage.setItem(TOKEN_KEY, token)
  },
  clearToken() {
    safeStorage.removeItem(TOKEN_KEY)
  },
}

export const userStorage = {
  getUser(): User | null {
    const raw = safeStorage.getItem(USER_KEY)
    if (!raw) return null

    try {
      return JSON.parse(raw) as User
    } catch (error) {
      console.warn('Unable to parse cached user', error)
      return null
    }
  },
  saveUser(user: User) {
    safeStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clearUser() {
    safeStorage.removeItem(USER_KEY)
  },
  clearAll() {
    safeStorage.removeItem(USER_KEY)
    safeStorage.removeItem(TOKEN_KEY)
  },
}

const dispatchAuthCleared = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(AUTH_CLEARED_EVENT))
}

export const clearAuthSession = () => {
  tokenStorage.clearToken()
  userStorage.clearUser()
  dispatchAuthCleared()
}
