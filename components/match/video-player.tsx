"use client"

interface VideoPlayerProps {
  videoId?: string
}

export function VideoPlayer({ videoId = "dQw4w9WgXcQ" }: VideoPlayerProps) {
  return (
    <div className="w-full aspect-video bg-background">
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
        title="라이브 경기 영상"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
