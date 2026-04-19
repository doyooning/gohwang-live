"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast"
import {
  LogOut,
  Play,
  Settings,
  Users,
  Calendar,
  Radio,
  Loader2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Match, Team } from "@/lib/types"

interface MatchFormData {
  title: string
  home_team_id: string
  away_team_id: string
  match_date: string
  match_time: string
  location: string
  youtube_url: string
}

const initialFormData: MatchFormData = {
  title: "",
  home_team_id: "",
  away_team_id: "",
  match_date: "",
  match_time: "",
  location: "",
  youtube_url: "",
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export default function AdminPage() {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [formData, setFormData] = useState<MatchFormData>(initialFormData)
  const [isSaving, setIsSaving] = useState(false)

  const supabase = useMemo(() => createClient() as any, [])

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push("/login")
      return
    }

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

    async function fetchTeams() {
      const { data } = await supabase
        .from("teams")
        .select("*")
        .order("name", { ascending: true })
      if (data) setTeams(data)
    }

    fetchMatches()
    fetchTeams()

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
  }, [isLoading, user, router, supabase])

  const handleCreateMatch = async () => {
    if (!formData.title || !formData.home_team_id || !formData.away_team_id || !formData.match_date || !formData.match_time) {
      toast({
        title: "필수 항목을 입력해주세요",
        description: "경기명, 홈팀, 원정팀, 날짜, 시간은 필수입니다.",
        variant: "destructive",
      })
      return
    }

    const matchDateTime = new Date(`${formData.match_date}T${formData.match_time}`)
    if (Number.isNaN(matchDateTime.getTime())) {
      toast({
        title: "경기 생성 실패",
        description: "날짜/시간 형식이 올바르지 않습니다.",
        variant: "destructive",
      })
      return
    }

    if (formData.home_team_id === formData.away_team_id) {
      toast({
        title: "경기 생성 실패",
        description: "홈팀과 원정팀은 서로 다른 팀이어야 합니다.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    const homeTeam = teams.find((t) => t.id === formData.home_team_id)
    const awayTeam = teams.find((t) => t.id === formData.away_team_id)

    try {
      const { error } = await withTimeout(
        Promise.resolve(
          supabase.from("matches").insert({
            title: formData.title,
            home_team_id: formData.home_team_id,
            away_team_id: formData.away_team_id,
            match_date: matchDateTime.toISOString(),
            location: formData.location || null,
            youtube_url: formData.youtube_url || null,
            status: "SCHEDULED",
            home_score: 0,
            away_score: 0,
          })
        ),
        15000,
        "create match"
      )

      if (error) {
        toast({
          title: "경기 생성 실패",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "경기가 생성되었습니다",
          description: `${homeTeam?.name || "홈팀"} vs ${awayTeam?.name || "원정팀"}`,
        })
        setIsCreateDialogOpen(false)
        setFormData(initialFormData)
      }
    } catch (error) {
      console.error("Error creating match:", error)
      toast({
        title: "경기 생성 실패",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditMatch = async () => {
    if (!selectedMatch) return

    if (!formData.title || !formData.home_team_id || !formData.away_team_id || !formData.match_date || !formData.match_time) {
      toast({
        title: "필수 항목을 입력해주세요",
        description: "경기명, 홈팀, 원정팀, 날짜, 시간은 필수입니다.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    const matchDateTime = new Date(`${formData.match_date}T${formData.match_time}`)
    const homeTeam = teams.find((t) => t.id === formData.home_team_id)
    const awayTeam = teams.find((t) => t.id === formData.away_team_id)

    const { error } = await supabase
      .from("matches")
      .update({
        title: formData.title,
        home_team_id: formData.home_team_id,
        away_team_id: formData.away_team_id,
        match_date: matchDateTime.toISOString(),
        location: formData.location || null,
        youtube_url: formData.youtube_url || null,
      })
      .eq("id", selectedMatch.id)

    setIsSaving(false)

    if (error) {
      toast({
        title: "경기 수정 실패",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "경기가 수정되었습니다",
        description: `${homeTeam?.name || "홈팀"} vs ${awayTeam?.name || "원정팀"}`,
      })
      setIsEditDialogOpen(false)
      setSelectedMatch(null)
      setFormData(initialFormData)
    }
  }

  const handleDeleteMatch = async () => {
    if (!selectedMatch) return

    setIsSaving(true)

    // Delete related data first
    await supabase.from("match_events").delete().eq("match_id", selectedMatch.id)
    // Delete lineup players first, then lineups
    const { data: lineups } = await supabase.from("match_lineups").select("id").eq("match_id", selectedMatch.id)
    if (lineups) {
      for (const lineup of lineups) {
        await supabase.from("match_lineup_players").delete().eq("match_lineup_id", lineup.id)
      }
    }
    await supabase.from("match_lineups").delete().eq("match_id", selectedMatch.id)

    const { error } = await supabase.from("matches").delete().eq("id", selectedMatch.id)

    setIsSaving(false)

    const homeTeam = teams.find((t) => t.id === selectedMatch.home_team_id)
    const awayTeam = teams.find((t) => t.id === selectedMatch.away_team_id)

    if (error) {
      toast({
        title: "경기 삭제 실패",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "경기가 삭제되었습니다",
        description: `${homeTeam?.name || selectedMatch.home_team || "홈팀"} vs ${awayTeam?.name || selectedMatch.away_team || "원정팀"}`,
      })
      setIsDeleteDialogOpen(false)
      setSelectedMatch(null)
    }
  }

  const openEditDialog = (match: Match) => {
    const matchDate = new Date(match.match_date)
    setSelectedMatch(match)
    setFormData({
      title: match.title || "",
      home_team_id: match.home_team_id || "",
      away_team_id: match.away_team_id || "",
      match_date: matchDate.toISOString().split("T")[0],
      match_time: matchDate.toTimeString().slice(0, 5),
      location: match.location || "",
      youtube_url: match.youtube_url || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (match: Match) => {
    setSelectedMatch(match)
    setIsDeleteDialogOpen(true)
  }

  const getTeamName = (teamId: string | null | undefined, fallback?: string) => {
    if (!teamId) return fallback || "미지정"
    const team = teams.find((t) => t.id === teamId)
    return team?.name || fallback || "미지정"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/manager/teams")}>
              <Users className="size-4 mr-1" />
              팀 관리
            </Button>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="size-5" />
            </Button>
          </div>
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground">경기 목록</h2>
          <Button size="sm" className="h-8 gap-1" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="size-4" />
            경기 생성
          </Button>
        </div>

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
                  <div className="flex items-center gap-2">
                    {getStatusBadge(match.status)}
                    {match.title && (
                      <span className="text-xs text-muted-foreground">{match.title}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(match.match_date).toLocaleDateString("ko-KR")}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 text-center">
                    <p className="text-sm font-medium text-foreground truncate">{getTeamName(match.home_team_id, match.home_team)}</p>
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
                    <p className="text-sm font-medium text-foreground truncate">{getTeamName(match.away_team_id, match.away_team)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">{match.location}</p>
                  <div className="flex items-center gap-2">
                    {/* Edit and Delete buttons */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => openEditDialog(match)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(match)}
                    >
                      <Trash2 className="size-4" />
                    </Button>

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

      {/* Create Match Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 경기 생성</DialogTitle>
            <DialogDescription>경기 정보를 입력하여 새 경기를 생성합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">경기명</Label>
              <Input
                id="title"
                placeholder="예: 준결승 1경기"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>홈팀 *</Label>
                <Select
                  value={formData.home_team_id}
                  onValueChange={(value) => setFormData({ ...formData, home_team_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="홈팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>원정팀 *</Label>
                <Select
                  value={formData.away_team_id}
                  onValueChange={(value) => setFormData({ ...formData, away_team_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="원정팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="match_date">경기 날짜 *</Label>
                <Input
                  id="match_date"
                  type="date"
                  value={formData.match_date}
                  onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="match_time">경기 시간 *</Label>
                <Input
                  id="match_time"
                  type="time"
                  value={formData.match_time}
                  onChange={(e) => setFormData({ ...formData, match_time: e.target.value })}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">경기장</Label>
              <Input
                id="location"
                placeholder="경기장 위치"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube_url">YouTube 라이브 URL</Label>
              <Input
                id="youtube_url"
                placeholder="https://youtube.com/watch?v=..."
                value={formData.youtube_url}
                onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreateMatch} disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>경기 수정</DialogTitle>
            <DialogDescription>경기 정보를 수정합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_title">경기명</Label>
              <Input
                id="edit_title"
                placeholder="예: 준결승 1경기"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>홈팀 *</Label>
                <Select
                  value={formData.home_team_id}
                  onValueChange={(value) => setFormData({ ...formData, home_team_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="홈팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>원정팀 *</Label>
                <Select
                  value={formData.away_team_id}
                  onValueChange={(value) => setFormData({ ...formData, away_team_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="원정팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_match_date">경기 날짜 *</Label>
                <Input
                  id="edit_match_date"
                  type="date"
                  value={formData.match_date}
                  onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_match_time">경기 시간 *</Label>
                <Input
                  id="edit_match_time"
                  type="time"
                  value={formData.match_time}
                  onChange={(e) => setFormData({ ...formData, match_time: e.target.value })}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_location">경기장</Label>
              <Input
                id="edit_location"
                placeholder="경기장 위치"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_youtube_url">YouTube 라이브 URL</Label>
              <Input
                id="edit_youtube_url"
                placeholder="https://youtube.com/watch?v=..."
                value={formData.youtube_url}
                onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleEditMatch} disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>경기를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMatch && (
                <>
                  <span className="font-semibold text-foreground">
                    {selectedMatch.home_team} vs {selectedMatch.away_team}
                  </span>
                  <br />
                  이 작업은 되돌릴 수 없습니다. 경기와 관련된 모든 기록(이벤트, 라인업)이 영구적으로 삭제됩니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMatch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
