'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Circle,
  RectangleHorizontal,
  ArrowLeftRight,
  Loader2,
} from 'lucide-react';
import type { MatchEvent } from '@/lib/types';

interface MatchInfoTabProps {
  matchId?: string;
}

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case 'goal':
      return <Circle className="w-4 h-4 fill-primary text-primary" />;
    case 'yellow_card':
      return (
        <RectangleHorizontal className="w-4 h-4 fill-accent text-accent rotate-90" />
      );
    case 'red_card':
      return (
        <RectangleHorizontal className="w-4 h-4 fill-destructive text-destructive rotate-90" />
      );
    case 'substitution':
      return <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />;
    default:
      return null;
  }
}

function EventDescription({ event }: { event: MatchEvent }) {
  switch (event.event_type) {
    case 'goal':
      return (
        <div>
          <span className="font-medium text-foreground">
            {event.player_name}
          </span>
          {event.description && (
            <span className="text-muted-foreground text-xs ml-1">
              ({event.description})
            </span>
          )}
        </div>
      );
    case 'yellow_card':
    case 'red_card':
      return (
        <span className="font-medium text-foreground">{event.player_name}</span>
      );
    case 'substitution':
      return (
        <div className="flex items-center gap-1">
          <span className="text-primary text-sm">IN</span>
          <span className="font-medium text-foreground">
            {event.player_name}
          </span>
          {event.description && (
            <>
              <span className="text-destructive text-sm ml-2">OUT</span>
              <span className="text-muted-foreground">{event.description}</span>
            </>
          )}
        </div>
      );
    default:
      return (
        <span className="font-medium text-foreground">{event.player_name}</span>
      );
  }
}

export function MatchInfoTab({ matchId }: MatchInfoTabProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchEvents() {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('minute', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    }

    fetchEvents();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`match-events-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          fetchEvents();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        아직 기록된 이벤트가 없습니다
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="py-2">
        {events.map((event) => (
          <div
            key={event.id}
            className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 ${
              event.team_side === 'AWAY' ? 'flex-row-reverse' : ''
            }`}
          >
            <div className="flex items-center gap-2 min-w-[60px]">
              <span className="text-sm font-bold text-primary tabular-nums">
                {event.minute}&apos;
              </span>
              <EventIcon type={event.event_type} />
            </div>
            <div
              className={`flex-1 ${event.team_side === 'AWAY' ? 'text-right' : 'text-left'}`}
            >
              <EventDescription event={event} />
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
