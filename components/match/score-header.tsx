"use client"

import { Circle } from "lucide-react"

interface ScoreHeaderProps {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  matchTime: string
  shootoutScoreLabel?: string
  shootoutWinnerSide?: "home" | "away" | null
  status: "live" | "ended" | "upcoming"
  homeLogo?: string
  awayLogo?: string
}

export function ScoreHeader({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  matchTime,
  shootoutScoreLabel,
  shootoutWinnerSide,
  status,
}: ScoreHeaderProps) {
  const isDrawInRegular = homeScore === awayScore
  const homeWon =
    homeScore > awayScore || (status === "ended" && isDrawInRegular && shootoutWinnerSide === "home")
  const awayWon =
    awayScore > homeScore || (status === "ended" && isDrawInRegular && shootoutWinnerSide === "away")

  return (
    <header className="bg-card border-b border-border lg:border-r shrink-0">
      <div className="flex items-center justify-between px-4 py-3">
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

        <div className="flex flex-col items-center px-4">
          <div className="flex items-center gap-3">
            <span
              className={`text-3xl font-bold tabular-nums ${
                homeWon ? "text-primary" : "text-foreground"
              }`}
            >
              {homeScore}
            </span>
            <span className="text-xl text-muted-foreground">-</span>
            <span
              className={`text-3xl font-bold tabular-nums ${
                awayWon ? "text-primary" : "text-foreground"
              }`}
            >
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
                  : status === "ended"
                    ? "text-muted-foreground"
                    : "text-accent"
              }`}
            >
              {matchTime}
            </span>
          </div>
          {status === "ended" && shootoutScoreLabel && (
            <p className="text-[11px] text-muted-foreground mt-0.5">PSO {shootoutScoreLabel}</p>
          )}
        </div>

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
