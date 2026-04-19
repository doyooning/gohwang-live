"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { MatchCard } from "./match-card"
import type { Match } from "@/lib/types"
import { Loader2 } from "lucide-react"

export function MatchList() {
  const [matches, setMatches] = useState<Match[]>([])
  const [teamNamesById, setTeamNamesById] = useState<Record<string, string>>({})
  const [liveMatchTimesById, setLiveMatchTimesById] = useState<
    Record<
      string,
      {
        first_half_start?: string
        first_half_end?: string
        second_half_start?: string
        second_half_end?: string
        extra_start?: string
        extra_end?: string
      }
    >
  >({})
  const [shootoutByMatchId, setShootoutByMatchId] = useState<Record<string, { home: number; away: number }>>({})
  const [clockTick, setClockTick] = useState(0)
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
        const nextMatches = data || []
        setMatches(nextMatches)
        const teamIds = Array.from(
          new Set(
            nextMatches
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

        const liveMatchIds = nextMatches
          .filter((m: Match) => String(m.status || "").toLowerCase() === "live")
          .map((m: Match) => m.id)
        if (liveMatchIds.length > 0) {
          const { data: timeEvents } = await supabase
            .from("match_events")
            .select("match_id, event_type, created_at")
            .in("match_id", liveMatchIds)
            .in("event_type", [
              "half_start",
              "half_end",
              "second_half_start",
              "second_half_end",
              "extra_time_start",
              "extra_time_end",
            ])
            .order("created_at", { ascending: true })

          const nextTimesById: Record<
            string,
            {
              first_half_start?: string
              first_half_end?: string
              second_half_start?: string
              second_half_end?: string
              extra_start?: string
              extra_end?: string
            }
          > = {}

          ;(timeEvents || []).forEach((event: any) => {
            const matchId = event.match_id as string
            if (!nextTimesById[matchId]) nextTimesById[matchId] = {}
            if (event.event_type === "half_start") nextTimesById[matchId].first_half_start = event.created_at
            if (event.event_type === "half_end") nextTimesById[matchId].first_half_end = event.created_at
            if (event.event_type === "second_half_start") nextTimesById[matchId].second_half_start = event.created_at
            if (event.event_type === "second_half_end") nextTimesById[matchId].second_half_end = event.created_at
            if (event.event_type === "extra_time_start") nextTimesById[matchId].extra_start = event.created_at
            if (event.event_type === "extra_time_end") nextTimesById[matchId].extra_end = event.created_at
          })
          setLiveMatchTimesById(nextTimesById)
        } else {
          setLiveMatchTimesById({})
        }

        const endedMatchIds = nextMatches
          .filter((m: Match) => {
            const s = String(m.status || "").toLowerCase()
            return s === "ended"
          })
          .map((m: Match) => m.id)
        if (endedMatchIds.length > 0) {
          const { data: shootoutEvents } = await supabase
            .from("match_events")
            .select("match_id, team_side, event_type")
            .in("match_id", endedMatchIds)
            .in("event_type", ["shootout_goal", "shootout_missed"])

          const nextShootout: Record<string, { home: number; away: number }> = {}
          ;(shootoutEvents || []).forEach((event: any) => {
            if (!nextShootout[event.match_id]) nextShootout[event.match_id] = { home: 0, away: 0 }
            if (event.event_type === "shootout_goal") {
              if (event.team_side === "HOME") nextShootout[event.match_id].home += 1
              if (event.team_side === "AWAY") nextShootout[event.match_id].away += 1
            }
          })
          setShootoutByMatchId(nextShootout)
        } else {
          setShootoutByMatchId({})
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

  useEffect(() => {
    if (!matches.some((m) => String(m.status || "").toLowerCase() === "live")) return
    const interval = setInterval(() => setClockTick((prev) => prev + 1), 1000)
    return () => clearInterval(interval)
  }, [matches])

  const parseIso = (value?: string) => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const elapsedMinutes = (start?: string, end = new Date()) => {
    const s = parseIso(start)
    if (!s) return 0
    return Math.max(0, Math.floor((end.getTime() - s.getTime()) / 60000))
  }

  const getLiveClockLabel = (matchId: string) => {
    void clockTick
    const t = liveMatchTimesById[matchId]
    if (!t) return "LIVE"
    if (t.extra_end) return "연장 ET"
    if (t.extra_start) return `연장 ${elapsedMinutes(t.extra_start)}'`
    if (t.second_half_end) return "후반 FT"
    if (t.second_half_start) return `후반 ${elapsedMinutes(t.second_half_start)}'`
    if (t.first_half_end) return "전반 HT"
    if (t.first_half_start) return `전반 ${elapsedMinutes(t.first_half_start)}'`
    return "LIVE"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  const normalizedStatus = (status: string) => String(status || "").toLowerCase()
  const liveMatches = matches.filter((m) => normalizedStatus(m.status) === "live")
  const scheduledMatches = matches.filter((m) => normalizedStatus(m.status) === "scheduled")
  const endedMatches = matches.filter((m) => {
    const s = normalizedStatus(m.status)
    return s === "ended"
  })

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
                liveClockLabel={getLiveClockLabel(match.id)}
                venue={match.location || "-"}
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
                homeTeam={`홈팀 · ${teamNamesById[match.home_team_id] || match.home_team || "미정"}`}
                awayTeam={`원정 · ${teamNamesById[match.away_team_id] || match.away_team || "미정"}`}
                scheduledTime={new Date(match.match_date).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                venue={match.location || "-"}
                status={match.status.toLowerCase() as "live" | "scheduled" | "ended"}
              />
            ))}
          </div>
        </section>
      )}

      {endedMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            종료된 경기
          </h2>
          <div className="space-y-3">
            {endedMatches.map((match) => (
              <MatchCard
                key={match.id}
                id={match.id}
                homeTeam={`홈팀 · ${teamNamesById[match.home_team_id] || match.home_team || "미정"}`}
                awayTeam={`원정 · ${teamNamesById[match.away_team_id] || match.away_team || "미정"}`}
                homeScore={match.home_score}
                awayScore={match.away_score}
                shootoutScoreLabel={
                  shootoutByMatchId[match.id]
                    ? `${shootoutByMatchId[match.id].home}-${shootoutByMatchId[match.id].away}`
                    : undefined
                }
                shootoutWinnerSide={
                  shootoutByMatchId[match.id]
                    ? shootoutByMatchId[match.id].home > shootoutByMatchId[match.id].away
                      ? "home"
                      : shootoutByMatchId[match.id].away > shootoutByMatchId[match.id].home
                      ? "away"
                      : null
                    : null
                }
                venue={match.location || "-"}
                status="ended"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
