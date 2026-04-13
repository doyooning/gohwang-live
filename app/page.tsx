"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <Play className="size-4 text-primary-foreground fill-current" />
            </div>
            <span className="font-bold text-lg text-foreground">KICK LIVE</span>
          </div>
          <Link href="/login">
            <Button size="sm" variant="outline">운영자 로그인</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-3 text-balance">
          아마추어 축구,
          <br />
          <span className="text-primary">라이브로 함께하다</span>
        </h1>
        
        <p className="text-muted-foreground text-center mb-8 max-w-md text-pretty">
          동네 축구부터 사회인 리그까지, 어디서든 실시간으로 경기를 시청하세요.
        </p>

        <Link href="/match">
          <Button size="lg" className="gap-2 px-8">
            <Play className="size-4" />
            경기 목록 보러가기
          </Button>
        </Link>
      </main>
    </div>
  )
}
