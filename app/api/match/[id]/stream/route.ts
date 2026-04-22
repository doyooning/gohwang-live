import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StreamParams {
  params: Promise<{ id: string }>;
}

type MatchSnapshot = {
  status: string | null;
  display_status: boolean;
  youtube_url: string | null;
  home_score: number;
  away_score: number;
  last_event_id: string | null;
  last_event_created_at: string | null;
};

async function getSnapshot(matchId: string): Promise<MatchSnapshot | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: match }, { data: lastEvent }] = await Promise.all([
    supabase
      .from("matches")
      .select("status, display_status, youtube_url, home_score, away_score")
      .eq("id", matchId)
      .single(),
    supabase
      .from("match_events")
      .select("id, created_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!match) return null;

  return {
    status: match.status ?? null,
    display_status: Boolean(match.display_status),
    youtube_url: match.youtube_url ?? null,
    home_score: Number(match.home_score ?? 0),
    away_score: Number(match.away_score ?? 0),
    last_event_id: lastEvent?.id ?? null,
    last_event_created_at: lastEvent?.created_at ?? null,
  };
}

export async function GET(_request: Request, { params }: StreamParams) {
  const { id: matchId } = await params;
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (eventName: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      let prevSnapshot = await getSnapshot(matchId);
      sendEvent("ready", { ok: true, matchId, at: Date.now() });
      if (prevSnapshot) {
        sendEvent("update", prevSnapshot);
      }

      intervalId = setInterval(async () => {
        if (closed) return;
        try {
          const nextSnapshot = await getSnapshot(matchId);
          if (!nextSnapshot) return;

          if (JSON.stringify(prevSnapshot) !== JSON.stringify(nextSnapshot)) {
            prevSnapshot = nextSnapshot;
            sendEvent("update", nextSnapshot);
          } else {
            sendEvent("ping", { at: Date.now() });
          }
        } catch (error) {
          sendEvent("error", {
            message: error instanceof Error ? error.message : "stream poll error",
          });
        }
      }, 3000);
    },
    cancel() {
      closed = true;
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
