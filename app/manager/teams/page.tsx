"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Users,
  Loader2,
  ChevronRight,
} from "lucide-react"
import type { Team, TeamPlayer } from "@/lib/types"

type Position = "GK" | "DF" | "MF" | "FW" | ""

const POSITIONS: { value: Position; label: string }[] = [
  { value: "GK", label: "골키퍼" },
  { value: "DF", label: "수비수" },
  { value: "MF", label: "미드필더" },
  { value: "FW", label: "공격수" },
]

export default function TeamsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient() as any

  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<TeamPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  // Dialog states
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false)
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false)
  const [isDeletePlayerDialogOpen, setIsDeletePlayerDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editingPlayer, setEditingPlayer] = useState<TeamPlayer | null>(null)
  const [deletingPlayer, setDeletingPlayer] = useState<TeamPlayer | null>(null)

  // Form states
  const [teamName, setTeamName] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [playerNumber, setPlayerNumber] = useState("")
  const [playerPosition, setPlayerPosition] = useState<Position>("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    fetchTeams()
  }, [isLoading, user, router])

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching teams:", error)
    } else {
      setTeams(data || [])
    }
    setLoading(false)
  }

  const fetchPlayers = async (teamId: string) => {
    setLoadingPlayers(true)
    const { data, error } = await supabase
      .from("team_players")
      .select("*")
      .eq("team_id", teamId)
      .order("jersey_number", { ascending: true })

    if (error) {
      console.error("Error fetching players:", error)
    } else {
      setPlayers(data || [])
    }
    setLoadingPlayers(false)
  }

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team)
    fetchPlayers(team.id)
  }

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast({ title: "팀 이름을 입력해주세요", variant: "destructive" })
      return
    }

    setIsSaving(true)
    const { error } = await supabase.from("teams").insert({ name: teamName.trim() })
    setIsSaving(false)

    if (error) {
      toast({ title: "팀 생성 실패", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "팀이 생성되었습니다" })
      setIsTeamDialogOpen(false)
      setTeamName("")
      fetchTeams()
    }
  }

  const handleUpdateTeam = async () => {
    if (!editingTeam || !teamName.trim()) return

    setIsSaving(true)
    const { error } = await supabase
      .from("teams")
      .update({ name: teamName.trim() })
      .eq("id", editingTeam.id)
    setIsSaving(false)

    if (error) {
      toast({ title: "팀 수정 실패", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "팀이 수정되었습니다" })
      setIsTeamDialogOpen(false)
      setEditingTeam(null)
      setTeamName("")
      fetchTeams()
      if (selectedTeam?.id === editingTeam.id) {
        setSelectedTeam({ ...selectedTeam, name: teamName.trim() })
      }
    }
  }

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return

    setIsSaving(true)
    // Delete all players first
    await supabase.from("team_players").delete().eq("team_id", selectedTeam.id)
    const { error } = await supabase.from("teams").delete().eq("id", selectedTeam.id)
    setIsSaving(false)

    if (error) {
      toast({ title: "팀 삭제 실패", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "팀이 삭제되었습니다" })
      setIsDeleteTeamDialogOpen(false)
      setSelectedTeam(null)
      setPlayers([])
      fetchTeams()
    }
  }

  const handleCreatePlayer = async () => {
    if (!selectedTeam || !playerName.trim() || !playerNumber) {
      toast({ title: "필수 항목을 입력해주세요", variant: "destructive" })
      return
    }

    setIsSaving(true)
    const { error } = await supabase.from("team_players").insert({
      team_id: selectedTeam.id,
      name: playerName.trim(),
      jersey_number: parseInt(playerNumber),
      position: playerPosition || null,
    })
    setIsSaving(false)

    if (error) {
      const errorMessage = error.message.includes("duplicate") || error.code === "23505"
        ? "중복된 등번호입니다."
        : error.message
      toast({ title: "오류", description: errorMessage, variant: "destructive" })
    } else {
      toast({ title: "선수가 추가되었습니다" })
      setIsPlayerDialogOpen(false)
      resetPlayerForm()
      fetchPlayers(selectedTeam.id)
    }
  }

  const handleUpdatePlayer = async () => {
    if (!editingPlayer || !playerName.trim() || !playerNumber) {
      toast({
        title: "필수 항목을 입력해주세요",
        description: "선수명과 등번호는 필수입니다.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    const { error } = await supabase
      .from("team_players")
      .update({
        name: playerName.trim(),
        jersey_number: parseInt(playerNumber),
        position: playerPosition || null,
      })
      .eq("id", editingPlayer.id)
    setIsSaving(false)

    if (error) {
      const errorMessage = error.message.includes("duplicate") || error.code === "23505"
        ? "중복된 등번호입니다."
        : error.message
      toast({ title: "오류", description: errorMessage, variant: "destructive" })
    } else {
      toast({ title: "선수 정보가 수정되었습니다" })
      setIsPlayerDialogOpen(false)
      setEditingPlayer(null)
      resetPlayerForm()
      if (selectedTeam) fetchPlayers(selectedTeam.id)
    }
  }

  const handleDeletePlayer = async () => {
    if (!deletingPlayer) return

    setIsSaving(true)
    const { error } = await supabase
      .from("team_players")
      .delete()
      .eq("id", deletingPlayer.id)
    setIsSaving(false)

    if (error) {
      toast({ title: "선수 삭제 실패", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "선수가 삭제되었습니다" })
      setIsDeletePlayerDialogOpen(false)
      setDeletingPlayer(null)
      if (selectedTeam) fetchPlayers(selectedTeam.id)
    }
  }

  const openEditTeamDialog = (team: Team, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTeam(team)
    setTeamName(team.name)
    setIsTeamDialogOpen(true)
  }

  const openEditPlayerDialog = (player: TeamPlayer) => {
    setEditingPlayer(player)
    setPlayerName(player.name)
    setPlayerNumber(player.jersey_number.toString())
    setPlayerPosition((player.position as Position) || "")
    setIsPlayerDialogOpen(true)
  }

  const openDeletePlayerDialog = (player: TeamPlayer) => {
    setDeletingPlayer(player)
    setIsDeletePlayerDialogOpen(true)
  }

  const resetPlayerForm = () => {
    setPlayerName("")
    setPlayerNumber("")
    setPlayerPosition("")
    setEditingPlayer(null)
  }

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/manager")}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">팀 관리</h1>
            <p className="text-xs text-muted-foreground">팀 및 선수 명단 관리</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Teams List */}
        <div className="lg:w-80 lg:border-r border-border">
          <div className="px-4 py-3 bg-secondary/30 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">팀 목록</h2>
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={() => {
                setEditingTeam(null)
                setTeamName("")
                setIsTeamDialogOpen(true)
              }}
            >
              <Plus className="size-4" />
              팀 추가
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              등록된 팀이 없습니다
            </div>
          ) : (
            <div className="divide-y divide-border">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors ${
                    selectedTeam?.id === team.id ? "bg-secondary/50" : ""
                  }`}
                  onClick={() => handleSelectTeam(team)}
                >
                  <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Users className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{team.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={(e) => openEditTeamDialog(team, e)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Players List */}
        <div className="flex-1 flex flex-col">
          {selectedTeam ? (
            <>
              <div className="px-4 py-3 bg-secondary/30 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{selectedTeam.name}</h2>
                  <p className="text-xs text-muted-foreground">{players.length}명의 선수</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8"
                    onClick={() => setIsDeleteTeamDialogOpen(true)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => {
                      resetPlayerForm()
                      setIsPlayerDialogOpen(true)
                    }}
                  >
                    <Plus className="size-4" />
                    선수 추가
                  </Button>
                </div>
              </div>

              {loadingPlayers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : players.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  등록된 선수가 없습니다
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 bg-card border border-border rounded-lg p-3"
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
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEditPlayerDialog(player)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => openDeletePlayerDialog(player)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              좌측에서 팀을 선택해주세요
            </div>
          )}
        </div>
      </div>

      {/* Team Dialog */}
      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? "팀 수정" : "새 팀 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>팀 이름</Label>
              <Input
                placeholder="팀 이름 입력"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingTeam ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Player Dialog */}
      <Dialog open={isPlayerDialogOpen} onOpenChange={setIsPlayerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlayer ? "선수 수정" : "선수 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>선수명 *</Label>
              <Input
                placeholder="선수 이름"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>등번호 *</Label>
              <Input
                type="number"
                placeholder="등번호"
                value={playerNumber}
                onChange={(e) => setPlayerNumber(e.target.value)}
                min={1}
                max={99}
              />
            </div>
            <div className="space-y-2">
              <Label>포지션</Label>
              <Select
                value={playerPosition}
                onValueChange={(value) => setPlayerPosition(value as Position)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="포지션 선택 (선택사항)" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPlayerDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={editingPlayer ? handleUpdatePlayer : handleCreatePlayer}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingPlayer ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Dialog */}
      <AlertDialog open={isDeleteTeamDialogOpen} onOpenChange={setIsDeleteTeamDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>팀 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedTeam?.name} 팀을 삭제하시겠습니까?
              <br />
              팀에 속한 모든 선수 정보도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteTeam}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Player Dialog */}
      <AlertDialog open={isDeletePlayerDialogOpen} onOpenChange={setIsDeletePlayerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>선수 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPlayer?.name} 선수를 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeletePlayer}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
