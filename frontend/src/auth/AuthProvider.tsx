import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { authApi } from '@/api/auth'
import {
  AUTH_CLEARED_EVENT,
  clearAuthSession,
  tokenStorage,
  userStorage,
} from '@/auth/tokenStorage'
import type { AuthResponse, LoginPayload, Role, User } from '@/types/auth'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  hasRole: (role: Role) => boolean
  login: (credentials: LoginPayload) => Promise<AuthResponse>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(userStorage.getUser())
  const [token, setToken] = useState<string | null>(tokenStorage.getToken())
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const syncAuthState = useCallback((payload: AuthResponse) => {
    const nextToken = payload.token.accessToken
    const nextUser = payload.user

    tokenStorage.saveToken(nextToken)
    userStorage.saveUser(nextUser)

    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const login = useCallback(
    async (credentials: LoginPayload) => {
      setIsLoading(true)
      try {
        const data = await authApi.login(credentials)
        syncAuthState(data)
        return data
      } finally {
        setIsLoading(false)
      }
    },
    [syncAuthState],
  )

  const logout = useCallback(() => {
    clearAuthSession()
    setUser(null)
    setToken(null)
  }, [])

  useEffect(() => {
    const bootstrapProfile = async () => {
      if (!token || user) return

      setIsLoading(true)
      try {
        const profile = await authApi.profile()
        userStorage.saveUser(profile)
        setUser(profile)
      } catch (error) {
        console.error('Failed to bootstrap profile', error)
        logout()
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrapProfile()
  }, [token, user, logout])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleAuthCleared = () => {
      setUser(null)
      setToken(null)
    }

    window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared)
    return () => window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared)
  }, [])

  const hasRole = useCallback(
    (role: Role) => {
      if (!user) return false
      return user.roles.includes(role)
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      login,
      logout,
      hasRole,
      isLoading,
    }),
    [user, token, login, logout, hasRole, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuthContext must be used within AuthProvider')
  return context
}
