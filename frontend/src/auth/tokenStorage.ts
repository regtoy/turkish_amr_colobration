import type { User } from '@/types/auth'
import { safeStorage } from '@/utils/safeStorage'

const TOKEN_KEY = 'turkish-amr.jwt'
const USER_KEY = 'turkish-amr.user'

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
      const parsed = JSON.parse(raw) as Partial<User> & { roles?: string[] }
      if (!parsed.role && parsed.roles?.length) {
        const priority: User['role'][] = ['admin', 'reviewer', 'annotator', 'curator', 'guest', 'pending']
        const prioritized = priority.find((candidate) => parsed.roles?.includes(candidate))
        if (parsed.roles.length > 1) {
          console.warn('Multiple cached roles found; selecting role by priority', parsed.roles)
        }
        parsed.role = prioritized ?? (parsed.roles[0] as User['role'])
      }
      if (parsed.is_active === undefined) {
        parsed.is_active = true
      }
      return parsed as User
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
