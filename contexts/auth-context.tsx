"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
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
  logout: () => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

function toLocalUser(input: { id: string; email?: string | null }): User | null {
  if (!input.email) return null
  return {
    id: input.id,
    email: input.email,
    name: input.email.split("@")[0],
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const needsSessionCheck = pathname.startsWith("/manager")
    if (!needsSessionCheck) {
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), 15000, "getSession")

        if (session?.user) {
          setUser(toLocalUser(session.user))
        } else {
          setUser(null)
        }
      } catch (error) {
        // Network timeout should not force logout immediately.
        console.error("Error checking session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null)
        return
      }

      if (session?.user) {
        setUser(toLocalUser(session.user))
      }
    })

    return () => subscription.unsubscribe()
  }, [pathname])

  const login = useCallback(
    async (email: string, password: string) => {
      const supabase = createClient()

      try {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          20000,
          "signInWithPassword"
        )

        if (error) {
          console.error("Supabase auth signInWithPassword error:", {
            message: error.message,
            status: error.status,
            name: error.name,
          })
          return {
            success: false,
            error: `로그인 실패: ${error.message}${error.status ? ` (status: ${error.status})` : ""}`,
          }
        }

        const nextUser = data?.user ? toLocalUser(data.user) : null
        setUser(nextUser)
        router.push("/manager")
        return { success: true }
      } catch (error) {
        console.error("Login error:", error)
        return { success: false, error: "로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요." }
      }
    },
    [router]
  )

  const logout = useCallback(async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      return { success: false, error: error.message }
    }
    setUser(null)
    router.push("/login")
    return { success: true }
  }, [router])

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
