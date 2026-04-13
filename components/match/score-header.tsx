"use client"

import { Circle } from "lucide-react"

interface ScoreHeaderProps {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  matchTime: string
  status: "live" | "finished" | "upcoming"
  homeLogo?: string
  awayLogo?: string
}

export function ScoreHeader({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  matchTime,
  status,
}: ScoreHeaderProps) {
  return (
    <header className="bg-card border-b border-border lg:border-r shrink-0">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Home Team */}
        <div className="flex flex-col items-center flex-1">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-1">
            <span className="text-xs font-bold text-foreground">
              {homeTeam.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-foreground font-medium text-center truncate max-w-[80px]">
            {homeTeam}
          </span>
        </div>

        {/* Score & Time */}
        <div className="flex flex-col items-center px-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-foreground tabular-nums">
              {homeScore}
            </span>
            <span className="text-xl text-muted-foreground">-</span>
            <span className="text-3xl font-bold text-foreground tabular-nums">
              {awayScore}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {status === "live" && (
              <Circle className="w-2 h-2 fill-primary text-primary animate-pulse" />
            )}
            <span
              className={`text-xs font-medium ${
                status === "live"
                  ? "text-primary"
                  : status === "finished"
                  ? "text-muted-foreground"
                  : "text-accent"
              }`}
            >
              {status === "live" ? matchTime : status === "finished" ? "종료" : matchTime}
            </span>
          </div>
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center flex-1">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-1">
            <span className="text-xs font-bold text-foreground">
              {awayTeam.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-foreground font-medium text-center truncate max-w-[80px]">
            {awayTeam}
          </span>
        </div>
      </div>
    </header>
  )
}
