"use client"

import { useEffect, useState } from "react"

interface ChatTabProps {
  videoId?: string
}

export function ChatTab({ videoId = "dQw4w9WgXcQ" }: ChatTabProps) {
  const [embedDomain, setEmbedDomain] = useState<string>("")

  useEffect(() => {
    // 클라이언트 사이드에서 현재 도메인 가져오기
    setEmbedDomain(window.location.hostname)
  }, [])

  if (!embedDomain) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-280px)] min-h-[300px]">
        <div className="text-muted-foreground">채팅 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-280px)] min-h-[300px]">
      <iframe
        className="w-full h-full border-0"
        src={`https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${embedDomain}`}
        title="유튜브 라이브 채팅"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  )
}
