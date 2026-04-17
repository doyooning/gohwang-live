"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, Trash2, Save, Users, Loader2, UserPlus } from "lucide-react"
import type { Match, Team, TeamPlayer, MatchLineup, MatchLineupPlayer } from "@/lib/types"

type Formation = "4-3-3" | "4-2-3-1" | "3-4-3"

interface LineupPlayer {
  id: string
  teamPlayerId: string
  name: string
  number: number
  position: string | null
  role: "starter" | "substitute"
}

const FORMATIONS: Formation[] = ["4-3-3", "4-2-3-1", "3-4-3"]

export default function LineupManagementPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string
  const { toast } = useToast()
  const supabase = createClient()

  const [match, setMatch] = useState<Match | null>(null)
  const [teams, setTeams] = useState<{ home: Team | null; away: Team | null }>({ home: null, away: null })
  const [teamPlayers, setTeamPlayers] = useState<{ home: TeamPlayer[]; away: TeamPlayer[] }>({ home: [], away: [] })
  const [matchLineups, setMatchLineups] = useState<{ home: MatchLineup | null; away: MatchLineup | null }>({ home: null, away: null })
  const [lineupPlayers, setLineupPlayers] = useState<{ home: LineupPlayer[]; away: LineupPlayer[] }>({ home: [], away: [] })

  const [activeTeam, setActiveTeam] = useState<"home" | "away">("home")
  const [formations, setFormations] = useState<{ home: Formation; away: Formation }>({
    home: "4-3-3",
    away: "4-3-3",
  })

  const [isSelectPlayerDialogOpen, setIsSelectPlayerDialogOpen] = useState(false)
  const [isFormationSelectOpen, setIsFormationSelectOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Alert dialog state
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  const [alertTitle, setAlertTitle] = useState("")

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  useEffect(() => {
    async function fetchData() {
      // Fetch match
      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single()

      if (!matchData) {
        setLoading(false)
        return
      }
      setMatch(matchData)

      // Fetch teams
      const homeTeamPromise = matchData.home_team_id
        ? supabase.from("teams").select("*").eq("id", matchData.home_team_id).single()
        : Promise.resolve({ data: null })
      const awayTeamPromise = matchData.away_team_id
        ? supabase.from("teams").select("*").eq("id", matchData.away_team_id).single()
        : Promise.resolve({ data: null })

      const [homeTeamResult, awayTeamResult] = await Promise.all([homeTeamPromise, awayTeamPromise])
      setTeams({
        home: homeTeamResult.data,
        away: awayTeamResult.data,
      })

      // Fetch team players
      const homePlayersPromise = matchData.home_team_id
        ? supabase.from("team_players").select("*").eq("team_id", matchData.home_team_id).eq("is_active", true).order("jersey_number")
        : Promise.resolve({ data: [] })
      const awayPlayersPromise = matchData.away_team_id
        ? supabase.from("team_players").select("*").eq("team_id", matchData.away_team_id).eq("is_active", true).order("jersey_number")
        : Promise.resolve({ data: [] })

      const [homePlayersResult, awayPlayersResult] = await Promise.all([homePlayersPromise, awayPlayersPromise])
      setTeamPlayers({
        home: homePlayersResult.data || [],
        away: awayPlayersResult.data || [],
      })

      // Fetch match lineups
      const { data: lineupsData } = await supabase
        .from("match_lineups")
        .select("*")
        .eq("match_id", matchId)

      const homeLineup = lineupsData?.find((l: MatchLineup) => l.team_side === "home") || null
      const awayLineup = lineupsData?.find((l: MatchLineup) => l.team_side === "away") || null
      setMatchLineups({ home: homeLineup, away: awayLineup })

      if (homeLineup?.formation) {
        setFormations((prev) => ({ ...prev, home: homeLineup.formation as Formation }))
      }
      if (awayLineup?.formation) {
        setFormations((prev) => ({ ...prev, away: awayLineup.formation as Formation }))
      }

      // Fetch lineup players
      const lineupIds = [homeLineup?.id, awayLineup?.id].filter(Boolean)
      if (lineupIds.length > 0) {
        const { data: lineupPlayersData } = await supabase
          .from("match_lineup_players")
          .select("*, team_player:team_players(*)")
          .in("match_lineup_id", lineupIds)

        const homePlayers: LineupPlayer[] = []
        const awayPlayers: LineupPlayer[] = []

        lineupPlayersData?.forEach((lp: MatchLineupPlayer & { team_player: TeamPlayer }) => {
          const player: LineupPlayer = {
            id: lp.id,
            teamPlayerId: lp.team_player_id,
            name: lp.team_player?.name || "",
            number: lp.team_player?.jersey_number || 0,
            position: lp.team_player?.position || null,
            role: lp.lineup_role,
          }
          if (lp.match_lineup_id === homeLineup?.id) {
            homePlayers.push(player)
          } else {
            awayPlayers.push(player)
          }
        })

        setLineupPlayers({ home: homePlayers, away: awayPlayers })
      }

      setLoading(false)
    }

    fetchData()
  }, [matchId, supabase])

  const currentPlayers = lineupPlayers[activeTeam]
  const currentTeamPlayers = teamPlayers[activeTeam]
  const starters = currentPlayers.filter((p) => p.role === "starter")
  const substitutes = currentPlayers.filter((p) => p.role === "substitute")

  // Players not yet in lineup
  const availablePlayers = currentTeamPlayers.filter(
    (tp) => !currentPlayers.some((lp) => lp.teamPlayerId === tp.id)
  )

  const getPositionColor = (position: string | null) => {
    switch (position) {
      case "GK":
        return "bg-yellow-500/20 text-yellow-400"
      case "DF":
        return "bg-blue-500/20 text-blue-400"
      case "MF":
        return "bg-green-500/20 text-green-400"
      case "FW":
        return "bg-red-500/20 text-red-400"
      default:
        return "bg-secondary text-muted-foreground"
    }
  }

  const validateLineup = (players: LineupPlayer[]): { valid: boolean; message: string } => {
    const starterPlayers = players.filter((p) => p.role === "starter")
    const gkCount = starterPlayers.filter((p) => p.position === "GK").length

    if (starterPlayers.length !== 11) {
      return {
        valid: false,
        message: `선발 명단은 반드시 11명이어야 합니다. (현재: ${starterPlayers.length}명)`,
      }
    }

    if (gkCount === 0) {
      return {
        valid: false,
        message: "선발 명단에 골키퍼가 반드시 1명 포함되어야 합니다.",
      }
    }

    if (gkCount > 1) {
      return {
        valid: false,
        message: `선발 명단에 골키퍼는 1명만 포함될 수 있습니다. (현재: ${gkCount}명)`,
      }
    }

    return { valid: true, message: "" }
  }

  const handleToggleRole = (playerId: string) => {
    setLineupPlayers((prev) => ({
      ...prev,
      [activeTeam]: prev[activeTeam].map((player) =>
        player.id === playerId
          ? { ...player, role: player.role === "starter" ? "substitute" : "starter" }
          : player
      ),
    }))
  }

  const handleRemovePlayer = async (playerId: string) => {
    await supabase.from("match_lineup_players").delete().eq("id", playerId)

    setLineupPlayers((prev) => ({
      ...prev,
      [activeTeam]: prev[activeTeam].filter((player) => player.id !== playerId),
    }))

    toast({ title: "선수가 라인업에서 제외되었습니다" })
  }

  const handleAddPlayerToLineup = async (teamPlayer: TeamPlayer, role: "starter" | "substitute") => {
    // Ensure match lineup exists
    let lineupId = matchLineups[activeTeam]?.id

    if (!lineupId) {
      const teamId = activeTeam === "home" ? match?.home_team_id : match?.away_team_id
      if (!teamId) return

      const { data: newLineup } = await supabase
        .from("match_lineups")
        .insert({
          match_id: matchId,
          team_id: teamId,
          team_side: activeTeam,
          formation: formations[activeTeam],
        })
        .select()
        .single()

      if (newLineup) {
        lineupId = newLineup.id
        setMatchLineups((prev) => ({ ...prev, [activeTeam]: newLineup }))
      }
    }

    if (!lineupId) return

    const { data: newLineupPlayer } = await supabase
      .from("match_lineup_players")
      .insert({
        match_lineup_id: lineupId,
        team_player_id: teamPlayer.id,
        lineup_role: role,
      })
      .select()
      .single()

    if (newLineupPlayer) {
      const newPlayer: LineupPlayer = {
        id: newLineupPlayer.id,
        teamPlayerId: teamPlayer.id,
        name: teamPlayer.name,
        number: teamPlayer.jersey_number,
        position: teamPlayer.position,
        role: role,
      }

      setLineupPlayers((prev) => ({
        ...prev,
        [activeTeam]: [...prev[activeTeam], newPlayer],
      }))

      toast({ title: `${teamPlayer.name} 선수가 라인업에 추가되었습니다` })
    }

    setIsSelectPlayerDialogOpen(false)
  }

  const handleSaveLineup = async () => {
    // Validate both teams
    const homeValidation = validateLineup(lineupPlayers.home)
    const awayValidation = validateLineup(lineupPlayers.away)

    if (!homeValidation.valid) {
      setAlertTitle("라인업 오류")
      setAlertMessage(`[홈팀] ${homeValidation.message}`)
      setAlertOpen(true)
      return
    }

    if (!awayValidation.valid) {
      setAlertTitle("라인업 오류")
      setAlertMessage(`[원정팀] ${awayValidation.message}`)
      setAlertOpen(true)
      return
    }

    setIsSaving(true)

    // Update lineup roles
    const allPlayers = [...lineupPlayers.home, ...lineupPlayers.away]
    for (const player of allPlayers) {
      await supabase
        .from("match_lineup_players")
        .update({ lineup_role: player.role })
        .eq("id", player.id)
    }

    // Update formations
    if (matchLineups.home) {
      await supabase
        .from("match_lineups")
        .update({ formation: formations.home })
        .eq("id", matchLineups.home.id)
    }
    if (matchLineups.away) {
      await supabase
        .from("match_lineups")
        .update({ formation: formations.away })
        .eq("id", matchLineups.away.id)
    }

    setIsSaving(false)
    toast({ title: "라인업이 저장되었습니다" })
  }

  const handleFormationChange = (formation: Formation) => {
    setFormations((prev) => ({
      ...prev,
      [activeTeam]: formation,
    }))
    setIsFormationSelectOpen(false)
  }

  if (!user) return null

  if (loading || !match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  const homeTeamName = teams.home?.name || match.home_team || "홈팀"
  const awayTeamName = teams.away?.name || match.away_team || "원정팀"

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/manager/match/${matchId}`)}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">라인업 관리</h1>
            <p className="text-xs text-muted-foreground">
              {homeTeamName} vs {awayTeamName}
            </p>
          </div>
          <Button
            onClick={handleSaveLineup}
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="size-4" />
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </header>

      {/* Team Switcher */}
      <div className="px-4 py-3 bg-secondary/30 border-b border-border">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={activeTeam === "home" ? "default" : "outline"}
            className="h-12"
            onClick={() => setActiveTeam("home")}
          >
            <div className="flex flex-col items-center">
              <span className="font-medium">{homeTeamName}</span>
              <span className="text-xs opacity-70">홈팀</span>
            </div>
          </Button>
          <Button
            variant={activeTeam === "away" ? "default" : "outline"}
            className="h-12"
            onClick={() => setActiveTeam("away")}
          >
            <div className="flex flex-col items-center">
              <span className="font-medium">{awayTeamName}</span>
              <span className="text-xs opacity-70">원정팀</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Team not linked warning */}
      {!teams[activeTeam] && (
        <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20">
          <p className="text-sm text-destructive">
            이 팀은 팀 명단과 연결되지 않았습니다. 경기 설정에서 팀을 연결해주세요.
          </p>
        </div>
      )}

      {/* Formation Summary */}
      <div className="px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">포메이션</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-9 px-4 gap-2"
              onClick={() => setIsFormationSelectOpen(true)}
            >
              <span className="text-lg font-bold text-primary">
                {formations[activeTeam]}
              </span>
            </Button>
            <span className="text-sm text-muted-foreground">
              ({starters.length}/11명)
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {/* Starters Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              선발 명단 ({starters.length}명)
            </h2>
            {starters.length !== 11 && (
              <span className="text-xs text-destructive font-medium">
                11명이어야 합니다
              </span>
            )}
          </div>
          <div className="space-y-2">
            {starters.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                선발 선수가 없습니다
              </div>
            ) : (
              starters.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  positionColor={getPositionColor(player.position)}
                  onToggleRole={() => handleToggleRole(player.id)}
                  onRemove={() => handleRemovePlayer(player.id)}
                />
              ))
            )}
          </div>
        </section>

        {/* Substitutes Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              교체 명단 ({substitutes.length}명)
            </h2>
          </div>
          <div className="space-y-2">
            {substitutes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                교체 선수가 없습니다
              </div>
            ) : (
              substitutes.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  positionColor={getPositionColor(player.position)}
                  onToggleRole={() => handleToggleRole(player.id)}
                  onRemove={() => handleRemovePlayer(player.id)}
                />
              ))
            )}
          </div>
        </section>
      </main>

      {/* Add Player Button */}
      <div className="sticky bottom-0 p-4 bg-background border-t border-border">
        <Button
          className="w-full h-14 gap-2 text-base"
          onClick={() => setIsSelectPlayerDialogOpen(true)}
          disabled={!teams[activeTeam]}
        >
          <UserPlus className="size-5" />
          팀 명단에서 선수 불러오기
        </Button>
      </div>

      {/* Formation Select Dialog */}
      <Dialog open={isFormationSelectOpen} onOpenChange={setIsFormationSelectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>포메이션 선택</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {FORMATIONS.map((formation) => (
              <Button
                key={formation}
                variant={formations[activeTeam] === formation ? "default" : "outline"}
                className="w-full h-14 text-xl font-bold"
                onClick={() => handleFormationChange(formation)}
              >
                {formation}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Select Player from Team Dialog */}
      <Dialog open={isSelectPlayerDialogOpen} onOpenChange={setIsSelectPlayerDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>선수 선택</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-2">
            {availablePlayers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                추가할 수 있는 선수가 없습니다
              </div>
            ) : (
              availablePlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg"
                >
                  <div className="flex items-center justify-center size-10 rounded-lg bg-secondary text-foreground font-bold text-sm">
                    {player.jersey_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {player.name}
                    </p>
                    {player.position && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPositionColor(
                          player.position
                        )}`}
                      >
                        {player.position}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddPlayerToLineup(player, "substitute")}
                    >
                      교체
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAddPlayerToLineup(player, "starter")}
                    >
                      선발
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSelectPlayerDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Player Card Component
function PlayerCard({
  player,
  positionColor,
  onToggleRole,
  onRemove,
}: {
  player: LineupPlayer
  positionColor: string
  onToggleRole: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
      <div className="flex items-center justify-center size-10 rounded-lg bg-secondary text-foreground font-bold text-sm">
        {player.number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {player.name}
        </p>
        {player.position && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${positionColor}`}
          >
            {player.position}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">선발</span>
          <Switch checked={player.role === "starter"} onCheckedChange={onToggleRole} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
