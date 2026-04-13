"use client"

import { ScrollArea } from "@/components/ui/scroll-area"

interface Player {
  number: number
  name: string
  position: string
  isCaptain?: boolean
}

interface TeamLineup {
  teamName: string
  formation: string
  starters: Player[]
  substitutes: Player[]
}

const homeLineup: TeamLineup = {
  teamName: "FC 서울드림",
  formation: "4-3-3",
  starters: [
    { number: 1, name: "박준영", position: "GK" },
    { number: 2, name: "이상훈", position: "RB" },
    { number: 4, name: "김태호", position: "CB" },
    { number: 5, name: "최민재", position: "CB" },
    { number: 3, name: "정성진", position: "LB" },
    { number: 6, name: "한동욱", position: "CDM" },
    { number: 8, name: "이정우", position: "CM", isCaptain: true },
    { number: 10, name: "장현우", position: "CM" },
    { number: 7, name: "김민수", position: "RW" },
    { number: 9, name: "조성민", position: "ST" },
    { number: 11, name: "정태영", position: "LW" },
  ],
  substitutes: [
    { number: 12, name: "오승현", position: "GK" },
    { number: 14, name: "박지훈", position: "DF" },
    { number: 15, name: "김준서", position: "MF" },
    { number: 17, name: "이도현", position: "MF" },
    { number: 19, name: "송민규", position: "FW" },
  ],
}

const awayLineup: TeamLineup = {
  teamName: "인천 유나이티드",
  formation: "4-4-2",
  starters: [
    { number: 1, name: "강민수", position: "GK" },
    { number: 2, name: "임재혁", position: "RB" },
    { number: 4, name: "박준혁", position: "CB" },
    { number: 5, name: "윤성준", position: "CB" },
    { number: 3, name: "한승우", position: "LB" },
    { number: 6, name: "김영진", position: "RM" },
    { number: 8, name: "이준호", position: "CM", isCaptain: true },
    { number: 10, name: "정우성", position: "CM" },
    { number: 7, name: "최동현", position: "LM" },
    { number: 9, name: "박성우", position: "ST" },
    { number: 11, name: "김현우", position: "ST" },
  ],
  substitutes: [
    { number: 12, name: "이승기", position: "GK" },
    { number: 14, name: "조민수", position: "DF" },
    { number: 16, name: "양준혁", position: "MF" },
    { number: 18, name: "서진우", position: "MF" },
    { number: 20, name: "권민석", position: "FW" },
  ],
}

function PlayerRow({ player }: { player: Player }) {
  return (
    <div className="flex items-center justify-between py-2 px-3">
      <div className="flex items-center gap-3">
        <span className="w-6 text-center text-sm font-bold text-primary tabular-nums">
          {player.number}
        </span>
        <span className="text-sm text-foreground">
          {player.name}
          {player.isCaptain && (
            <span className="ml-1.5 text-[10px] text-accent font-bold">(C)</span>
          )}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">{player.position}</span>
    </div>
  )
}

function TeamSection({ lineup, isAway }: { lineup: TeamLineup; isAway?: boolean }) {
  return (
    <div className={`flex-1 ${isAway ? "border-l border-border" : ""}`}>
      <div className="px-3 py-2 bg-secondary/50">
        <div className="text-sm font-bold text-foreground">{lineup.teamName}</div>
        <div className="text-xs text-muted-foreground">포메이션: {lineup.formation}</div>
      </div>
      
      <div className="px-1">
        <div className="text-xs text-muted-foreground px-3 py-2 border-b border-border/50">
          선발 ({lineup.starters.length}명)
        </div>
        {lineup.starters.map((player) => (
          <PlayerRow key={player.number} player={player} />
        ))}
        
        <div className="text-xs text-muted-foreground px-3 py-2 border-b border-border/50 mt-2">
          교체 ({lineup.substitutes.length}명)
        </div>
        {lineup.substitutes.map((player) => (
          <PlayerRow key={player.number} player={player} />
        ))}
      </div>
    </div>
  )
}

export function LineupTab() {
  return (
    <ScrollArea className="h-full">
      <div className="flex">
        <TeamSection lineup={homeLineup} />
        <TeamSection lineup={awayLineup} isAway />
      </div>
    </ScrollArea>
  )
}
