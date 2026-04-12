"use client"

import Link from "next/link"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

type MatchStatus = "live" | "scheduled" | "finished"

interface MatchCardProps {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore?: number
  awayScore?: number
  scheduledTime?: string
  venue: string
  status: MatchStatus
}

function StatusBadge({ status }: { status: MatchStatus }) {
  const statusConfig = {
    live: {
      label: "LIVE",
      className: "bg-destructive text-destructive-foreground animate-pulse",
    },
    scheduled: {
      label: "예정",
      className: "bg-muted text-muted-foreground",
    },
    finished: {
      label: "종료",
      className: "bg-secondary text-secondary-foreground",
    },
  }

  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide",
        config.className
      )}
    >
      {config.label}
    </span>
  )
}

export function MatchCard({
  id,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  scheduledTime,
  venue,
  status,
}: MatchCardProps) {
  const isLive = status === "live"

  return (
    <Link href={`/match/${id}`}>
      <article
        className={cn(
          "block p-4 rounded-lg border transition-colors",
          isLive
            ? "bg-card border-primary/50 shadow-lg shadow-primary/10"
            : "bg-card border-border hover:border-muted-foreground/30"
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <StatusBadge status={status} />
          {status === "scheduled" && scheduledTime && (
            <span className="text-sm text-muted-foreground">{scheduledTime}</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "font-medium truncate",
                isLive && homeScore !== undefined && awayScore !== undefined && homeScore > awayScore
                  ? "text-primary"
                  : "text-foreground"
              )}
            >
              {homeTeam}
            </p>
          </div>

          {status !== "scheduled" && homeScore !== undefined && awayScore !== undefined ? (
            <div className="flex items-center gap-2 px-3">
              <span
                className={cn(
                  "text-xl font-bold tabular-nums",
                  isLive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {homeScore}
              </span>
              <span className="text-muted-foreground">-</span>
              <span
                className={cn(
                  "text-xl font-bold tabular-nums",
                  isLive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {awayScore}
              </span>
            </div>
          ) : (
            <div className="px-3">
              <span className="text-lg text-muted-foreground">vs</span>
            </div>
          )}

          <div className="flex-1 min-w-0 text-right">
            <p
              className={cn(
                "font-medium truncate",
                isLive && homeScore !== undefined && awayScore !== undefined && awayScore > homeScore
                  ? "text-primary"
                  : "text-foreground"
              )}
            >
              {awayTeam}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{venue}</span>
        </div>
      </article>
    </Link>
  )
}
