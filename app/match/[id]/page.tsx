import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { ScoreHeader } from "@/components/match/score-header"
import { VideoPlayer } from "@/components/match/video-player"
import { MatchTabs } from "@/components/match/match-tabs"

const matchData: Record<string, {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  matchTime: string
  status: "live" | "scheduled" | "finished"
  videoId: string
}> = {
  "1": {
    homeTeam: "FC 서울드림",
    awayTeam: "인천 유나이티드",
    homeScore: 3,
    awayScore: 1,
    matchTime: "85'",
    status: "live",
    videoId: "fpzcH5DhRXU",
  },
  "2": {
    homeTeam: "수원 삼성 블루윙즈",
    awayTeam: "전북 현대 모터스",
    homeScore: 2,
    awayScore: 2,
    matchTime: "67'",
    status: "live",
    videoId: "fpzcH5DhRXU",
  },
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const match = matchData[id] || matchData["1"]

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
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          matchTime={match.matchTime}
          status={match.status}
        />

        {/* Video Player */}
        <div className="lg:flex-1 lg:flex lg:items-center lg:bg-black">
          <div className="w-full lg:max-h-full">
            <VideoPlayer videoId={match.videoId} />
          </div>
        </div>
      </div>

      {/* Right Section: Tabs (Mobile: bottom with scroll, Desktop: right sidebar) */}
      <div className="flex-1 lg:flex-none lg:w-[400px] xl:w-[450px] lg:h-full lg:border-l lg:border-border overflow-hidden">
        <MatchTabs videoId={match.videoId} />
      </div>
    </div>
  )
}
