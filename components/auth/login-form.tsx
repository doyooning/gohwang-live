"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/contexts/auth-context"

export function LoginForm() {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setEmailError(null)

    if (!email) {
      setEmailError("이메일을 입력해주세요.")
      return
    }

    if (!validateEmail(email)) {
      setEmailError("올바른 이메일 형식을 입력해주세요.")
      return
    }

    if (!password) {
      setError("비밀번호를 입력해주세요.")
      return
    }

    const result = await login(email, password)
    if (!result.success && result.error) {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <FieldGroup>
        <Field data-invalid={!!emailError}>
          <FieldLabel htmlFor="email">이메일</FieldLabel>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailError(null)
              }}
              className="pl-10"
              aria-invalid={!!emailError}
              disabled={isLoading}
            />
          </div>
          {emailError && <FieldError>{emailError}</FieldError>}
        </Field>

        <Field data-invalid={!!error && !emailError}>
          <FieldLabel htmlFor="password">비밀번호</FieldLabel>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
              className="pl-10 pr-10"
              aria-invalid={!!error && !emailError}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {error && !emailError && <FieldError>{error}</FieldError>}
        </Field>

        <Button type="submit" className="w-full h-11" disabled={isLoading}>
          {isLoading ? (
            <>
              <Spinner className="mr-2" />
              로그인 중...
            </>
          ) : (
            "로그인"
          )}
        </Button>
      </FieldGroup>

      <div className="flex items-center justify-between mt-4 text-sm">
        <Link
          href="/signup"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          회원가입
        </Link>
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          비밀번호 찾기
        </Link>
      </div>
    </form>
  )
}
