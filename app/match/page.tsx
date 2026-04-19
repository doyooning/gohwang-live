import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { MatchList } from "@/components/match/match-list"

export default function MatchListPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md p-2 hover:bg-secondary transition-colors"
            aria-label="메인화면으로 이동"
          >
            <ArrowLeft className="size-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">경기 목록</h1>
        </div>
      </header>

      <main className="px-4 py-4">
        <MatchList />
      </main>
    </div>
  )
}
