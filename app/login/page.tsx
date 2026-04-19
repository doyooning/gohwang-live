import { LoginForm } from "@/components/auth/login-form"
import { Shield } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top: App name */}
      <header className="pt-8 pb-4 px-4 text-center">
        <Link href="/">
          <h1 className="text-2xl font-bold text-foreground">GOHWANG LIVE</h1>
        </Link>
        <p className="text-sm text-muted-foreground mt-1">운영자 로그인</p>
      </header>

      {/* Center: Login card */}
      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Shield className="size-5 text-primary" />
              <h2 className="text-lg font-semibold text-card-foreground">
                운영자 로그인
              </h2>
            </div>
            <LoginForm />
          </div>

          <Link
            href="/"
            className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            메인화면으로 이동
          </Link>

          {/* Role helper text */}
          <div className="mt-6">
            <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
              <Shield className="size-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">운영자 전용</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  경기 생성, 라이브 기록, 라인업 관리 등 운영 기능을 사용할 수 있습니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      
    </div>
  )
}
