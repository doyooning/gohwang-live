import { ScoreHeader } from "@/components/match/score-header"
import { VideoPlayer } from "@/components/match/video-player"
import { MatchTabs } from "@/components/match/match-tabs"

export default function MatchPage() {
  return (
    <div className="min-h-screen bg-background">
      <ScoreHeader
        homeTeam="FC 서울드림"
        awayTeam="인천 유나이티드"
        homeScore={3}
        awayScore={1}
        matchTime="85'"
        status="live"
      />
      
      <main>
        <VideoPlayer videoId="dQw4w9WgXcQ" />
        <MatchTabs />
      </main>
    </div>
  )
}
