import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError, getAuthToken, setAuthToken } from '../api/client'
import type { PublicUser, UserRole } from '../types'

interface AuthContextValue {
  user: PublicUser | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, requestedRole?: UserRole) => Promise<PublicUser>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setLoading(false)
      return
    }
    api
      .me()
      .then(setUser)
      .catch(() => setAuthToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const { access_token, user: loggedInUser } = await api.login(email, password)
      setAuthToken(access_token)
      // The token may belong to a not-yet-approved user; api.me() will
      // 403 in that case, which the caller (LoginPage) surfaces as "pending".
      try {
        const me = await api.me()
        setUser(me)
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) {
          // Approved-pending: keep the token so a re-check works later,
          // but surface the pending user object so the UI can show the
          // "awaiting approval" screen instead of erroring out.
          setUser({ ...loggedInUser, status: 'pending' })
        } else {
          throw e
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log in')
      throw e
    }
  }, [])

  const register = useCallback(async (name: string, email: string, password: string, requestedRole?: UserRole) => {
    setError(null)
    try {
      return await api.register(name, email, password, requestedRole)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create account')
      throw e
    }
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    setUser(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
