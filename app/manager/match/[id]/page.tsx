"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useCallback, useMemo } from "react"
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
  Undo2,
} from "lucide-react"
import type { Match, MatchEvent, Lineup } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

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
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string
  const supabase = useMemo(() => createClient(), [])

  const [match, setMatch] = useState<Match | null>(null)
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [players, setPlayers] = useState<{ home: Player[]; away: Player[] }>({ home: [], away: [] })
  const [teamNames, setTeamNames] = useState<{ home: string; away: string }>({ home: "", away: "" })
  const [loading, setLoading] = useState(true)
  const [showThumbnail, setShowThumbnail] = useState(false)
  const { toast } = useToast()

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
  const [lastTimeRecord, setLastTimeRecord] = useState<{ type: TimeType; eventId: string } | null>(null)

  // Penalty shootout state
  const [showPenaltyPanel, setShowPenaltyPanel] = useState(false)
  const [penaltyFirstTeam, setPenaltyFirstTeam] = useState<"home" | "away">("home")
  const [penaltyKicks, setPenaltyKicks] = useState<PenaltyKick[]>([])
  const [currentPenaltyRound, setCurrentPenaltyRound] = useState(1)
  const [currentPenaltyTeam, setCurrentPenaltyTeam] = useState<"first" | "second">("first")

  // Auth guard
  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push("/login")
    }
  }, [isLoading, user, router])

  // Fetch data
  useEffect(() => {
    if (isLoading || !user) return

    async function fetchData() {
      const [matchResult, eventsResult] = await Promise.all([
        supabase.from("matches").select("*").eq("id", matchId).single(),
        supabase.from("match_events").select("*").eq("match_id", matchId).order("minute", { ascending: false }),
      ])

      if (matchResult.data) {
        setMatch(matchResult.data)
        // Fetch team names
        const homeTeamPromise = matchResult.data.home_team_id
          ? supabase.from("teams").select("name").eq("id", matchResult.data.home_team_id).single()
          : Promise.resolve({ data: null })
        const awayTeamPromise = matchResult.data.away_team_id
          ? supabase.from("teams").select("name").eq("id", matchResult.data.away_team_id).single()
          : Promise.resolve({ data: null })
        const [homeTeamResult, awayTeamResult] = await Promise.all([homeTeamPromise, awayTeamPromise])
        setTeamNames({
          home: homeTeamResult.data?.name || matchResult.data.home_team || "홈팀",
          away: awayTeamResult.data?.name || matchResult.data.away_team || "원정팀",
        })
      }
      if (eventsResult.data) {
        setEvents(eventsResult.data)
      }

      const { data: lineupData } = await supabase
        .from("match_lineups")
        .select("id, team_side")
        .eq("match_id", matchId)

      const homePlayers: Player[] = []
      const awayPlayers: Player[] = []

      if (lineupData?.length) {
        const lineupIds = lineupData.map((lineup) => lineup.id)
        const { data: lineupPlayersData } = await supabase
          .from("match_lineup_players")
          .select("id, match_lineup_id, lineup_role, team_player!inner(name, jersey_number)")
          .in("match_lineup_id", lineupIds)

        lineupPlayersData?.forEach((lp: any) => {
          const lineup = lineupData.find((l: any) => l.id === lp.match_lineup_id)
          if (!lineup) return

          const player = {
            id: lp.id,
            name: lp.team_player?.name || "",
            number: lp.team_player?.jersey_number || 0,
          }

          if (lineup.team_side === "HOME") {
            homePlayers.push(player)
          } else {
            awayPlayers.push(player)
          }
        })
      }

      setPlayers({ home: homePlayers, away: awayPlayers })
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
  }, [isLoading, user, matchId, supabase])

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
    let assistPlayerId = null
    let assistPlayerName = null
    let substitutedInPlayerId = null
    let substitutedInPlayerName = null
    let substitutedOutPlayerId = null
    let substitutedOutPlayerName = null

    if (activePanel === "goal" && selectedAssistPlayer && selectedAssistPlayer !== "none") {
      const assistPlayer = teamPlayers.find((p) => p.id === selectedAssistPlayer)
      if (assistPlayer) {
        description = `어시스트: ${assistPlayer.name}`
        assistPlayerId = assistPlayer.id
        assistPlayerName = assistPlayer.name
      }
    }
    if (activePanel === "substitution" && selectedPlayerOut) {
      const playerOut = teamPlayers.find((p) => p.id === selectedPlayerOut)
      if (playerOut) {
        description = playerOut.name
        substitutedInPlayerId = player.id
        substitutedInPlayerName = player.name
        substitutedOutPlayerId = playerOut.id
        substitutedOutPlayerName = playerOut.name
      }
    }

    const { error } = await supabase.from("match_events").insert({
      match_id: matchId,
      event_type: eventType,
      team_side: selectedTeam.toUpperCase(),
      player_name: player.name,
      player_id: player.id,
      minute,
      description,
      assist_player_name: assistPlayerName,
      assist_player_id: assistPlayerId,
      substituted_in_player_name: substitutedInPlayerName,
      substituted_in_player_id: substitutedInPlayerId,
      substituted_out_player_name: substitutedOutPlayerName,
      substituted_out_player_id: substitutedOutPlayerId,
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

  const handleStartMatch = async () => {
    const { error } = await supabase
      .from("matches")
      .update({ status: "LIVE" })
      .eq("id", matchId)

    if (error) {
      toast({
        title: "경기 시작 실패",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({ title: "경기가 시작되었습니다" })
      setMatch((prev) => prev ? { ...prev, status: "LIVE" } : null)
    }
  }

  const handleEndMatch = async () => {
    const { error } = await supabase
      .from("matches")
      .update({ status: "ENDED" })
      .eq("id", matchId)

    if (error) {
      toast({
        title: "경기 종료 실패",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({ title: "경기가 종료되었습니다" })
      setMatch((prev) => prev ? { ...prev, status: "ENDED" } : null)
    }
  }

  const handleSetTime = async (timeType: TimeType) => {
    // 순서 검증
    const timeOrder: TimeType[] = [
      "first_half_start",
      "first_half_end",
      "second_half_start",
      "second_half_end",
      "extra_start",
      "extra_end",
    ]
    const currentIndex = timeOrder.indexOf(timeType)
    
    // 이전 단계가 완료되었는지 확인
    for (let i = 0; i < currentIndex; i++) {
      if (!matchTimes[timeOrder[i]]) {
        const labels: Record<TimeType, string> = {
          first_half_start: "전반 시작",
          first_half_end: "전반 종료",
          second_half_start: "후반 시작",
          second_half_end: "후반 종료",
          extra_start: "연장 시작",
          extra_end: "연장 종료",
        }
        toast({
          title: "순서 오류",
          description: `${labels[timeOrder[i]]}을(를) 먼저 기록해주세요.`,
          variant: "destructive",
        })
        return
      }
    }

    const now = new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    })
    setMatchTimes((prev) => ({ ...prev, [timeType]: now }))

    // 이벤트 타임라인에 기록
    const timeLabels: Record<TimeType, string> = {
      first_half_start: "전반 시작",
      first_half_end: "전반 종료",
      second_half_start: "후반 시작",
      second_half_end: "후반 종료",
      extra_start: "연장 시작",
      extra_end: "연장 종료",
    }

    const minuteValues: Record<TimeType, number> = {
      first_half_start: 0,
      first_half_end: 45,
      second_half_start: 45,
      second_half_end: 90,
      extra_start: 90,
      extra_end: 120,
    }

    const { data: insertedEvent } = await supabase.from("match_events").insert({
      match_id: matchId,
      event_type: "time_record",
      team_side: "HOME",
      player_name: timeLabels[timeType],
      minute: minuteValues[timeType],
      description: now,
    }).select().single()

    if (insertedEvent) {
      setLastTimeRecord({ type: timeType, eventId: insertedEvent.id })
    }

    // 이벤트 목록 새로고침
    const { data } = await supabase
      .from("match_events")
      .select("*")
      .eq("match_id", matchId)
      .order("minute", { ascending: false })
      .order("created_at", { ascending: false })
    if (data) setEvents(data)
  }

  const handleUndoTimeRecord = async () => {
    if (!lastTimeRecord) return

    // DB에서 이벤트 삭제
    await supabase.from("match_events").delete().eq("id", lastTimeRecord.eventId)

    // 로컬 상태 초기화
    setMatchTimes((prev) => ({ ...prev, [lastTimeRecord.type]: "" }))
    setLastTimeRecord(null)

    // 이벤트 목록 새로고침
    const { data } = await supabase
      .from("match_events")
      .select("*")
      .eq("match_id", matchId)
      .order("minute", { ascending: false })
      .order("created_at", { ascending: false })
    if (data) setEvents(data)
  }

  const handlePenaltyResult = (result: "success" | "fail") => {
    // 현재 키커 결과 기록
    setPenaltyKicks((prev) =>
      prev.map((kick) =>
        kick.order === currentPenaltyRound && kick.team === currentPenaltyTeam
          ? { ...kick, result }
          : kick
      )
    )

    // 다음 키커로 자동 이동
    if (currentPenaltyTeam === "first") {
      // 선공 → 후공
      setCurrentPenaltyTeam("second")
    } else {
      // 후공 → 다음 라운드 선공
      const nextRound = currentPenaltyRound + 1
      // 새 라운드 추가 (기존에 없으면)
      const hasNextRound = penaltyKicks.some((k) => k.order === nextRound)
      if (!hasNextRound) {
        setPenaltyKicks((prev) => [
          ...prev,
          { order: nextRound, team: "first", result: null },
          { order: nextRound, team: "second", result: null },
        ])
      }
      setCurrentPenaltyRound(nextRound)
      setCurrentPenaltyTeam("first")
    }
  }

  const handleUndoPenalty = () => {
    // 이전 키커로 되돌리기
    if (currentPenaltyTeam === "second") {
      // 후공 → 선공으로 되돌리기
      const firstKick = penaltyKicks.find(
        (k) => k.order === currentPenaltyRound && k.team === "first"
      )
      if (firstKick?.result) {
        setPenaltyKicks((prev) =>
          prev.map((kick) =>
            kick.order === currentPenaltyRound && kick.team === "first"
              ? { ...kick, result: null }
              : kick
          )
        )
        setCurrentPenaltyTeam("first")
      }
    } else if (currentPenaltyRound > 1) {
      // 선공 → ���전 라운드 후공으로 되돌리기
      const prevRound = currentPenaltyRound - 1
      const secondKick = penaltyKicks.find(
        (k) => k.order === prevRound && k.team === "second"
      )
      if (secondKick?.result) {
        setPenaltyKicks((prev) =>
          prev.map((kick) =>
            kick.order === prevRound && kick.team === "second"
              ? { ...kick, result: null }
              : kick
          )
        )
        setCurrentPenaltyRound(prevRound)
        setCurrentPenaltyTeam("second")
      }
    }
  }

  const canUndoPenalty = () => {
    if (currentPenaltyTeam === "second") {
      const firstKick = penaltyKicks.find(
        (k) => k.order === currentPenaltyRound && k.team === "first"
      )
      return firstKick?.result !== null
    } else if (currentPenaltyRound > 1) {
      const prevSecondKick = penaltyKicks.find(
        (k) => k.order === currentPenaltyRound - 1 && k.team === "second"
      )
      return prevSecondKick?.result !== null
    }
    return false
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
      case "time_record":
        return <Timer className="size-4" />
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
      case "time_record":
        return `${event.player_name} (${event.description})`
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
  const firstTeamName = penaltyFirstTeam === "home" ? teamNames.home : teamNames.away
  const secondTeamName = penaltyFirstTeam === "home" ? teamNames.away : teamNames.home

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
          {match.status.toLowerCase() === "scheduled" && (
            <Button size="sm" onClick={handleStartMatch}>
              경기 시작
            </Button>
          )}
          <Badge className={match.status.toLowerCase() === "live" ? "bg-destructive text-destructive-foreground" : match.status.toLowerCase() === "ended" ? "bg-muted text-muted-foreground" : "bg-secondary"}>
            {match.status.toLowerCase() === "live" && (
              <span className="relative flex size-2 mr-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive-foreground opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-destructive-foreground" />
              </span>
            )}
            {match.status.toLowerCase() === "live" ? "LIVE" : match.status.toLowerCase() === "scheduled" ? "예정" : "종료"}
          </Badge>
          <div className="flex items-center gap-3">
            {match.status.toLowerCase() === "live" && (
              <Button size="sm" variant="destructive" onClick={handleEndMatch}>
                경기 종료
              </Button>
            )}
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-muted-foreground" />
              <Switch
                checked={showThumbnail}
                onCheckedChange={setShowThumbnail}
              />
            </div>
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
                {teamNames.home}
              </p>
            </div>
            <div className="px-4 text-center">
              <p className="text-3xl font-bold text-foreground">
                {match.home_score} : {match.away_score}
              </p>
              {match.status.toLowerCase() === "live" && (
                <div className="flex items-center justify-center gap-1 text-primary text-sm font-medium mt-1">
                  <Clock className="size-3" />
                  {(() => {
                    // 경기 진행 시간 계산
                    const now = new Date()
                    if (matchTimes.second_half_start && !matchTimes.second_half_end) {
                      const start = new Date(matchTimes.second_half_start)
                      const minutes = Math.floor((now.getTime() - start.getTime()) / 60000) + 45
                      return `${minutes}'`
                    } else if (matchTimes.first_half_start && !matchTimes.first_half_end) {
                      const start = new Date(matchTimes.first_half_start)
                      const minutes = Math.floor((now.getTime() - start.getTime()) / 60000)
                      return `${minutes}'`
                    } else if (matchTimes.first_half_end && !matchTimes.second_half_start) {
                      return "HT"
                    } else if (matchTimes.extra_start && !matchTimes.extra_end) {
                      const start = new Date(matchTimes.extra_start)
                      const minutes = Math.floor((now.getTime() - start.getTime()) / 60000) + 90
                      return `${minutes}'`
                    }
                    return "LIVE"
                  })()}
                </div>
              )}
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-foreground truncate">
                {teamNames.away}
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
            <div className="flex items-center gap-2">
              {lastTimeRecord && (
                <Button variant="outline" size="sm" onClick={handleUndoTimeRecord}>
                  <Undo2 className="size-4 mr-1" />
                  되돌리기
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setShowTimePanel(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* 전반 */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium text-center">전반</p>
              <Button
                variant={matchTimes.first_half_start ? "default" : "outline"}
                className="w-full h-10 text-xs"
                onClick={() => handleSetTime("first_half_start")}
              >
                {matchTimes.first_half_start ? `시작 : ${matchTimes.first_half_start}` : "시작"}
              </Button>
              <Button
                variant={matchTimes.first_half_end ? "default" : "outline"}
                className="w-full h-10 text-xs"
                onClick={() => handleSetTime("first_half_end")}
              >
                {matchTimes.first_half_end ? `종료 : ${matchTimes.first_half_end}` : "종료"}
              </Button>
            </div>
            {/* 후반 */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium text-center">후반</p>
              <Button
                variant={matchTimes.second_half_start ? "default" : "outline"}
                className="w-full h-10 text-xs"
                onClick={() => handleSetTime("second_half_start")}
              >
                {matchTimes.second_half_start ? `시작 : ${matchTimes.second_half_start}` : "시작"}
              </Button>
              <Button
                variant={matchTimes.second_half_end ? "default" : "outline"}
                className="w-full h-10 text-xs"
                onClick={() => handleSetTime("second_half_end")}
              >
                {matchTimes.second_half_end ? `종료 : ${matchTimes.second_half_end}` : "종료"}
              </Button>
            </div>
            {/* 연장 */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium text-center">연장</p>
              <Button
                variant={matchTimes.extra_start ? "default" : "outline"}
                className="w-full h-10 text-xs"
                onClick={() => handleSetTime("extra_start")}
              >
                {matchTimes.extra_start ? `시작 : ${matchTimes.extra_start}` : "시작"}
              </Button>
              <Button
                variant={matchTimes.extra_end ? "default" : "outline"}
                className="w-full h-10 text-xs"
                onClick={() => handleSetTime("extra_end")}
              >
                {matchTimes.extra_end ? `종료 : ${matchTimes.extra_end}` : "종료"}
              </Button>
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
                {teamNames.home}
              </Button>
              <Button
                variant={penaltyFirstTeam === "away" ? "default" : "outline"}
                className="h-10"
                onClick={() => setPenaltyFirstTeam("away")}
              >
                {teamNames.away}
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

          {/* Current kicker input */}
          <div className="bg-secondary/20 rounded-lg p-4 mb-4">
            <div className="text-center mb-3">
              <span className="text-sm font-bold text-primary">
                {currentPenaltyRound}번 키커
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                ({currentPenaltyTeam === "first" ? firstTeamName : secondTeamName})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                variant="outline"
                className="h-16 text-xl font-bold border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => handlePenaltyResult("success")}
              >
                O 성공
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-16 text-xl font-bold border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handlePenaltyResult("fail")}
              >
                X 실패
              </Button>
            </div>
          </div>

          {/* Undo button */}
          {canUndoPenalty() && (
            <Button
              variant="outline"
              className="w-full mb-4"
              onClick={handleUndoPenalty}
            >
              <Undo2 className="size-4 mr-2" />
              이전으로 되돌리기
            </Button>
          )}

          {/* Kick history */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium mb-2">기록</p>
            <div className="flex flex-wrap gap-1">
              {Array.from(new Set(penaltyKicks.map((k) => k.order))).map((order) => {
                const firstKick = penaltyKicks.find((k) => k.order === order && k.team === "first")
                const secondKick = penaltyKicks.find((k) => k.order === order && k.team === "second")

                return (
                  <div key={order} className="flex items-center gap-1 text-xs bg-secondary/30 px-2 py-1 rounded">
                    <span className="text-muted-foreground">{order}.</span>
                    <span className={firstKick?.result === "success" ? "text-primary font-bold" : firstKick?.result === "fail" ? "text-destructive" : "text-muted-foreground"}>
                      {firstKick?.result === "success" ? "O" : firstKick?.result === "fail" ? "X" : "-"}
                    </span>
                    <span className="text-muted-foreground">:</span>
                    <span className={secondKick?.result === "success" ? "text-primary font-bold" : secondKick?.result === "fail" ? "text-destructive" : "text-muted-foreground"}>
                      {secondKick?.result === "success" ? "O" : secondKick?.result === "fail" ? "X" : "-"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
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
                {teamNames.home}
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
                {teamNames.away}
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
                    {event.team_side === "home" ? teamNames.home : teamNames.away}
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
