"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Circle, RectangleHorizontal, ArrowLeftRight } from "lucide-react"

type EventType = "goal" | "yellow_card" | "red_card" | "substitution"

interface MatchEvent {
  id: string
  type: EventType
  time: string
  team: "home" | "away"
  player: string
  assistPlayer?: string
  playerIn?: string
  playerOut?: string
}

const sampleEvents: MatchEvent[] = [
  { id: "1", type: "goal", time: "12'", team: "home", player: "김민수", assistPlayer: "이정우" },
  { id: "2", type: "yellow_card", time: "23'", team: "away", player: "박준혁" },
  { id: "3", type: "goal", time: "34'", team: "away", player: "최동현" },
  { id: "4", type: "substitution", time: "45'", team: "home", player: "", playerIn: "장현우", playerOut: "김민수" },
  { id: "5", type: "goal", time: "56'", team: "home", player: "이정우" },
  { id: "6", type: "yellow_card", time: "67'", team: "home", player: "정태영" },
  { id: "7", type: "red_card", time: "78'", team: "away", player: "한승우" },
  { id: "8", type: "goal", time: "85'", team: "home", player: "조성민", assistPlayer: "장현우" },
]

function EventIcon({ type }: { type: EventType }) {
  switch (type) {
    case "goal":
      return <Circle className="w-4 h-4 fill-primary text-primary" />
    case "yellow_card":
      return <RectangleHorizontal className="w-4 h-4 fill-accent text-accent rotate-90" />
    case "red_card":
      return <RectangleHorizontal className="w-4 h-4 fill-destructive text-destructive rotate-90" />
    case "substitution":
      return <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
  }
}

function EventDescription({ event }: { event: MatchEvent }) {
  switch (event.type) {
    case "goal":
      return (
        <div>
          <span className="font-medium text-foreground">{event.player}</span>
          {event.assistPlayer && (
            <span className="text-muted-foreground text-xs ml-1">
              (어시스트: {event.assistPlayer})
            </span>
          )}
        </div>
      )
    case "yellow_card":
    case "red_card":
      return <span className="font-medium text-foreground">{event.player}</span>
    case "substitution":
      return (
        <div className="flex items-center gap-1">
          <span className="text-primary text-sm">IN</span>
          <span className="font-medium text-foreground">{event.playerIn}</span>
          <span className="text-destructive text-sm ml-2">OUT</span>
          <span className="text-muted-foreground">{event.playerOut}</span>
        </div>
      )
  }
}

export function MatchInfoTab() {
  return (
    <ScrollArea className="h-full">
      <div className="py-2">
        {sampleEvents.map((event) => (
          <div
            key={event.id}
            className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 ${
              event.team === "away" ? "flex-row-reverse" : ""
            }`}
          >
            <div className="flex items-center gap-2 min-w-[60px]">
              <span className="text-sm font-bold text-primary tabular-nums">{event.time}</span>
              <EventIcon type={event.type} />
            </div>
            <div className={`flex-1 ${event.team === "away" ? "text-right" : "text-left"}`}>
              <EventDescription event={event} />
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
