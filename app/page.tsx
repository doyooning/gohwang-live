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
            <span className="font-bold text-lg text-foreground">GOHWANG LIVE</span>
          </div>
          <Link href="/login">
            <Button size="sm" variant="outline">운영자 로그인</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-3 text-balance">
          고황 축구 라이브
        </h1>
        
        <p className="text-muted-foreground text-center mb-8 max-w-md text-pretty">
          경희대학교 고황 축구 대회 경기 라이브를 시청하세요
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
