"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import type { Lineup, Match } from "@/lib/types"

interface LineupTabProps {
  matchId?: string
}

interface Player {
  number: number
  name: string
  isCaptain?: boolean
}

interface TeamLineup {
  teamName: string
  starters: Player[]
  substitutes: Player[]
}

function PlayerRow({ player }: { player: Player }) {
  return (
    <div className="flex items-center justify-between py-2 px-3">
      <div className="flex items-center gap-3">
        <span className="w-6 text-center text-sm font-bold text-primary tabular-nums">
          {player.number}
        </span>
        <span className="text-sm text-foreground">
          {player.name}
          {player.isCaptain && (
            <span className="ml-1.5 text-[10px] text-accent font-bold">(C)</span>
          )}
        </span>
      </div>
    </div>
  )
}

function TeamSection({ lineup, isAway }: { lineup: TeamLineup; isAway?: boolean }) {
  return (
    <div className={`flex-1 ${isAway ? "border-l border-border" : ""}`}>
      <div className="px-3 py-2 bg-secondary/50">
        <div className="text-sm font-bold text-foreground">{lineup.teamName}</div>
      </div>
      
      <div className="px-1">
        <div className="text-xs text-muted-foreground px-3 py-2 border-b border-border/50">
          선발 ({lineup.starters.length}명)
        </div>
        {lineup.starters.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">라인업 없음</div>
        ) : (
          lineup.starters.map((player) => (
            <PlayerRow key={player.number} player={player} />
          ))
        )}
        
        <div className="text-xs text-muted-foreground px-3 py-2 border-b border-border/50 mt-2">
          교체 ({lineup.substitutes.length}명)
        </div>
        {lineup.substitutes.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">교체 선수 없음</div>
        ) : (
          lineup.substitutes.map((player) => (
            <PlayerRow key={player.number} player={player} />
          ))
        )}
      </div>
    </div>
  )
}

export function LineupTab({ matchId }: LineupTabProps) {
  const [match, setMatch] = useState<Match | null>(null)
  const [lineups, setLineups] = useState<Lineup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!matchId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    async function fetchData() {
      const [matchResult, lineupsResult] = await Promise.all([
        supabase.from("matches").select("*").eq("id", matchId).single(),
        supabase.from("lineups").select("*").eq("match_id", matchId).order("jersey_number", { ascending: true }),
      ])

      if (matchResult.data) {
        setMatch(matchResult.data)
      }
      if (lineupsResult.data) {
        setLineups(lineupsResult.data)
      }
      setLoading(false)
    }

    fetchData()

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`lineups-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lineups", filter: `match_id=eq.${matchId}` },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  const homeLineup: TeamLineup = {
    teamName: match?.home_team || "홈팀",
    starters: lineups
      .filter((l) => l.team_side === "home" && l.is_starter)
      .map((l) => ({ number: l.jersey_number, name: l.player_name })),
    substitutes: lineups
      .filter((l) => l.team_side === "home" && !l.is_starter)
      .map((l) => ({ number: l.jersey_number, name: l.player_name })),
  }

  const awayLineup: TeamLineup = {
    teamName: match?.away_team || "원정팀",
    starters: lineups
      .filter((l) => l.team_side === "away" && l.is_starter)
      .map((l) => ({ number: l.jersey_number, name: l.player_name })),
    substitutes: lineups
      .filter((l) => l.team_side === "away" && !l.is_starter)
      .map((l) => ({ number: l.jersey_number, name: l.player_name })),
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex">
        <TeamSection lineup={homeLineup} />
        <TeamSection lineup={awayLineup} isAway />
      </div>
    </ScrollArea>
  )
}
