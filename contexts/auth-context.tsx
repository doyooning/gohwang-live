"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"

export type UserRole = "operator" | "viewer"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock user data for demonstration
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  "operator@example.com": {
    password: "operator123",
    user: {
      id: "1",
      email: "operator@example.com",
      name: "김운영",
      role: "operator",
    },
  },
  "viewer@example.com": {
    password: "viewer123",
    user: {
      id: "2",
      email: "viewer@example.com",
      name: "이시청",
      role: "viewer",
    },
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const mockUser = MOCK_USERS[email]

    if (!mockUser || mockUser.password !== password) {
      setIsLoading(false)
      return { success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." }
    }

    setUser(mockUser.user)
    setIsLoading(false)

    // Redirect based on role
    if (mockUser.user.role === "operator") {
      router.push("/admin")
    } else {
      router.push("/match")
    }

    return { success: true }
  }, [router])

  const logout = useCallback(() => {
    setUser(null)
    router.push("/login")
  }, [router])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
