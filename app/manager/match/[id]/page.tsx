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
  Timer,
  CircleDot,
} from "lucide-react"
import type { Match, MatchEvent, Lineup } from "@/lib/types"

type EventType = "goal" | "yellow_card" | "red_card" | "substitution"

interface Player {
  id: string
  name: string
  number: number
}

type TimeType = "first_half_start" | "first_half_end" | "second_half_start" | "second_half_end" | "extra_start" | "extra_end"

interface MatchTimes {
  first_half_start: string
  first_half_end: string
  second_half_start: string
  second_half_end: string
  extra_start: string
  extra_end: string
}

interface PenaltyKick {
  order: number
  team: "first" | "second"
  result: "success" | "fail" | null
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

  // Time section state
  const [showTimePanel, setShowTimePanel] = useState(false)
  const [matchTimes, setMatchTimes] = useState<MatchTimes>({
    first_half_start: "",
    first_half_end: "",
    second_half_start: "",
    second_half_end: "",
    extra_start: "",
    extra_end: "",
  })

  // Penalty shootout state
  const [showPenaltyPanel, setShowPenaltyPanel] = useState(false)
  const [penaltyFirstTeam, setPenaltyFirstTeam] = useState<"home" | "away">("home")
  const [penaltyKicks, setPenaltyKicks] = useState<PenaltyKick[]>([])

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

  // Initialize penalty kicks
  useEffect(() => {
    if (penaltyKicks.length === 0) {
      const initialKicks: PenaltyKick[] = []
      for (let i = 1; i <= 5; i++) {
        initialKicks.push({ order: i, team: "first", result: null })
        initialKicks.push({ order: i, team: "second", result: null })
      }
      setPenaltyKicks(initialKicks)
    }
  }, [penaltyKicks.length])

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

  const handleSetTime = (timeType: TimeType) => {
    const now = new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    })
    setMatchTimes((prev) => ({ ...prev, [timeType]: now }))
  }

  const handlePenaltyResult = (order: number, team: "first" | "second", result: "success" | "fail") => {
    setPenaltyKicks((prev) =>
      prev.map((kick) =>
        kick.order === order && kick.team === team ? { ...kick, result } : kick
      )
    )
  }

  const addPenaltyRound = () => {
    const maxOrder = Math.max(...penaltyKicks.map((k) => k.order))
    setPenaltyKicks((prev) => [
      ...prev,
      { order: maxOrder + 1, team: "first", result: null },
      { order: maxOrder + 1, team: "second", result: null },
    ])
  }

  const getPenaltyScore = () => {
    const firstTeamScore = penaltyKicks.filter((k) => k.team === "first" && k.result === "success").length
    const secondTeamScore = penaltyKicks.filter((k) => k.team === "second" && k.result === "success").length
    return { first: firstTeamScore, second: secondTeamScore }
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

  const penaltyScore = getPenaltyScore()
  const firstTeamName = penaltyFirstTeam === "home" ? match.home_team : match.away_team
  const secondTeamName = penaltyFirstTeam === "home" ? match.away_team : match.home_team

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header - Score & Controls */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        {/* Top bar */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => router.push("/manager")}>
              <ArrowLeft className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/manager/match/${matchId}/lineup`)}
            >
              <Users className="size-5" />
            </Button>
          </div>
          <Badge className={match.status.toLowerCase() === "live" ? "bg-destructive text-destructive-foreground" : "bg-secondary"}>
            {match.status.toLowerCase() === "live" && (
              <span className="relative flex size-2 mr-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive-foreground opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-destructive-foreground" />
              </span>
            )}
            {match.status.toLowerCase() === "live" ? "LIVE" : match.status.toLowerCase() === "scheduled" ? "예정" : "종료"}
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
                {match.status.toLowerCase() === "live" ? "LIVE" : match.status}
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
        <div className="grid grid-cols-3 gap-2 mb-2">
          <Button
            size="lg"
            variant={activePanel === "goal" ? "default" : "secondary"}
            className="h-14 flex-col gap-1"
            onClick={() => {
              resetForm()
              setActivePanel(activePanel === "goal" ? null : "goal")
              setShowTimePanel(false)
              setShowPenaltyPanel(false)
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
              setShowTimePanel(false)
              setShowPenaltyPanel(false)
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
              setShowTimePanel(false)
              setShowPenaltyPanel(false)
            }}
          >
            <RefreshCw className="size-5" />
            <span className="text-xs">교체 추가</span>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            variant={showTimePanel ? "default" : "secondary"}
            className="h-12 flex-col gap-1"
            onClick={() => {
              resetForm()
              setShowTimePanel(!showTimePanel)
              setShowPenaltyPanel(false)
            }}
          >
            <Timer className="size-5" />
            <span className="text-xs">시간 입력</span>
          </Button>
          <Button
            size="lg"
            variant={showPenaltyPanel ? "default" : "secondary"}
            className="h-12 flex-col gap-1"
            onClick={() => {
              resetForm()
              setShowPenaltyPanel(!showPenaltyPanel)
              setShowTimePanel(false)
            }}
          >
            <CircleDot className="size-5" />
            <span className="text-xs">승부차기</span>
          </Button>
        </div>
      </div>

      {/* Time Input Panel */}
      {showTimePanel && (
        <div className="px-4 py-4 bg-card border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">경기 시간 기록</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowTimePanel(false)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">전반</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 flex-col"
                    onClick={() => handleSetTime("first_half_start")}
                  >
                    <span className="text-xs">시작</span>
                    <span className="text-sm font-bold text-primary">
                      {matchTimes.first_half_start || "--:--"}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 flex-col"
                    onClick={() => handleSetTime("first_half_end")}
                  >
                    <span className="text-xs">종료</span>
                    <span className="text-sm font-bold text-primary">
                      {matchTimes.first_half_end || "--:--"}
                    </span>
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">후반</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 flex-col"
                    onClick={() => handleSetTime("second_half_start")}
                  >
                    <span className="text-xs">시작</span>
                    <span className="text-sm font-bold text-primary">
                      {matchTimes.second_half_start || "--:--"}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 flex-col"
                    onClick={() => handleSetTime("second_half_end")}
                  >
                    <span className="text-xs">종료</span>
                    <span className="text-sm font-bold text-primary">
                      {matchTimes.second_half_end || "--:--"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">연장전</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12 flex-col"
                  onClick={() => handleSetTime("extra_start")}
                >
                  <span className="text-xs">시작</span>
                  <span className="text-sm font-bold text-primary">
                    {matchTimes.extra_start || "--:--"}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12 flex-col"
                  onClick={() => handleSetTime("extra_end")}
                >
                  <span className="text-xs">종료</span>
                  <span className="text-sm font-bold text-primary">
                    {matchTimes.extra_end || "--:--"}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Penalty Shootout Panel */}
      {showPenaltyPanel && (
        <div className="px-4 py-4 bg-card border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">승부차기 기록</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowPenaltyPanel(false)}>
              <X className="size-4" />
            </Button>
          </div>

          {/* First kick team selection */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">선공 팀</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={penaltyFirstTeam === "home" ? "default" : "outline"}
                className="h-10"
                onClick={() => setPenaltyFirstTeam("home")}
              >
                {match.home_team}
              </Button>
              <Button
                variant={penaltyFirstTeam === "away" ? "default" : "outline"}
                className="h-10"
                onClick={() => setPenaltyFirstTeam("away")}
              >
                {match.away_team}
              </Button>
            </div>
          </div>

          {/* Score display */}
          <div className="flex items-center justify-center gap-4 mb-4 py-3 bg-secondary/30 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{firstTeamName} (선공)</p>
              <p className="text-2xl font-bold text-primary">{penaltyScore.first}</p>
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{secondTeamName} (후공)</p>
              <p className="text-2xl font-bold text-primary">{penaltyScore.second}</p>
            </div>
          </div>

          {/* Penalty kicks table */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {Array.from(new Set(penaltyKicks.map((k) => k.order))).map((order) => {
              const firstKick = penaltyKicks.find((k) => k.order === order && k.team === "first")
              const secondKick = penaltyKicks.find((k) => k.order === order && k.team === "second")

              return (
                <div key={order} className="flex items-center gap-2 py-2 border-b border-border last:border-b-0">
                  <span className="text-xs text-muted-foreground w-8 text-center">{order}번</span>

                  {/* First team kick */}
                  <div className="flex-1 flex gap-1">
                    <Button
                      size="sm"
                      variant={firstKick?.result === "success" ? "default" : "outline"}
                      className={`flex-1 h-9 ${firstKick?.result === "success" ? "bg-primary" : ""}`}
                      onClick={() => handlePenaltyResult(order, "first", "success")}
                    >
                      O
                    </Button>
                    <Button
                      size="sm"
                      variant={firstKick?.result === "fail" ? "destructive" : "outline"}
                      className="flex-1 h-9"
                      onClick={() => handlePenaltyResult(order, "first", "fail")}
                    >
                      X
                    </Button>
                  </div>

                  <span className="text-xs text-muted-foreground">vs</span>

                  {/* Second team kick */}
                  <div className="flex-1 flex gap-1">
                    <Button
                      size="sm"
                      variant={secondKick?.result === "success" ? "default" : "outline"}
                      className={`flex-1 h-9 ${secondKick?.result === "success" ? "bg-primary" : ""}`}
                      onClick={() => handlePenaltyResult(order, "second", "success")}
                    >
                      O
                    </Button>
                    <Button
                      size="sm"
                      variant={secondKick?.result === "fail" ? "destructive" : "outline"}
                      className="flex-1 h-9"
                      onClick={() => handlePenaltyResult(order, "second", "fail")}
                    >
                      X
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <Button variant="outline" className="w-full mt-3" onClick={addPenaltyRound}>
            라운드 추가
          </Button>
        </div>
      )}

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
