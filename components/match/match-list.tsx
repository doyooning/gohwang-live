"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { MatchCard } from "./match-card"
import type { Match } from "@/lib/types"
import { Loader2 } from "lucide-react"

export function MatchList() {
  const [matches, setMatches] = useState<Match[]>([])
  const [teamNamesById, setTeamNamesById] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient() as any

    async function fetchMatches() {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("match_date", { ascending: false })

      if (error) {
        console.error("Error fetching matches:", error)
      } else {
        setMatches(data || [])
        const teamIds = Array.from(
          new Set(
            (data || [])
              .flatMap((match: Match) => [match.home_team_id, match.away_team_id])
              .filter(Boolean)
          )
        )

        if (teamIds.length > 0) {
          const { data: teamsData } = await supabase
            .from("teams")
            .select("id, name")
            .in("id", teamIds)

          const nextTeamNamesById: Record<string, string> = {}
          ;(teamsData || []).forEach((team: any) => {
            nextTeamNamesById[team.id] = team.name
          })
          setTeamNamesById(nextTeamNamesById)
        } else {
          setTeamNamesById({})
        }
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

  const liveMatches = matches.filter((m) => m.status.toLowerCase() === "live")
  const scheduledMatches = matches.filter((m) => m.status.toLowerCase() === "scheduled")
  const finishedMatches = matches.filter((m) => m.status.toLowerCase() === "finished")

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
                homeTeam={`홈팀 · ${teamNamesById[match.home_team_id] || match.home_team || "미정"}`}
                awayTeam={`원정 · ${teamNamesById[match.away_team_id] || match.away_team || "미정"}`}
                homeScore={match.home_score}
                awayScore={match.away_score}
                venue={match.location || "-"}
                status={match.status.toLowerCase() as "live" | "scheduled" | "finished"}
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
                homeTeam={`홈팀 · ${teamNamesById[match.home_team_id] || match.home_team || "미정"}`}
                awayTeam={`원정 · ${teamNamesById[match.away_team_id] || match.away_team || "미정"}`}
                scheduledTime={new Date(match.match_date).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                venue={match.location || "-"}
                status={match.status.toLowerCase() as "live" | "scheduled" | "finished"}
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
                homeTeam={`홈팀 · ${teamNamesById[match.home_team_id] || match.home_team || "미정"}`}
                awayTeam={`원정 · ${teamNamesById[match.away_team_id] || match.away_team || "미정"}`}
                homeScore={match.home_score}
                awayScore={match.away_score}
                venue={match.location || "-"}
                status={match.status.toLowerCase() as "live" | "scheduled" | "finished"}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
