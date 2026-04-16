"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { ArrowLeft, Plus, Trash2, Save, Users, Loader2 } from "lucide-react"
import type { Match, Lineup } from "@/lib/types"

type Position = "GK" | "DF" | "MF" | "FW"
type Formation = "4-3-3" | "4-2-3-1" | "3-4-3"

interface Player {
  id: string
  name: string
  number: number
  position: Position
  isStarter: boolean
}

const FORMATIONS: Formation[] = ["4-3-3", "4-2-3-1", "3-4-3"]

const POSITIONS: { value: Position; label: string }[] = [
  { value: "GK", label: "골키퍼" },
  { value: "DF", label: "수비수" },
  { value: "MF", label: "미드필더" },
  { value: "FW", label: "공격수" },
]

export default function LineupManagementPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string

  const [match, setMatch] = useState<Match | null>(null)
  const [activeTeam, setActiveTeam] = useState<"home" | "away">("home")
  const [lineup, setLineup] = useState<{ home: Player[]; away: Player[] }>({ home: [], away: [] })
  const [formations, setFormations] = useState<{ home: Formation; away: Formation }>({
    home: "4-3-3",
    away: "4-3-3",
  })
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isFormationSelectOpen, setIsFormationSelectOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Alert dialog state
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")

  // New player form state
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerNumber, setNewPlayerNumber] = useState("")
  const [newPlayerPosition, setNewPlayerPosition] = useState<Position>("MF")
  const [newPlayerIsStarter, setNewPlayerIsStarter] = useState(false)

  // Auth guard
  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  // Fetch data
  useEffect(() => {
    const supabase = createClient()

    async function fetchData() {
      const [matchResult, lineupsResult] = await Promise.all([
        supabase.from("matches").select("*").eq("id", matchId).single(),
        supabase.from("lineups").select("*").eq("match_id", matchId),
      ])

      if (matchResult.data) {
        setMatch(matchResult.data)
      }

      if (lineupsResult.data) {
        const homePlayers: Player[] = lineupsResult.data
          .filter((l: Lineup) => l.team_side === "home")
          .map((l: Lineup) => ({
            id: l.id,
            name: l.player_name,
            number: l.jersey_number,
            position: "MF" as Position, // Default position since DB doesn't have it
            isStarter: l.is_starter,
          }))
        const awayPlayers: Player[] = lineupsResult.data
          .filter((l: Lineup) => l.team_side === "away")
          .map((l: Lineup) => ({
            id: l.id,
            name: l.player_name,
            number: l.jersey_number,
            position: "MF" as Position,
            isStarter: l.is_starter,
          }))
        setLineup({ home: homePlayers, away: awayPlayers })
      }
      setLoading(false)
    }

    fetchData()
  }, [matchId])

  const currentPlayers = lineup[activeTeam]
  const starters = currentPlayers.filter((p) => p.isStarter)
  const substitutes = currentPlayers.filter((p) => !p.isStarter)

  const getPositionColor = (position: Position) => {
    switch (position) {
      case "GK":
        return "bg-yellow-500/20 text-yellow-400"
      case "DF":
        return "bg-blue-500/20 text-blue-400"
      case "MF":
        return "bg-green-500/20 text-green-400"
      case "FW":
        return "bg-red-500/20 text-red-400"
    }
  }

  const validateLineup = (players: Player[]): { valid: boolean; message: string } => {
    const starterPlayers = players.filter((p) => p.isStarter)
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
        message: "선발 명단에 골키퍼가 반드시 1명 포함되어야 합니다. (현재: 0명)",
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

  const handleToggleStarter = (playerId: string) => {
    setLineup((prev) => ({
      ...prev,
      [activeTeam]: prev[activeTeam].map((player) =>
        player.id === playerId
          ? { ...player, isStarter: !player.isStarter }
          : player
      ),
    }))
  }

  const handleRemovePlayer = async (playerId: string) => {
    const supabase = createClient()
    await supabase.from("lineups").delete().eq("id", playerId)

    setLineup((prev) => ({
      ...prev,
      [activeTeam]: prev[activeTeam].filter((player) => player.id !== playerId),
    }))
  }

  const handleAddPlayer = async () => {
    if (!newPlayerName || !newPlayerNumber) return

    const supabase = createClient()

    const { data, error } = await supabase
      .from("lineups")
      .insert({
        match_id: matchId,
        team_side: activeTeam,
        player_name: newPlayerName,
        jersey_number: parseInt(newPlayerNumber),
        is_starter: newPlayerIsStarter,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding player:", error)
      return
    }

    const newPlayer: Player = {
      id: data.id,
      name: newPlayerName,
      number: parseInt(newPlayerNumber),
      position: newPlayerPosition,
      isStarter: newPlayerIsStarter,
    }

    setLineup((prev) => ({
      ...prev,
      [activeTeam]: [...prev[activeTeam], newPlayer],
    }))

    // Reset form
    setNewPlayerName("")
    setNewPlayerNumber("")
    setNewPlayerPosition("MF")
    setNewPlayerIsStarter(false)
    setIsAddDialogOpen(false)
  }

  const handleSaveLineup = async () => {
    // Validate both teams
    const homeValidation = validateLineup(lineup.home)
    const awayValidation = validateLineup(lineup.away)

    if (!homeValidation.valid) {
      setAlertMessage(`[홈팀] ${homeValidation.message}`)
      setAlertOpen(true)
      return
    }

    if (!awayValidation.valid) {
      setAlertMessage(`[원정팀] ${awayValidation.message}`)
      setAlertOpen(true)
      return
    }

    setIsSaving(true)

    const supabase = createClient()

    // Update is_starter for all players
    const allPlayers = [...lineup.home, ...lineup.away]
    for (const player of allPlayers) {
      await supabase
        .from("lineups")
        .update({ is_starter: player.isStarter })
        .eq("id", player.id)
    }

    setIsSaving(false)
    setAlertMessage("라인업이 저장되었습니다.")
    setAlertOpen(true)
  }

  const handleFormationChange = (formation: Formation) => {
    setFormations((prev) => ({
      ...prev,
      [activeTeam]: formation,
    }))
    setIsFormationSelectOpen(false)
  }

  if (!user) {
    return null
  }

  if (loading || !match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

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
              {match.home_team} vs {match.away_team}
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
              <span className="font-medium">{match.home_team}</span>
              <span className="text-xs opacity-70">홈팀</span>
            </div>
          </Button>
          <Button
            variant={activeTeam === "away" ? "default" : "outline"}
            className="h-12"
            onClick={() => setActiveTeam("away")}
          >
            <div className="flex flex-col items-center">
              <span className="font-medium">{match.away_team}</span>
              <span className="text-xs opacity-70">원정팀</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Formation Summary - Clickable */}
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
      <main className="flex-1 px-4 py-4 space-y-6">
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
                  onToggleStarter={() => handleToggleStarter(player.id)}
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
                  onToggleStarter={() => handleToggleStarter(player.id)}
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
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="size-5" />
          선수 추가
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

      {/* Add Player Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>선수 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">선수명</label>
              <Input
                placeholder="선수 이름 입력"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">등번호</label>
              <Input
                type="number"
                placeholder="등번호 입력"
                value={newPlayerNumber}
                onChange={(e) => setNewPlayerNumber(e.target.value)}
                className="h-12"
                min={1}
                max={99}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">포지션</label>
              <Select
                value={newPlayerPosition}
                onValueChange={(value) => setNewPlayerPosition(value as Position)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="포지션 선택" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.label} ({pos.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between py-2">
              <label className="text-sm font-medium text-foreground">선발 출전</label>
              <Switch
                checked={newPlayerIsStarter}
                onCheckedChange={setNewPlayerIsStarter}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleAddPlayer}
              disabled={!newPlayerName || !newPlayerNumber}
            >
              추가하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for validation/success messages */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertMessage.includes("저장되었습니다") ? "저장 완료" : "라인업 오류"}
            </AlertDialogTitle>
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
  onToggleStarter,
  onRemove,
}: {
  player: Player
  positionColor: string
  onToggleStarter: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
      {/* Number */}
      <div className="flex items-center justify-center size-10 rounded-lg bg-secondary text-foreground font-bold text-sm">
        {player.number}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {player.name}
        </p>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${positionColor}`}
        >
          {player.position}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">선발</span>
          <Switch checked={player.isStarter} onCheckedChange={onToggleStarter} />
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
