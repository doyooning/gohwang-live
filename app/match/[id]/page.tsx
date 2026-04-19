import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { ScoreHeader } from "@/components/match/score-header"
import { VideoPlayer } from "@/components/match/video-player"
import { MatchTabs } from "@/components/match/match-tabs"

// Helper to extract YouTube video ID from URL
function extractYouTubeId(url: string | null): string | undefined {
  if (!url) return undefined
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  return match ? match[1] : undefined
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

  const videoId = extractYouTubeId(match.youtube_url)
  const normalizedStatus = String(match.status || "").toLowerCase()
  const headerStatus: "live" | "finished" | "upcoming" =
    normalizedStatus === "live"
      ? "live"
      : normalizedStatus === "finished"
      ? "finished"
      : "upcoming"
  const matchTimeLabel =
    headerStatus === "live" ? "LIVE" : headerStatus === "finished" ? "종료" : "예정"

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col lg:flex-row">
      {/* Left Section: Video + Score (Mobile: top, Desktop: left) */}
      <div className="flex flex-col lg:flex-1 lg:h-full">
        {/* Header */}
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

        {/* Score Header */}
        <ScoreHeader
          homeTeam={homeTeamName}
          awayTeam={awayTeamName}
          homeScore={match.home_score}
          awayScore={match.away_score}
          matchTime={matchTimeLabel}
          status={headerStatus}
        />

        {/* Video Player */}
        <div className="lg:flex-1 lg:flex lg:items-center lg:bg-black">
          <div className="w-full lg:max-h-full">
            <VideoPlayer videoId={videoId} />
          </div>
        </div>
      </div>

      {/* Right Section: Tabs (Mobile: bottom with scroll, Desktop: right sidebar) */}
      <div className="flex-1 lg:flex-none lg:w-[400px] xl:w-[450px] lg:h-full lg:border-l lg:border-border overflow-hidden">
        <MatchTabs videoId={videoId} matchId={match.id} />
      </div>
    </div>
  )
}
