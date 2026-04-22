"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface MatchSseRefresherProps {
  matchId: string;
}

export function MatchSseRefresher({ matchId }: MatchSseRefresherProps) {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    let source: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let fallbackPollingId: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;

      source = new EventSource(`/api/match/${matchId}/stream`);
      source.addEventListener("update", () => {
        const now = Date.now();
        if (now - lastRefreshAtRef.current < 1200) return;
        lastRefreshAtRef.current = now;
        router.refresh();
      });

      source.onerror = () => {
        source?.close();
        if (disposed) return;
        reconnectTimeout = setTimeout(connect, 2000);
      };
    };

    connect();
    fallbackPollingId = setInterval(() => {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 3000) return;
      lastRefreshAtRef.current = now;
      router.refresh();
    }, 7000);

    return () => {
      disposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (fallbackPollingId) clearInterval(fallbackPollingId);
      source?.close();
    };
  }, [matchId, router]);

  return null;
}
