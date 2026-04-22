"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { VideoPlayer } from "@/components/match/video-player"

interface RealtimeVideoPlayerProps {
  matchId: string
  initialVideoId?: string
  initialShowThumbnail: boolean
}

export function RealtimeVideoPlayer({
  matchId,
  initialVideoId,
  initialShowThumbnail,
}: RealtimeVideoPlayerProps) {
  const supabase = useMemo(() => createClient() as any, [])
  const [showThumbnail, setShowThumbnail] = useState(initialShowThumbnail)
  const [videoId, setVideoId] = useState(initialVideoId)

  useEffect(() => {
    setShowThumbnail(initialShowThumbnail)
  }, [initialShowThumbnail])

  useEffect(() => {
    const channel = supabase
      .channel(`match-display-status-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload: any) => {
          const next = payload?.new
          if (!next) return
          setShowThumbnail(Boolean(next.display_status))
          if (next.youtube_url) {
            const match = String(next.youtube_url).match(
              /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/
            )
            if (match?.[1]) setVideoId(match[1])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, supabase])

  return <VideoPlayer videoId={videoId} showThumbnail={showThumbnail} />
}
