"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft,
  Goal,
  Square,
  RefreshCw,
  X,
  Clock,
  Users,
  Image as ImageIcon,
  Loader2,
} from "lucide-react"
import type { Match, MatchEvent, Lineup } from "@/lib/types"

type EventType = "goal" | "yellow_card" | "red_card" | "substitution"

interface Player {
  id: string
  name: string
  number: number
}

export default function MatchControlPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string

  const [match, setMatch] = useState<Match | null>(null)
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [players, setPlayers] = useState<{ home: Player[]; away: Player[] }>({ home: [], away: [] })
  const [loading, setLoading] = useState(true)
  const [showThumbnail, setShowThumbnail] = useState(false)

  // Input panel state
  const [activePanel, setActivePanel] = useState<EventType | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away" | "">("")
  const [selectedPlayer, setSelectedPlayer] = useState("")
  const [selectedPlayerOut, setSelectedPlayerOut] = useState("")
  const [selectedAssistPlayer, setSelectedAssistPlayer] = useState("")
  const [cardType, setCardType] = useState<"yellow_card" | "red_card">("yellow_card")
  const [inputMinute, setInputMinute] = useState("")

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
      const [matchResult, eventsResult, lineupsResult] = await Promise.all([
        supabase.from("matches").select("*").eq("id", matchId).single(),
        supabase.from("match_events").select("*").eq("match_id", matchId).order("minute", { ascending: false }),
        supabase.from("lineups").select("*").eq("match_id", matchId),
      ])

      if (matchResult.data) {
        setMatch(matchResult.data)
      }
      if (eventsResult.data) {
        setEvents(eventsResult.data)
      }
      if (lineupsResult.data) {
        const homePlayers = lineupsResult.data
          .filter((l: Lineup) => l.team_side === "home")
          .map((l: Lineup) => ({ id: l.id, name: l.player_name, number: l.jersey_number }))
        const awayPlayers = lineupsResult.data
          .filter((l: Lineup) => l.team_side === "away")
          .map((l: Lineup) => ({ id: l.id, name: l.player_name, number: l.jersey_number }))
        setPlayers({ home: homePlayers, away: awayPlayers })
      }
      setLoading(false)
    }

    fetchData()

    // Subscribe to realtime updates
    const eventsChannel = supabase
      .channel(`match-events-admin-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` },
        () => {
          fetchData()
        }
      )
      .subscribe()

    const matchChannel = supabase
      .channel(`match-admin-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(eventsChannel)
      supabase.removeChannel(matchChannel)
    }
  }, [matchId])

  const getPlayers = useCallback(
    (team: "home" | "away") => {
      return team === "home" ? players.home : players.away
    },
    [players]
  )

  const resetForm = () => {
    setSelectedTeam("")
    setSelectedPlayer("")
    setSelectedPlayerOut("")
    setSelectedAssistPlayer("")
    setCardType("yellow_card")
    setInputMinute("")
    setActivePanel(null)
  }

  const handleSaveEvent = async () => {
    if (!selectedTeam || !selectedPlayer || !match) return

    const supabase = createClient()
    const minute = inputMinute ? parseInt(inputMinute) : 0
    const teamPlayers = getPlayers(selectedTeam as "home" | "away")
    const player = teamPlayers.find((p) => p.id === selectedPlayer)

    if (!player) return

    const eventType = activePanel === "yellow_card" || activePanel === "red_card" ? cardType : activePanel!

    let description = ""
    if (activePanel === "goal" && selectedAssistPlayer && selectedAssistPlayer !== "none") {
      const assistPlayer = teamPlayers.find((p) => p.id === selectedAssistPlayer)
      if (assistPlayer) {
        description = `어시스트: ${assistPlayer.name}`
      }
    }
    if (activePanel === "substitution" && selectedPlayerOut) {
      const playerOut = teamPlayers.find((p) => p.id === selectedPlayerOut)
      if (playerOut) {
        description = playerOut.name
      }
    }

    const { error } = await supabase.from("match_events").insert({
      match_id: matchId,
      event_type: eventType,
      team_side: selectedTeam,
      player_name: player.name,
      minute,
      description,
    })

    if (error) {
      console.error("Error saving event:", error)
      return
    }

    // Update score for goals
    if (activePanel === "goal") {
      const updateData = selectedTeam === "home"
        ? { home_score: match.home_score + 1 }
        : { away_score: match.away_score + 1 }

      await supabase.from("matches").update(updateData).eq("id", matchId)
    }

    resetForm()
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "goal":
        return <Goal className="size-4" />
      case "yellow_card":
        return <div className="size-3 rounded-sm bg-yellow-400" />
      case "red_card":
        return <div className="size-3 rounded-sm bg-red-500" />
      case "substitution":
        return <RefreshCw className="size-4" />
      default:
        return null
    }
  }

  const getEventLabel = (event: MatchEvent) => {
    switch (event.event_type) {
      case "goal":
        return event.description
          ? `${event.player_name} 득점 (${event.description})`
          : `${event.player_name} 득점`
      case "yellow_card":
        return `${event.player_name} 경고`
      case "red_card":
        return `${event.player_name} 퇴장`
      case "substitution":
        return event.description
          ? `${event.description} OUT / ${event.player_name} IN`
          : `${event.player_name} IN`
      default:
        return event.player_name
    }
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
      {/* Sticky Header - Score & Controls */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        {/* Top bar */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
              <ArrowLeft className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/admin/match/${matchId}/lineup`)}
            >
              <Users className="size-5" />
            </Button>
          </div>
          <Badge className={match.status === "live" ? "bg-destructive text-destructive-foreground" : "bg-secondary"}>
            {match.status === "live" && (
              <span className="relative flex size-2 mr-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive-foreground opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-destructive-foreground" />
              </span>
            )}
            {match.status === "live" ? "LIVE" : match.status === "scheduled" ? "예정" : "종료"}
          </Badge>
          <div className="flex items-center gap-2">
            <ImageIcon className="size-4 text-muted-foreground" />
            <Switch
              checked={showThumbnail}
              onCheckedChange={setShowThumbnail}
            />
          </div>
        </div>

        {/* Thumbnail overlay indicator */}
        {showThumbnail && (
          <div className="px-4 py-2 bg-accent/20 border-b border-border">
            <p className="text-xs text-accent text-center font-medium">
              썸네일 오버레이 활성화 - 시청자에게 대기 화면이 표시됩니다
            </p>
          </div>
        )}

        {/* Score display */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-foreground truncate">
                {match.home_team}
              </p>
            </div>
            <div className="px-4 text-center">
              <p className="text-3xl font-bold text-foreground">
                {match.home_score} : {match.away_score}
              </p>
              <div className="flex items-center justify-center gap-1 text-primary text-sm font-medium mt-1">
                <Clock className="size-3" />
                {match.status === "live" ? "LIVE" : match.status}
              </div>
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-foreground truncate">
                {match.away_team}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Action Buttons */}
      <div className="px-4 py-3 bg-secondary/30 border-b border-border">
        <div className="grid grid-cols-3 gap-2">
          <Button
            size="lg"
            variant={activePanel === "goal" ? "default" : "secondary"}
            className="h-14 flex-col gap-1"
            onClick={() => {
              resetForm()
              setActivePanel(activePanel === "goal" ? null : "goal")
            }}
          >
            <Goal className="size-5" />
            <span className="text-xs">득점 추가</span>
          </Button>
          <Button
            size="lg"
            variant={activePanel === "yellow_card" || activePanel === "red_card" ? "default" : "secondary"}
            className="h-14 flex-col gap-1"
            onClick={() => {
              resetForm()
              setActivePanel(activePanel === "yellow_card" || activePanel === "red_card" ? null : "yellow_card")
            }}
          >
            <Square className="size-5" />
            <span className="text-xs">경고/퇴장</span>
          </Button>
          <Button
            size="lg"
            variant={activePanel === "substitution" ? "default" : "secondary"}
            className="h-14 flex-col gap-1"
            onClick={() => {
              resetForm()
              setActivePanel(activePanel === "substitution" ? null : "substitution")
            }}
          >
            <RefreshCw className="size-5" />
            <span className="text-xs">교체 추가</span>
          </Button>
        </div>
      </div>

      {/* Input Panel */}
      {activePanel && (
        <div className="px-4 py-4 bg-card border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">
              {activePanel === "goal" && "득점 기록"}
              {(activePanel === "yellow_card" || activePanel === "red_card") && "경고/퇴장 기록"}
              {activePanel === "substitution" && "교체 기록"}
            </h3>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {/* Team Select */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedTeam === "home" ? "default" : "outline"}
                className="h-12"
                onClick={() => {
                  setSelectedTeam("home")
                  setSelectedPlayer("")
                  setSelectedPlayerOut("")
                  setSelectedAssistPlayer("")
                }}
              >
                {match.home_team}
              </Button>
              <Button
                variant={selectedTeam === "away" ? "default" : "outline"}
                className="h-12"
                onClick={() => {
                  setSelectedTeam("away")
                  setSelectedPlayer("")
                  setSelectedPlayerOut("")
                  setSelectedAssistPlayer("")
                }}
              >
                {match.away_team}
              </Button>
            </div>

            {/* Card Type (for card events) */}
            {(activePanel === "yellow_card" || activePanel === "red_card") && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={cardType === "yellow_card" ? "default" : "outline"}
                  className="h-12 gap-2"
                  onClick={() => setCardType("yellow_card")}
                >
                  <div className="size-4 rounded-sm bg-yellow-400" />
                  경고
                </Button>
                <Button
                  variant={cardType === "red_card" ? "default" : "outline"}
                  className="h-12 gap-2"
                  onClick={() => setCardType("red_card")}
                >
                  <div className="size-4 rounded-sm bg-red-500" />
                  퇴장
                </Button>
              </div>
            )}

            {/* Player Select */}
            {selectedTeam && (
              <>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger className="w-full h-12">
                    <SelectValue
                      placeholder={
                        activePanel === "goal"
                          ? "득점 선수 선택"
                          : activePanel === "substitution"
                            ? "교체 IN 선수 선택"
                            : "선수 선택"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {getPlayers(selectedTeam as "home" | "away").map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        #{player.number} {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Assist Player Select (for goals) */}
                {activePanel === "goal" && (
                  <Select value={selectedAssistPlayer} onValueChange={setSelectedAssistPlayer}>
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="어시스트 선수 선택 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">없음</SelectItem>
                      {getPlayers(selectedTeam as "home" | "away")
                        .filter((p) => p.id !== selectedPlayer)
                        .map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            #{player.number} {player.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Player Out Select (for substitution) */}
                {activePanel === "substitution" && (
                  <Select value={selectedPlayerOut} onValueChange={setSelectedPlayerOut}>
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="교체 OUT 선수 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPlayers(selectedTeam as "home" | "away")
                        .filter((p) => p.id !== selectedPlayer)
                        .map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            #{player.number} {player.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}

            {/* Minute Input */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="분"
                value={inputMinute}
                onChange={(e) => setInputMinute(e.target.value)}
                className="h-12 flex-1"
                min={1}
                max={120}
              />
            </div>

            {/* Save Button */}
            <Button
              className="w-full h-14 text-base font-semibold"
              disabled={
                !selectedTeam ||
                !selectedPlayer ||
                (activePanel === "substitution" && !selectedPlayerOut)
              }
              onClick={handleSaveEvent}
            >
              저장하기
            </Button>
          </div>
        </div>
      )}

      {/* Event Timeline */}
      <main className="flex-1 px-4 py-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          이벤트 타임라인
        </h3>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            아직 기록된 이벤트가 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 bg-card border border-border rounded-lg p-3"
              >
                <div className="flex items-center justify-center size-8 rounded-full bg-secondary">
                  {getEventIcon(event.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {getEventLabel(event)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.team_side === "home" ? match.home_team : match.away_team}
                  </p>
                </div>
                <div className="text-sm font-medium text-primary">{event.minute}&apos;</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
