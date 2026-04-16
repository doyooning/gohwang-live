"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { MatchCard } from "./match-card"
import type { Match } from "@/lib/types"
import { Loader2 } from "lucide-react"

export function MatchList() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetchMatches() {
      console.log("[v0] Fetching matches from Supabase...")
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("match_date", { ascending: false })

      console.log("[v0] Matches data:", data)
      console.log("[v0] Matches error:", error)

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
      .channel("matches-changes")
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
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  const liveMatches = matches.filter((m) => m.status === "live")
  const scheduledMatches = matches.filter((m) => m.status === "scheduled")
  const finishedMatches = matches.filter((m) => m.status === "finished")

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        등록된 경기가 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {liveMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            진행 중
          </h2>
          <div className="space-y-3">
            {liveMatches.map((match) => (
              <MatchCard
                key={match.id}
                id={match.id}
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                homeScore={match.home_score}
                awayScore={match.away_score}
                venue={match.location}
                status="live"
              />
            ))}
          </div>
        </section>
      )}

      {scheduledMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            예정된 경기
          </h2>
          <div className="space-y-3">
            {scheduledMatches.map((match) => (
              <MatchCard
                key={match.id}
                id={match.id}
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                scheduledTime={new Date(match.match_date).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                venue={match.location}
                status="scheduled"
              />
            ))}
          </div>
        </section>
      )}

      {finishedMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            종료된 경기
          </h2>
          <div className="space-y-3">
            {finishedMatches.map((match) => (
              <MatchCard
                key={match.id}
                id={match.id}
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                homeScore={match.home_score}
                awayScore={match.away_score}
                venue={match.location}
                status="finished"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
