"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
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
import { ArrowLeft, Plus, Trash2, Save, Users } from "lucide-react"

// Types
type Position = "GK" | "DF" | "MF" | "FW"

interface Player {
  id: string
  name: string
  number: number
  position: Position
  isStarter: boolean
}

interface TeamLineup {
  home: Player[]
  away: Player[]
}

// Mock data
const MATCH_DATA = {
  id: "match-1",
  homeTeam: "FC 서울 유스",
  awayTeam: "수원 삼성 유스",
}

const INITIAL_LINEUP: TeamLineup = {
  home: [
    { id: "h1", name: "김민수", number: 1, position: "GK", isStarter: true },
    { id: "h2", name: "이준호", number: 2, position: "DF", isStarter: true },
    { id: "h3", name: "박지훈", number: 3, position: "DF", isStarter: true },
    { id: "h4", name: "최영준", number: 4, position: "DF", isStarter: true },
    { id: "h5", name: "정우성", number: 5, position: "DF", isStarter: true },
    { id: "h6", name: "강현우", number: 6, position: "MF", isStarter: true },
    { id: "h7", name: "윤성민", number: 7, position: "MF", isStarter: true },
    { id: "h8", name: "임재현", number: 8, position: "MF", isStarter: true },
    { id: "h9", name: "한동훈", number: 9, position: "FW", isStarter: true },
    { id: "h10", name: "오승환", number: 10, position: "FW", isStarter: true },
    { id: "h11", name: "신태용", number: 11, position: "FW", isStarter: true },
    { id: "h12", name: "권창훈", number: 12, position: "GK", isStarter: false },
    { id: "h13", name: "김태환", number: 13, position: "DF", isStarter: false },
    { id: "h14", name: "이명주", number: 14, position: "MF", isStarter: false },
  ],
  away: [
    { id: "a1", name: "조현우", number: 1, position: "GK", isStarter: true },
    { id: "a2", name: "김진수", number: 2, position: "DF", isStarter: true },
    { id: "a3", name: "이용", number: 3, position: "DF", isStarter: true },
    { id: "a4", name: "김영권", number: 4, position: "DF", isStarter: true },
    { id: "a5", name: "황인범", number: 5, position: "MF", isStarter: true },
    { id: "a6", name: "정우영", number: 6, position: "MF", isStarter: true },
    { id: "a7", name: "손흥민", number: 7, position: "FW", isStarter: true },
    { id: "a8", name: "이강인", number: 8, position: "MF", isStarter: true },
    { id: "a9", name: "황희찬", number: 9, position: "FW", isStarter: true },
    { id: "a10", name: "조규성", number: 10, position: "FW", isStarter: true },
    { id: "a11", name: "김민재", number: 11, position: "DF", isStarter: true },
    { id: "a12", name: "송범근", number: 12, position: "GK", isStarter: false },
    { id: "a13", name: "홍철", number: 13, position: "DF", isStarter: false },
  ],
}

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

  const [activeTeam, setActiveTeam] = useState<"home" | "away">("home")
  const [lineup, setLineup] = useState<TeamLineup>(INITIAL_LINEUP)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // New player form state
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerNumber, setNewPlayerNumber] = useState("")
  const [newPlayerPosition, setNewPlayerPosition] = useState<Position>("MF")
  const [newPlayerIsStarter, setNewPlayerIsStarter] = useState(false)

  // Auth guard
  useEffect(() => {
    if (!user) {
      router.push("/login")
    } else if (user.role !== "operator") {
      router.push("/")
    }
  }, [user, router])

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

  const handleRemovePlayer = (playerId: string) => {
    setLineup((prev) => ({
      ...prev,
      [activeTeam]: prev[activeTeam].filter((player) => player.id !== playerId),
    }))
  }

  const handleAddPlayer = () => {
    if (!newPlayerName || !newPlayerNumber) return

    const newPlayer: Player = {
      id: `${activeTeam}-${Date.now()}`,
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
    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
    // Show success feedback (in real app, use toast)
    alert("라인업이 저장되었습니다.")
  }

  // Formation summary
  const getFormationSummary = (players: Player[]) => {
    const startersByPosition = players
      .filter((p) => p.isStarter)
      .reduce(
        (acc, p) => {
          acc[p.position] = (acc[p.position] || 0) + 1
          return acc
        },
        {} as Record<Position, number>
      )

    const df = startersByPosition["DF"] || 0
    const mf = startersByPosition["MF"] || 0
    const fw = startersByPosition["FW"] || 0

    return `${df}-${mf}-${fw}`
  }

  if (!user || user.role !== "operator") {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/admin/match/${params.id}`)}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">라인업 관리</h1>
            <p className="text-xs text-muted-foreground">
              {MATCH_DATA.homeTeam} vs {MATCH_DATA.awayTeam}
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
              <span className="font-medium">{MATCH_DATA.homeTeam}</span>
              <span className="text-xs opacity-70">홈팀</span>
            </div>
          </Button>
          <Button
            variant={activeTeam === "away" ? "default" : "outline"}
            className="h-12"
            onClick={() => setActiveTeam("away")}
          >
            <div className="flex flex-col items-center">
              <span className="font-medium">{MATCH_DATA.awayTeam}</span>
              <span className="text-xs opacity-70">원정팀</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Formation Summary */}
      <div className="px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">포메이션</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-primary">
              {getFormationSummary(currentPlayers)}
            </span>
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
