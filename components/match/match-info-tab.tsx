'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RectangleHorizontal,
  ArrowLeftRight,
  Loader2,
  Timer,
} from 'lucide-react';
import type { MatchEvent } from '@/lib/types';

interface MatchInfoTabProps {
  matchId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
}

interface MetaState {
  teamNamesBySide: {
    HOME: string;
    AWAY: string;
  };
  playerById: Record<string, { name: string; number: number | null }>;
  signature: string;
  lineupIds: string[];
}

const DEFAULT_META: MetaState = {
  teamNamesBySide: { HOME: '홈팀', AWAY: '원정팀' },
  playerById: {},
  signature: '',
  lineupIds: [],
};

const EVENT_POLL_MS = 12000;
const META_CHECK_MS = 45000;

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case 'goal':
      return (
        <span className="inline-flex items-center justify-center w-4 h-4 text-[14px] leading-none">
          ⚽
        </span>
      );
    case 'own_goal':
      return (
        <span className="inline-flex items-center justify-center w-4 h-4 text-[14px] leading-none text-red-500">
          ⚽
        </span>
      );
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
  getPlayerDisplayById,
}: {
  event: MatchEvent;
  getPlayerDisplayById: (
    teamSide: MatchEvent['team_side'],
    id: string | null | undefined,
    fallback?: string,
  ) => string;
}) {
  const scorerName = getPlayerDisplayById(event.team_side, event.player_id, '');
  const subInName = getPlayerDisplayById(
    event.team_side,
    event.sub_in_player_id,
    '',
  );
  const subOutName = getPlayerDisplayById(
    event.team_side,
    event.sub_out_player_id,
    event.description || '',
  );

  switch (event.event_type) {
    case 'goal': {
      const assistText = event.description?.trim();
      return (
        <div>
          <div className="font-medium text-foreground">{scorerName}</div>
          {assistText && (
            <div className="text-muted-foreground text-xs mt-1">{assistText}</div>
          )}
        </div>
      );
    }
    case 'own_goal':
      return (
        <div>
          <div className="font-medium text-foreground">{scorerName}</div>
          <div className="text-muted-foreground text-xs mt-1">
            {event.description || '자책골'}
          </div>
        </div>
      );
    case 'yellow_card':
    case 'red_card':
      return (
        <div>
          <div className="font-medium text-foreground">{scorerName}</div>
          {event.description && (
            <div className="text-muted-foreground text-xs mt-1">{event.description}</div>
          )}
        </div>
      );
    case 'substitution':
      return (
        <div>
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
          {event.description && (
            <div className="text-muted-foreground text-xs mt-1">{event.description}</div>
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

export function MatchInfoTab({
  matchId,
  homeTeamName,
  awayTeamName,
}: MatchInfoTabProps) {
  const supabase = useMemo(() => createClient() as any, []);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [meta, setMeta] = useState<MetaState>({
    ...DEFAULT_META,
    teamNamesBySide: {
      HOME: homeTeamName || DEFAULT_META.teamNamesBySide.HOME,
      AWAY: awayTeamName || DEFAULT_META.teamNamesBySide.AWAY,
    },
  });
  const [loading, setLoading] = useState(true);
  const metaSignatureRef = useRef('');

  const fetchEvents = useCallback(async () => {
    if (!matchId) return;
    const { data, error } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', matchId)
      .order('sort_minute', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      return;
    }
    setEvents((data || []) as MatchEvent[]);
  }, [matchId, supabase]);

  const fetchMetaFull = useCallback(async (): Promise<MetaState> => {
    if (!matchId) {
      return {
        ...DEFAULT_META,
        teamNamesBySide: {
          HOME: homeTeamName || DEFAULT_META.teamNamesBySide.HOME,
          AWAY: awayTeamName || DEFAULT_META.teamNamesBySide.AWAY,
        },
      };
    }

    const { data: matchRow } = await supabase
      .from('matches')
      .select('home_team_id, away_team_id, updated_at')
      .eq('id', matchId)
      .single();

    const { data: lineups } = await supabase
      .from('match_lineups')
      .select('id, updated_at')
      .eq('match_id', matchId)
      .order('updated_at', { ascending: false });

    const lineupIds = (lineups || []).map((l: any) => l.id as string).sort();

    const [homeTeamResult, awayTeamResult] = await Promise.all([
      matchRow?.home_team_id
        ? supabase.from('teams').select('name').eq('id', matchRow.home_team_id).single()
        : Promise.resolve({ data: null }),
      matchRow?.away_team_id
        ? supabase.from('teams').select('name').eq('id', matchRow.away_team_id).single()
        : Promise.resolve({ data: null }),
    ]);

    let playerById: Record<string, { name: string; number: number | null }> = {};
    let latestPlayerUpdatedAt = '';
    if (lineupIds.length > 0) {
      const { data: lineupPlayers } = await supabase
        .from('match_lineup_players')
        .select(
          'id, updated_at, team_player:team_players(name, jersey_number)',
        )
        .in('match_lineup_id', lineupIds)
        .order('updated_at', { ascending: false });

      latestPlayerUpdatedAt = lineupPlayers?.[0]?.updated_at || '';
      (lineupPlayers || []).forEach((player: any) => {
        if (!player?.id) return;
        const number = Number.isFinite(player.team_player?.jersey_number)
          ? Number(player.team_player?.jersey_number)
          : null;
        playerById[player.id] = {
          name: player.team_player?.name || '',
          number,
        };
      });
    }

    const lineupUpdated = lineups?.[0]?.updated_at || '';
    const signature = [
      `match:${matchRow?.updated_at || ''}`,
      `home:${matchRow?.home_team_id || ''}`,
      `away:${matchRow?.away_team_id || ''}`,
      `lineups:${lineupIds.join(',')}`,
      `lineups_updated:${lineupUpdated}`,
      `players_updated:${latestPlayerUpdatedAt}`,
    ].join('|');

    return {
      teamNamesBySide: {
        HOME:
          homeTeamResult.data?.name ||
          homeTeamName ||
          DEFAULT_META.teamNamesBySide.HOME,
        AWAY:
          awayTeamResult.data?.name ||
          awayTeamName ||
          DEFAULT_META.teamNamesBySide.AWAY,
      },
      playerById,
      signature,
      lineupIds,
    };
  }, [awayTeamName, homeTeamName, matchId, supabase]);

  const checkMetaSignatureLight = useCallback(async () => {
    if (!matchId) return '';

    const { data: matchRow } = await supabase
      .from('matches')
      .select('home_team_id, away_team_id, updated_at')
      .eq('id', matchId)
      .single();

    const { data: lineups } = await supabase
      .from('match_lineups')
      .select('id, updated_at')
      .eq('match_id', matchId)
      .order('updated_at', { ascending: false });

    const lineupIds = (lineups || []).map((l: any) => l.id as string).sort();
    let latestPlayerUpdatedAt = '';
    if (lineupIds.length > 0) {
      const { data: latestPlayer } = await supabase
        .from('match_lineup_players')
        .select('updated_at')
        .in('match_lineup_id', lineupIds)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      latestPlayerUpdatedAt = latestPlayer?.updated_at || '';
    }

    const lineupUpdated = lineups?.[0]?.updated_at || '';
    return [
      `match:${matchRow?.updated_at || ''}`,
      `home:${matchRow?.home_team_id || ''}`,
      `away:${matchRow?.away_team_id || ''}`,
      `lineups:${lineupIds.join(',')}`,
      `lineups_updated:${lineupUpdated}`,
      `players_updated:${latestPlayerUpdatedAt}`,
    ].join('|');
  }, [matchId, supabase]);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const init = async () => {
      const [nextMeta] = await Promise.all([fetchMetaFull(), fetchEvents()]);
      if (cancelled) return;
      metaSignatureRef.current = nextMeta.signature;
      setMeta(nextMeta);
      setLoading(false);
    };
    init();

    const eventPollingId = setInterval(() => {
      fetchEvents();
    }, EVENT_POLL_MS);

    const metaCheckId = setInterval(async () => {
      const nextSignature = await checkMetaSignatureLight();
      if (!nextSignature || nextSignature === metaSignatureRef.current) return;
      const nextMeta = await fetchMetaFull();
      metaSignatureRef.current = nextMeta.signature;
      setMeta(nextMeta);
    }, META_CHECK_MS);

    return () => {
      cancelled = true;
      clearInterval(eventPollingId);
      clearInterval(metaCheckId);
    };
  }, [checkMetaSignatureLight, fetchEvents, fetchMetaFull, matchId]);

  useEffect(() => {
    if (!homeTeamName && !awayTeamName) return;
    setMeta((prev) => ({
      ...prev,
      teamNamesBySide: {
        HOME: homeTeamName || prev.teamNamesBySide.HOME,
        AWAY: awayTeamName || prev.teamNamesBySide.AWAY,
      },
    }));
  }, [awayTeamName, homeTeamName]);

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

  const getPlayerDisplayById = (
    teamSide: MatchEvent['team_side'],
    id: string | null | undefined,
    fallback = '',
  ) => {
    if (!id) return fallback;
    const player = meta.playerById[id];
    if (!player) return fallback;
    const teamName =
      teamSide === 'HOME'
        ? meta.teamNamesBySide.HOME
        : teamSide === 'AWAY'
          ? meta.teamNamesBySide.AWAY
          : '';
    const numberText = player.number !== null ? `No. ${player.number}` : 'No.';
    return `${teamName} ${numberText} ${player.name}`.trim();
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
              className={`flex-1 ${
                event.team_side === 'AWAY' ? 'text-right' : 'text-left'
              }`}
            >
              <EventDescription
                event={event}
                getPlayerDisplayById={getPlayerDisplayById}
              />
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
