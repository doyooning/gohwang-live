import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { ScoreHeader } from "@/components/match/score-header"
import { VideoPlayer } from "@/components/match/video-player"
import { MatchSseRefresher } from "@/components/match/match-sse-refresher"
import { MatchTabs } from "@/components/match/match-tabs"

function extractYouTubeId(url: string | null): string | undefined {
  if (!url) return undefined
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  return match ? match[1] : undefined
}

function parseIso(value?: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function elapsedMinutes(start?: string | null, end = new Date()) {
  const s = parseIso(start)
  if (!s) return 0
  return Math.max(0, Math.floor((end.getTime() - s.getTime()) / 60000))
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: match, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !match) {
    notFound()
  }

  const homeTeamPromise = match.home_team_id
    ? supabase.from("teams").select("name").eq("id", match.home_team_id).single()
    : Promise.resolve({ data: null, error: null })
  const awayTeamPromise = match.away_team_id
    ? supabase.from("teams").select("name").eq("id", match.away_team_id).single()
    : Promise.resolve({ data: null, error: null })

  const [homeTeamResult, awayTeamResult] = await Promise.all([
    homeTeamPromise,
    awayTeamPromise,
  ])

  const homeTeamName = homeTeamResult.data?.name || match.home_team || "홈팀"
  const awayTeamName = awayTeamResult.data?.name || match.away_team || "원정팀"

  const { data: matchEvents } = await supabase
    .from("match_events")
    .select("event_type, team_side, created_at")
    .eq("match_id", id)
    .in("event_type", [
      "goal",
      "half_start",
      "half_end",
      "second_half_start",
      "second_half_end",
      "extra_time_start",
      "extra_time_end",
      "shootout_goal",
      "shootout_missed",
    ])
    .order("created_at", { ascending: true })

  const timeMarks: {
    first_half_start?: string
    first_half_end?: string
    second_half_start?: string
    second_half_end?: string
    extra_start?: string
    extra_end?: string
  } = {}
  let shootoutHome = 0
  let shootoutAway = 0
  let goalHome = 0
  let goalAway = 0
  let goalEventCount = 0

  ;(matchEvents || []).forEach((event: any) => {
    if (event.event_type === "goal") goalEventCount += 1
    if (event.event_type === "goal" && event.team_side === "HOME") goalHome += 1
    if (event.event_type === "goal" && event.team_side === "AWAY") goalAway += 1
    if (event.event_type === "half_start") timeMarks.first_half_start = event.created_at
    if (event.event_type === "half_end") timeMarks.first_half_end = event.created_at
    if (event.event_type === "second_half_start") timeMarks.second_half_start = event.created_at
    if (event.event_type === "second_half_end") timeMarks.second_half_end = event.created_at
    if (event.event_type === "extra_time_start") timeMarks.extra_start = event.created_at
    if (event.event_type === "extra_time_end") timeMarks.extra_end = event.created_at
    if (event.event_type === "shootout_goal" && event.team_side === "HOME") shootoutHome += 1
    if (event.event_type === "shootout_goal" && event.team_side === "AWAY") shootoutAway += 1
  })

  const videoId = extractYouTubeId(match.youtube_url)
  const normalizedStatus = String(match.status || "").toLowerCase()
  const headerStatus: "live" | "ended" | "upcoming" =
    normalizedStatus === "live"
      ? "live"
      : normalizedStatus === "ended"
      ? "ended"
      : "upcoming"

  const getClockLabel = () => {
    if (timeMarks.extra_end) return "연장 ET"
    if (timeMarks.extra_start) return `연장 ${elapsedMinutes(timeMarks.extra_start)}'`
    if (timeMarks.second_half_end) return "후반 FT"
    if (timeMarks.second_half_start) return `후반 ${elapsedMinutes(timeMarks.second_half_start)}'`
    if (timeMarks.first_half_end) return "전반 HT"
    if (timeMarks.first_half_start) return `전반 ${elapsedMinutes(timeMarks.first_half_start)}'`
    return "LIVE"
  }

  const matchTimeLabel =
    headerStatus === "upcoming"
      ? "예정"
      : headerStatus === "ended"
      ? (() => {
          const label = getClockLabel()
          return label === "LIVE" ? "종료" : label
        })()
      : getClockLabel()

  const shootoutScoreLabel =
    shootoutHome + shootoutAway > 0 ? `${shootoutHome}-${shootoutAway}` : undefined
  const shootoutWinnerSide =
    shootoutHome > shootoutAway ? "home" : shootoutAway > shootoutHome ? "away" : null
  const displayHomeScore = goalEventCount > 0 ? goalHome : match.home_score
  const displayAwayScore = goalEventCount > 0 ? goalAway : match.away_score

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col lg:flex-row">
      <MatchSseRefresher matchId={match.id} />

      <div className="flex flex-col lg:flex-1 lg:h-full">
        <div className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border lg:border-r">
          <div className="flex items-center gap-2 px-2 py-2">
            <Link
              href="/match"
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </Link>
            <span className="text-sm text-muted-foreground">경기 상세</span>
          </div>
        </div>

        <ScoreHeader
          homeTeam={homeTeamName}
          awayTeam={awayTeamName}
          homeScore={displayHomeScore}
          awayScore={displayAwayScore}
          matchTime={matchTimeLabel}
          shootoutScoreLabel={shootoutScoreLabel}
          shootoutWinnerSide={shootoutWinnerSide}
          status={headerStatus}
        />

        <div className="lg:flex-1 lg:flex lg:items-center lg:bg-black">
          <div className="w-full lg:max-h-full">
            <VideoPlayer
              videoId={videoId}
              showThumbnail={Boolean(match.display_status)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 lg:flex-none lg:w-[400px] xl:w-[450px] lg:h-full lg:border-l lg:border-border overflow-hidden">
        <MatchTabs
          videoId={videoId}
          matchId={match.id}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
        />
      </div>
    </div>
  )
}
