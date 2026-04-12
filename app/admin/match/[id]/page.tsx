"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
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
import {
  ArrowLeft,
  Goal,
  Square,
  RefreshCw,
  Play,
  Pause,
  X,
  Clock,
  Users,
} from "lucide-react"

// Types
type EventType = "goal" | "yellow" | "red" | "substitution"

interface MatchEvent {
  id: string
  type: EventType
  team: "home" | "away"
  minute: number
  playerName: string
  playerOutName?: string
}

interface Player {
  id: string
  name: string
  number: number
}

// Mock data
const MATCH_DATA = {
  id: "match-1",
  homeTeam: "FC 서울 유스",
  awayTeam: "수원 삼성 유스",
  homeScore: 2,
  awayScore: 1,
  status: "live" as const,
  currentTime: 67,
}

const HOME_PLAYERS: Player[] = [
  { id: "h1", name: "김민수", number: 1 },
  { id: "h2", name: "이준호", number: 2 },
  { id: "h3", name: "박지훈", number: 3 },
  { id: "h4", name: "최영준", number: 4 },
  { id: "h5", name: "정우성", number: 5 },
  { id: "h6", name: "강현우", number: 6 },
  { id: "h7", name: "윤성민", number: 7 },
  { id: "h8", name: "임재현", number: 8 },
  { id: "h9", name: "한동훈", number: 9 },
  { id: "h10", name: "오승환", number: 10 },
  { id: "h11", name: "신태용", number: 11 },
]

const AWAY_PLAYERS: Player[] = [
  { id: "a1", name: "조현우", number: 1 },
  { id: "a2", name: "김진수", number: 2 },
  { id: "a3", name: "이용", number: 3 },
  { id: "a4", name: "김영권", number: 4 },
  { id: "a5", name: "황인범", number: 5 },
  { id: "a6", name: "정우영", number: 6 },
  { id: "a7", name: "손흥민", number: 7 },
  { id: "a8", name: "이강인", number: 8 },
  { id: "a9", name: "황희찬", number: 9 },
  { id: "a10", name: "조규성", number: 10 },
  { id: "a11", name: "김민재", number: 11 },
]

const INITIAL_EVENTS: MatchEvent[] = [
  { id: "e1", type: "goal", team: "home", minute: 23, playerName: "한동훈" },
  { id: "e2", type: "yellow", team: "away", minute: 35, playerName: "황인범" },
  { id: "e3", type: "goal", team: "away", minute: 41, playerName: "손흥민" },
  { id: "e4", type: "goal", team: "home", minute: 58, playerName: "오승환" },
]

export default function MatchControlPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()

  const [matchTime, setMatchTime] = useState(MATCH_DATA.currentTime)
  const [isRunning, setIsRunning] = useState(true)
  const [homeScore, setHomeScore] = useState(MATCH_DATA.homeScore)
  const [awayScore, setAwayScore] = useState(MATCH_DATA.awayScore)
  const [events, setEvents] = useState<MatchEvent[]>(INITIAL_EVENTS)

  // Input panel state
  const [activePanel, setActivePanel] = useState<EventType | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away" | "">("")
  const [selectedPlayer, setSelectedPlayer] = useState("")
  const [selectedPlayerOut, setSelectedPlayerOut] = useState("")
  const [cardType, setCardType] = useState<"yellow" | "red">("yellow")
  const [inputMinute, setInputMinute] = useState("")

  // Match clock
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setMatchTime((prev) => (prev < 90 ? prev + 1 : prev))
    }, 60000) // 1 minute real time = 1 minute match time for demo
    return () => clearInterval(interval)
  }, [isRunning])

  // Auth guard
  useEffect(() => {
    if (!user) {
      router.push("/login")
    } else if (user.role !== "operator") {
      router.push("/")
    }
  }, [user, router])

  const getPlayers = useCallback(
    (team: "home" | "away") => {
      return team === "home" ? HOME_PLAYERS : AWAY_PLAYERS
    },
    []
  )

  const resetForm = () => {
    setSelectedTeam("")
    setSelectedPlayer("")
    setSelectedPlayerOut("")
    setCardType("yellow")
    setInputMinute("")
    setActivePanel(null)
  }

  const handleSaveEvent = () => {
    if (!selectedTeam || !selectedPlayer) return

    const minute = inputMinute ? parseInt(inputMinute) : matchTime
    const players = getPlayers(selectedTeam as "home" | "away")
    const player = players.find((p) => p.id === selectedPlayer)

    if (!player) return

    const newEvent: MatchEvent = {
      id: `e${Date.now()}`,
      type: activePanel === "yellow" || activePanel === "red" ? cardType : activePanel!,
      team: selectedTeam as "home" | "away",
      minute,
      playerName: player.name,
    }

    if (activePanel === "substitution" && selectedPlayerOut) {
      const playerOut = players.find((p) => p.id === selectedPlayerOut)
      if (playerOut) {
        newEvent.playerOutName = playerOut.name
      }
    }

    // Update score for goals
    if (activePanel === "goal") {
      if (selectedTeam === "home") {
        setHomeScore((prev) => prev + 1)
      } else {
        setAwayScore((prev) => prev + 1)
      }
    }

    setEvents((prev) => [newEvent, ...prev])
    resetForm()
  }

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case "goal":
        return <Goal className="size-4" />
      case "yellow":
        return <div className="size-3 rounded-sm bg-yellow-400" />
      case "red":
        return <div className="size-3 rounded-sm bg-red-500" />
      case "substitution":
        return <RefreshCw className="size-4" />
    }
  }

  const getEventLabel = (event: MatchEvent) => {
    switch (event.type) {
      case "goal":
        return `${event.playerName} 득점`
      case "yellow":
        return `${event.playerName} 경고`
      case "red":
        return `${event.playerName} 퇴장`
      case "substitution":
        return `${event.playerOutName} OUT / ${event.playerName} IN`
    }
  }

  if (!user || user.role !== "operator") {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header - Score & Controls */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        {/* Top bar */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
            <ArrowLeft className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/admin/match/${params.id}/lineup`)}
          >
            <Users className="size-5" />
          </Button>
          <Badge className="bg-destructive text-destructive-foreground">
            <span className="relative flex size-2 mr-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive-foreground opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-destructive-foreground" />
            </span>
            LIVE
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsRunning((prev) => !prev)}
          >
            {isRunning ? <Pause className="size-5" /> : <Play className="size-5" />}
          </Button>
        </div>

        {/* Score display */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-foreground truncate">
                {MATCH_DATA.homeTeam}
              </p>
            </div>
            <div className="px-4 text-center">
              <p className="text-3xl font-bold text-foreground">
                {homeScore} : {awayScore}
              </p>
              <div className="flex items-center justify-center gap-1 text-primary text-sm font-medium mt-1">
                <Clock className="size-3" />
                {matchTime}&apos;
              </div>
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-foreground truncate">
                {MATCH_DATA.awayTeam}
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
            variant={activePanel === "yellow" || activePanel === "red" ? "default" : "secondary"}
            className="h-14 flex-col gap-1"
            onClick={() => {
              resetForm()
              setActivePanel(activePanel === "yellow" || activePanel === "red" ? null : "yellow")
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
              {(activePanel === "yellow" || activePanel === "red") && "경고/퇴장 기록"}
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
                }}
              >
                {MATCH_DATA.homeTeam}
              </Button>
              <Button
                variant={selectedTeam === "away" ? "default" : "outline"}
                className="h-12"
                onClick={() => {
                  setSelectedTeam("away")
                  setSelectedPlayer("")
                  setSelectedPlayerOut("")
                }}
              >
                {MATCH_DATA.awayTeam}
              </Button>
            </div>

            {/* Card Type (for card events) */}
            {(activePanel === "yellow" || activePanel === "red") && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={cardType === "yellow" ? "default" : "outline"}
                  className="h-12 gap-2"
                  onClick={() => setCardType("yellow")}
                >
                  <div className="size-4 rounded-sm bg-yellow-400" />
                  경고
                </Button>
                <Button
                  variant={cardType === "red" ? "default" : "outline"}
                  className="h-12 gap-2"
                  onClick={() => setCardType("red")}
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
                        activePanel === "substitution" ? "교체 IN 선수 선택" : "선수 선택"
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
                placeholder={`분 (기본: ${matchTime}')`}
                value={inputMinute}
                onChange={(e) => setInputMinute(e.target.value)}
                className="h-12 flex-1"
                min={1}
                max={120}
              />
              <Button
                variant="outline"
                className="h-12 px-4"
                onClick={() => setInputMinute(matchTime.toString())}
              >
                현재 시간
              </Button>
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
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {getEventLabel(event)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.team === "home" ? MATCH_DATA.homeTeam : MATCH_DATA.awayTeam}
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
