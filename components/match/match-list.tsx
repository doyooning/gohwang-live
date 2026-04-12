"use client"

import { MatchCard } from "./match-card"

const sampleMatches = [
  {
    id: "1",
    homeTeam: "FC 서울드림",
    awayTeam: "인천 유나이티드",
    homeScore: 3,
    awayScore: 1,
    venue: "월드컵경기장 보조구장",
    status: "live" as const,
  },
  {
    id: "2",
    homeTeam: "수원 삼성 블루윙즈",
    awayTeam: "전북 현대 모터스",
    homeScore: 2,
    awayScore: 2,
    venue: "수원 월드컵경기장",
    status: "live" as const,
  },
  {
    id: "3",
    homeTeam: "성남 FC",
    awayTeam: "대구 FC",
    scheduledTime: "16:00",
    venue: "탄천종합운동장",
    status: "scheduled" as const,
  },
  {
    id: "4",
    homeTeam: "울산 현대",
    awayTeam: "포항 스틸러스",
    scheduledTime: "19:00",
    venue: "울산문수경기장",
    status: "scheduled" as const,
  },
  {
    id: "5",
    homeTeam: "강원 FC",
    awayTeam: "제주 유나이티드",
    homeScore: 1,
    awayScore: 0,
    venue: "춘천송암스포츠타운",
    status: "finished" as const,
  },
  {
    id: "6",
    homeTeam: "김천 상무",
    awayTeam: "광주 FC",
    homeScore: 0,
    awayScore: 2,
    venue: "김천종합스포츠타운",
    status: "finished" as const,
  },
]

export function MatchList() {
  const liveMatches = sampleMatches.filter((m) => m.status === "live")
  const scheduledMatches = sampleMatches.filter((m) => m.status === "scheduled")
  const finishedMatches = sampleMatches.filter((m) => m.status === "finished")

  return (
    <div className="space-y-6">
      {liveMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            진행 중
          </h2>
          <div className="space-y-3">
            {liveMatches.map((match) => (
              <MatchCard key={match.id} {...match} />
            ))}
          </div>
        </section>
      )}

      {scheduledMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            예정된 경기
          </h2>
          <div className="space-y-3">
            {scheduledMatches.map((match) => (
              <MatchCard key={match.id} {...match} />
            ))}
          </div>
        </section>
      )}

      {finishedMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            종료된 경기
          </h2>
          <div className="space-y-3">
            {finishedMatches.map((match) => (
              <MatchCard key={match.id} {...match} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
