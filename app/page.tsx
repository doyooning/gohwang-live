"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Play, Users, Calendar, Radio } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <Play className="size-4 text-primary-foreground fill-current" />
            </div>
            <span className="font-bold text-lg text-foreground">KICK LIVE</span>
          </div>
          <Link href="/login">
            <Button size="sm">로그인</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center pt-12 pb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Radio className="size-3 text-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">실시간 중계 서비스</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance mb-4">
              아마추어 축구,
              <br />
              <span className="text-primary">라이브로 함께하다</span>
            </h1>
            
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-8 text-pretty">
              동네 축구부터 사회인 리그까지. 
              어디서든 실시간으로 경기를 시청하고, 
              함께 응원하세요.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/match">
                <Button size="lg" className="gap-2 px-8">
                  <Play className="size-4" />
                  경기 보러가기
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="px-8">
                  운영자로 시작하기
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative mt-8 rounded-2xl overflow-hidden border border-border bg-card">
            <div className="aspect-video relative">
              <Image
                src="/images/hero-match.jpg"
                alt="라이브 경기 화면"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              
              {/* Live Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground">
                <span className="size-2 rounded-full bg-current animate-pulse" />
                <span className="text-sm font-semibold">LIVE</span>
              </div>

              {/* Score Overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center justify-between bg-card/90 backdrop-blur rounded-xl p-4 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      FC
                    </div>
                    <span className="font-semibold text-foreground">FC 서울</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">2 - 1</div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">수원 FC</span>
                    <div className="size-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                      SW
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">
            왜 KICK LIVE인가요?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-background border border-border">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Radio className="size-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">실시간 중계</h3>
              <p className="text-muted-foreground">
                유튜브 라이브와 연동하여 고화질 실시간 경기 중계를 제공합니다. 어디서든 경기를 놓치지 마세요.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-background border border-border">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="size-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">실시간 기록</h3>
              <p className="text-muted-foreground">
                골, 어시스트, 경고, 교체 등 경기 중 발생하는 모든 이벤트를 실시간으로 기록하고 확인하세요.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-background border border-border">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="size-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">라인업 관리</h3>
              <p className="text-muted-foreground">
                포메이션과 선수 명단을 손쉽게 관리하고, 시청자에게 실시간으로 공유할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-muted-foreground mb-8">
            시청자로 경기를 즐기거나, 운영자로 직접 경기를 중계해보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/match">
              <Button size="lg" className="gap-2 px-8 w-full sm:w-auto">
                <Play className="size-4" />
                경기 목록 보기
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-8 w-full sm:w-auto">
                로그인
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-primary flex items-center justify-center">
              <Play className="size-3 text-primary-foreground fill-current" />
            </div>
            <span className="font-semibold text-foreground">KICK LIVE</span>
          </div>
          <p className="text-sm text-muted-foreground">
            2024 KICK LIVE. 아마추어 축구 라이브 스트리밍 서비스.
          </p>
        </div>
      </footer>
    </div>
  )
}
