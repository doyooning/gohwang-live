"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LogOut, Play, Pause, Settings, Users, Calendar, Radio } from "lucide-react"

// Mock operator's matches data
const OPERATOR_MATCHES = [
  {
    id: "match-1",
    homeTeam: "FC 서울 유스",
    awayTeam: "수원 삼성 유스",
    homeScore: 2,
    awayScore: 1,
    status: "live" as const,
    currentTime: "67'",
    venue: "목동 종합운동장",
    date: "2026-04-12",
    viewers: 142,
  },
  {
    id: "match-2",
    homeTeam: "강남 FC",
    awayTeam: "송파 유나이티드",
    homeScore: 0,
    awayScore: 0,
    status: "scheduled" as const,
    startTime: "16:00",
    venue: "탄천 종합운동장",
    date: "2026-04-12",
    viewers: 0,
  },
  {
    id: "match-3",
    homeTeam: "마포 FC",
    awayTeam: "서대문 유스",
    homeScore: 3,
    awayScore: 2,
    status: "ended" as const,
    venue: "마포 구장",
    date: "2026-04-11",
    viewers: 0,
  },
]

export default function AdminPage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
    } else if (user.role !== "operator") {
      router.push("/")
    }
  }, [user, router])

  if (!user || user.role !== "operator") {
    return null
  }

  const getStatusBadge = (status: "live" | "scheduled" | "ended") => {
    switch (status) {
      case "live":
        return (
          <Badge className="bg-destructive text-destructive-foreground">
            <span className="relative flex size-2 mr-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive-foreground opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-destructive-foreground" />
            </span>
            LIVE
          </Badge>
        )
      case "scheduled":
        return <Badge variant="outline">예정</Badge>
      case "ended":
        return <Badge variant="secondary">종료</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">운영자 대시보드</h1>
            <p className="text-xs text-muted-foreground">{user.name}님 환영합니다</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Radio className="size-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">1</p>
          <p className="text-xs text-muted-foreground">라이브 중</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Calendar className="size-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">1</p>
          <p className="text-xs text-muted-foreground">예정 경기</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Users className="size-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">142</p>
          <p className="text-xs text-muted-foreground">총 시청자</p>
        </div>
      </div>

      {/* Match List */}
      <main className="px-4 pb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">내 경기 목록</h2>
        <div className="space-y-3">
          {OPERATOR_MATCHES.map((match) => (
            <div
              key={match.id}
              className={`bg-card border rounded-lg p-4 ${
                match.status === "live"
                  ? "border-primary/50 shadow-[0_0_10px_rgba(var(--primary),0.15)]"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                {getStatusBadge(match.status)}
                {match.status === "live" && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3" />
                    {match.viewers}명 시청 중
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 text-center">
                  <p className="text-sm font-medium text-foreground truncate">{match.homeTeam}</p>
                </div>
                <div className="px-4">
                  {match.status === "scheduled" ? (
                    <p className="text-lg font-bold text-muted-foreground">{match.startTime}</p>
                  ) : (
                    <p className="text-lg font-bold text-foreground">
                      {match.homeScore} : {match.awayScore}
                    </p>
                  )}
                  {match.status === "live" && (
                    <p className="text-xs text-primary text-center">{match.currentTime}</p>
                  )}
                </div>
                <div className="flex-1 text-center">
                  <p className="text-sm font-medium text-foreground truncate">{match.awayTeam}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">{match.venue}</p>
                <div className="flex items-center gap-2">
                  {match.status === "live" ? (
                    <>
                      <Button size="sm" variant="outline" className="h-8 gap-1">
                        <Pause className="size-3" />
                        일시정지
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => router.push(`/admin/match/${match.id}`)}
                      >
                        <Settings className="size-3" />
                        관리
                      </Button>
                    </>
                  ) : match.status === "scheduled" ? (
                    <>
                      <Button size="sm" variant="outline" className="h-8 gap-1">
                        <Settings className="size-3" />
                        설정
                      </Button>
                      <Button size="sm" className="h-8 gap-1">
                        <Play className="size-3" />
                        시작
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8 gap-1">
                      <Settings className="size-3" />
                      상세
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
