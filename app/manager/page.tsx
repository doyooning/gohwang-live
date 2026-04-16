"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LogOut, Play, Settings, Users, Calendar, Radio, Loader2 } from "lucide-react"
import type { Match } from "@/lib/types"

export default function AdminPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const supabase = createClient()

    async function fetchMatches() {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("match_date", { ascending: false })

      if (error) {
        console.error("Error fetching matches:", error)
      } else {
        setMatches(data || [])
      }
      setLoading(false)
    }

    fetchMatches()

    // Subscribe to realtime updates
    const channel = supabase
      .channel("admin-matches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          fetchMatches()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, router])

  if (!user) {
    return null
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
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
      case "finished":
        return <Badge variant="secondary">종료</Badge>
      default:
        return null
    }
  }

  const liveMatches = matches.filter((m) => m.status.toLowerCase() === "live")
  const scheduledMatches = matches.filter((m) => m.status.toLowerCase() === "scheduled")

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
          <p className="text-xl font-bold text-foreground">{liveMatches.length}</p>
          <p className="text-xs text-muted-foreground">라이브 중</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Calendar className="size-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{scheduledMatches.length}</p>
          <p className="text-xs text-muted-foreground">예정 경기</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Users className="size-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{matches.length}</p>
          <p className="text-xs text-muted-foreground">총 경기</p>
        </div>
      </div>

      {/* Match List */}
      <main className="px-4 pb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">경기 목록</h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            등록된 경기가 없습니다
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className={`bg-card border rounded-lg p-4 ${
                  match.status.toLowerCase() === "live"
                    ? "border-primary/50 shadow-[0_0_10px_rgba(var(--primary),0.15)]"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  {getStatusBadge(match.status)}
                  <span className="text-xs text-muted-foreground">
                    {new Date(match.match_date).toLocaleDateString("ko-KR")}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 text-center">
                    <p className="text-sm font-medium text-foreground truncate">{match.home_team}</p>
                  </div>
                  <div className="px-4">
                    {match.status.toLowerCase() === "scheduled" ? (
                      <p className="text-lg font-bold text-muted-foreground">
                        {new Date(match.match_date).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    ) : (
                      <p className="text-lg font-bold text-foreground">
                        {match.home_score} : {match.away_score}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-sm font-medium text-foreground truncate">{match.away_team}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">{match.location}</p>
                  <div className="flex items-center gap-2">
                    {match.status.toLowerCase() === "live" ? (
                      <Button
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => router.push(`/manager/match/${match.id}`)}
                      >
                        <Settings className="size-3" />
                        관리
                      </Button>
                    ) : match.status.toLowerCase() === "scheduled" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1"
                          onClick={() => router.push(`/manager/match/${match.id}`)}
                        >
                          <Settings className="size-3" />
                          설정
                        </Button>
                        <Button size="sm" className="h-8 gap-1">
                          <Play className="size-3" />
                          시작
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1"
                        onClick={() => router.push(`/manager/match/${match.id}`)}
                      >
                        <Settings className="size-3" />
                        상세
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
