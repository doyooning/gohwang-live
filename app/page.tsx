import { MatchList } from "@/components/match/match-list"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">경기 목록</h1>
        </div>
      </header>

      <main className="px-4 py-4">
        <MatchList />
      </main>
    </div>
  )
}
