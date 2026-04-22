'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Circle,
  RectangleHorizontal,
  ArrowLeftRight,
  Loader2,
  Timer,
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
    case 'half_start':
    case 'half_end':
    case 'second_half_start':
    case 'second_half_end':
    case 'extra':
    case 'extra_time_start':
    case 'extra_time_end':
    case 'shootout_goal':
    case 'shootout_missed':
      return <Timer className="w-4 h-4 text-muted-foreground" />;
    default:
      return null;
  }
}

function EventDescription({
  event,
  getPlayerNameById,
}: {
  event: MatchEvent;
  getPlayerNameById: (id: string | null | undefined, fallback?: string) => string;
}) {
  const scorerName = getPlayerNameById(event.player_id, '');
  const subInName = getPlayerNameById(event.sub_in_player_id, '');
  const subOutName = getPlayerNameById(event.sub_out_player_id, event.description || '');

  switch (event.event_type) {
    case 'goal':
      return (
        <div>
          <span className="font-medium text-foreground">{scorerName}</span>
          {event.description && (
            <span className="text-muted-foreground text-xs ml-1">({event.description})</span>
          )}
        </div>
      );
    case 'yellow_card':
    case 'red_card':
      return <span className="font-medium text-foreground">{scorerName}</span>;
    case 'substitution':
      return (
        <div className="flex items-center gap-1">
          <span className="text-primary text-sm">IN</span>
          <span className="font-medium text-foreground">{subInName}</span>
          {subOutName && (
            <>
              <span className="text-destructive text-sm ml-2">OUT</span>
              <span className="text-muted-foreground">{subOutName}</span>
            </>
          )}
        </div>
      );
    case 'half_start':
    case 'half_end':
    case 'second_half_start':
    case 'second_half_end':
    case 'extra':
    case 'extra_time_start':
    case 'extra_time_end':
    case 'shootout_goal':
    case 'shootout_missed':
      return (
        <span className="font-medium text-foreground">
          {event.description || '시간 기록'}
        </span>
      );
    default:
      return (
        <span className="font-medium text-foreground">
          {scorerName || event.description || '이벤트'}
        </span>
      );
  }
}

export function MatchInfoTab({ matchId }: MatchInfoTabProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [playerNameById, setPlayerNameById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    const supabase = createClient() as any;

    async function fetchEvents() {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('sort_minute', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
      } else {
        setEvents(data || []);
      }

      const { data: matchLineups } = await supabase
        .from('match_lineups')
        .select('id')
        .eq('match_id', matchId);

      const lineupIds = (matchLineups || []).map((lineup: any) => lineup.id);
      if (lineupIds.length > 0) {
        const { data: lineupPlayers } = await supabase
          .from('match_lineup_players')
          .select('id, team_player:team_players(name, jersey_number)')
          .in('match_lineup_id', lineupIds);

        const nextNameById: Record<string, string> = {};
        (lineupPlayers || []).forEach((player: any) => {
          if (player?.id) {
            const number = player.team_player?.jersey_number;
            const name = player.team_player?.name || '';
            nextNameById[player.id] = number ? `#${number} ${name}` : name;
          }
        });
        setPlayerNameById(nextNameById);
      } else {
        setPlayerNameById({});
      }
      setLoading(false);
    }

    fetchEvents();
    const intervalId = setInterval(() => {
      fetchEvents();
    }, 7000);

    return () => {
      clearInterval(intervalId);
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

  const getPlayerNameById = (
    id: string | null | undefined,
    fallback = '',
  ) => {
    if (!id) return fallback;
    return playerNameById[id] || fallback;
  };

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
            <div className="flex items-center gap-2 min-w-[92px]">
              <span className="text-sm font-bold text-primary tabular-nums">
                {event.period ? `${event.period} ` : ''}
                {event.display_minute ?? event.sort_minute ?? 0}&apos;
              </span>
              <EventIcon type={event.event_type} />
            </div>
            <div
              className={`flex-1 ${event.team_side === 'AWAY' ? 'text-right' : 'text-left'}`}
            >
              <EventDescription
                event={event}
                getPlayerNameById={getPlayerNameById}
              />
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
