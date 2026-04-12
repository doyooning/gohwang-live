import { LoginForm } from "@/components/auth/login-form"
import { Shield, Users } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top: App name */}
      <header className="pt-8 pb-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">아마추어 축구 라이브</h1>
        <p className="text-sm text-muted-foreground mt-1">실시간 경기 중계 플랫폼</p>
      </header>

      {/* Center: Login card */}
      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-card-foreground text-center mb-6">
              로그인
            </h2>
            <LoginForm />
          </div>

          {/* Role helper text */}
          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
              <Shield className="size-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">운영자</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  경기 관리 및 기록 기능을 사용할 수 있습니다
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
              <Users className="size-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">일반 사용자</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  경기 시청 및 정보 확인이 가능합니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom: Helper text */}
      <footer className="py-4 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          테스트 계정: operator@example.com / operator123 (운영자)
        </p>
        <p className="text-xs text-muted-foreground">
          viewer@example.com / viewer123 (시청자)
        </p>
      </footer>
    </div>
  )
}
