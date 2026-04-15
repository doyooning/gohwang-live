"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)

    const supabase = createClient()

    // Check if the email/password match an admin in the database
    const { data: admin, error } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .single()

    if (error || !admin) {
      setIsLoading(false)
      return { success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." }
    }

    // For demo purposes, we're using a simple password check
    // In production, you should use Supabase Auth or proper password hashing
    if (password !== "operator123") {
      setIsLoading(false)
      return { success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." }
    }

    setUser({
      id: admin.id,
      email: admin.email,
      name: admin.name || "운영자",
    })
    setIsLoading(false)

    // Redirect to admin dashboard
    router.push("/admin")

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
