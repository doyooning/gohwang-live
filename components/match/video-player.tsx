"use client"

import Image from "next/image"

interface VideoPlayerProps {
  videoId?: string
  thumbnailUrl?: string
  showThumbnail?: boolean
}

export function VideoPlayer({
  videoId = "fpzcH5DhRXU",
  thumbnailUrl = "/images/match-thumbnail.jpg",
  showThumbnail = false,
}: VideoPlayerProps) {
  return (
    <div className="relative w-full aspect-video bg-background">
      {/* YouTube Embed */}
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
        title="라이브 경기 영상"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />

      {/* Thumbnail Overlay */}
      {showThumbnail && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <Image
            src={thumbnailUrl}
            alt="경기 대기 화면"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <div className="size-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="size-8 rounded-full bg-primary animate-pulse" />
              </div>
              <p className="text-lg font-semibold text-foreground">잠시 후 경기가 시작됩니다</p>
              <p className="text-sm text-muted-foreground mt-1">곧 라이브 중계가 시작됩니다</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
