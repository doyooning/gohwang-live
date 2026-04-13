"use client"

import { useEffect, useState } from "react"

interface ChatTabProps {
  videoId?: string
}

export function ChatTab({ videoId = "fpzcH5DhRXU" }: ChatTabProps) {
  const [embedDomain, setEmbedDomain] = useState<string>("")

  useEffect(() => {
    setEmbedDomain(window.location.hostname)
  }, [])

  if (!embedDomain) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">채팅 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <iframe
        className="w-full h-full border-0"
        src={`https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${embedDomain}`}
        title="유튜브 라이브 채팅"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  )
}
