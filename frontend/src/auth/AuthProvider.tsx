import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { authApi } from '@/api/auth'
import { tokenStorage, userStorage } from '@/auth/tokenStorage'
import type { AuthResponse, LoginPayload, Role, User } from '@/types/auth'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  hasRole: (role: Role) => boolean
  login: (credentials: LoginPayload) => Promise<AuthResponse>
  logout: () => void
  refreshProfile: () => Promise<User | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(userStorage.getUser())
  const [token, setToken] = useState<string | null>(tokenStorage.getToken())
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const syncAuthState = useCallback((payload: AuthResponse) => {
    const nextToken = payload.token.accessToken
    tokenStorage.saveToken(nextToken)
    setToken(nextToken)
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clearToken()
    userStorage.clearUser()
    setUser(null)
    setToken(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!token) return null
    setIsLoading(true)
    try {
      const profile = await authApi.profile()
      userStorage.saveUser(profile)
      setUser(profile)
      return profile
    } catch (error) {
      console.error('Failed to refresh profile', error)
      logout()
      return null
    } finally {
      setIsLoading(false)
    }
  }, [logout, token])

  const login = useCallback(
    async (credentials: LoginPayload) => {
      setIsLoading(true)
      try {
        const data = await authApi.login(credentials)
        syncAuthState(data)
        await refreshProfile()
        return data
      } finally {
        setIsLoading(false)
      }
    },
    [syncAuthState, refreshProfile],
  )

  useEffect(() => {
    const bootstrapProfile = async () => {
      if (!token || user) return

      setIsLoading(true)
      try {
        await refreshProfile()
      } catch (error) {
        console.error('Failed to bootstrap profile', error)
        logout()
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrapProfile()
  }, [token, user, logout, refreshProfile])

  const hasRole = useCallback(
    (role: Role) => {
      if (!user) return false
      return user.role === role
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
      refreshProfile,
    }),
    [user, token, login, logout, hasRole, isLoading, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuthContext must be used within AuthProvider')
  return context
}
