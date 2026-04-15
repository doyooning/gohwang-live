"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

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
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check for existing session on mount
  useEffect(() => {
    const supabase = createClient()

    const checkSession = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        // Check if user is an admin
        const { data: admin } = await supabase
          .from("admins")
          .select("*")
          .eq("email", authUser.email)
          .single()

        if (admin) {
          setUser({
            id: admin.id,
            email: admin.email,
            name: admin.name || "운영자",
          })
        }
      }
      setIsLoading(false)
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null)
      } else if (session?.user) {
        const { data: admin } = await supabase
          .from("admins")
          .select("*")
          .eq("email", session.user.email)
          .single()

        if (admin) {
          setUser({
            id: admin.id,
            email: admin.email,
            name: admin.name || "운영자",
          })
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)

    const supabase = createClient()

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setIsLoading(false)
      return { success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." }
    }

    // Check if the user is registered as an admin
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .single()

    if (adminError || !admin) {
      // User exists in auth but not in admins table
      await supabase.auth.signOut()
      setIsLoading(false)
      return { success: false, error: "운영자 권한이 없는 계정입니다." }
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

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
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
