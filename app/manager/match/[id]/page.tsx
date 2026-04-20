'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Goal,
  Square,
  RefreshCw,
  X,
  Clock,
  Users,
  Image as ImageIcon,
  Loader2,
  Timer,
  CircleDot,
  Undo2,
} from 'lucide-react';
import type { Match, MatchEvent, Lineup } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type EventType = 'goal' | 'yellow_card' | 'red_card' | 'substitution';

interface Player {
  id: string;
  name: string;
  number: number;
  role: 'STARTER' | 'SUBSTITUTE';
  status: 'available' | 'sub_in' | 'sub_out' | 'sent_off';
}

type TimeType =
  | 'first_half_start'
  | 'first_half_end'
  | 'second_half_start'
  | 'second_half_end'
  | 'extra_start'
  | 'extra_end';

interface MatchTimes {
  first_half_start: string;
  first_half_end: string;
  second_half_start: string;
  second_half_end: string;
  extra_start: string;
  extra_end: string;
}

type MatchPeriod = '전반' | '후반' | '연장';

const EMPTY_MATCH_TIMES: MatchTimes = {
  first_half_start: '',
  first_half_end: '',
  second_half_start: '',
  second_half_end: '',
  extra_start: '',
  extra_end: '',
};

interface PenaltyKick {
  order: number;
  team: 'first' | 'second';
  result: 'success' | 'fail' | null;
}

type TimeEventType =
  | 'half_start'
  | 'half_end'
  | 'second_half_start'
  | 'second_half_end'
  | 'extra_time_start'
  | 'extra_time_end';

const TIME_EVENT_TO_TIME_TYPE: Record<TimeEventType, TimeType> = {
  half_start: 'first_half_start',
  half_end: 'first_half_end',
  second_half_start: 'second_half_start',
  second_half_end: 'second_half_end',
  extra_time_start: 'extra_start',
  extra_time_end: 'extra_end',
};

const TIME_TYPE_TO_TIME_EVENT: Record<TimeType, TimeEventType> = {
  first_half_start: 'half_start',
  first_half_end: 'half_end',
  second_half_start: 'second_half_start',
  second_half_end: 'second_half_end',
  extra_start: 'extra_time_start',
  extra_end: 'extra_time_end',
};

export default function MatchControlPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;
  const supabase = useMemo(() => createClient() as any, []);

  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [players, setPlayers] = useState<{ home: Player[]; away: Player[] }>({
    home: [],
    away: [],
  });
  const [teamNames, setTeamNames] = useState<{ home: string; away: string }>({
    home: '',
    away: '',
  });
  const [loading, setLoading] = useState(true);
  const [showThumbnail, setShowThumbnail] = useState(false);
  const { toast } = useToast();

  // Input panel state
  const [activePanel, setActivePanel] = useState<EventType | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | ''>('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedPlayerOut, setSelectedPlayerOut] = useState('');
  const [selectedAssistPlayer, setSelectedAssistPlayer] = useState('');
  const [cardType, setCardType] = useState<'yellow_card' | 'red_card'>(
    'yellow_card',
  );
  const [inputMinute, setInputMinute] = useState('');

  // Time section state
  const [showTimePanel, setShowTimePanel] = useState(false);
  const [matchTimes, setMatchTimes] = useState<MatchTimes>(EMPTY_MATCH_TIMES);
  const [lastTimeRecord, setLastTimeRecord] = useState<{
    type: TimeType;
    eventId: string;
  } | null>(null);

  // Penalty shootout state
  const [showPenaltyPanel, setShowPenaltyPanel] = useState(false);
  const [penaltyFirstTeam, setPenaltyFirstTeam] = useState<'home' | 'away'>(
    'home',
  );
  const [penaltyKicks, setPenaltyKicks] = useState<PenaltyKick[]>([]);
  const [currentPenaltyRound, setCurrentPenaltyRound] = useState(1);
  const [currentPenaltyTeam, setCurrentPenaltyTeam] = useState<
    'first' | 'second'
  >('first');
  const [clockTick, setClockTick] = useState(0);

  const isTimeEventType = (eventType: string): eventType is TimeEventType => {
    return eventType in TIME_EVENT_TO_TIME_TYPE;
  };

  const applyTimeStateFromEvents = (eventRows: MatchEvent[]) => {
    const nextTimes: MatchTimes = { ...EMPTY_MATCH_TIMES };
    let latestTimeEvent: { type: TimeType; eventId: string } | null = null;
    const sortedEvents = [...eventRows].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    sortedEvents.forEach((event) => {
      if (!isTimeEventType(event.event_type)) return;
      const mappedType = TIME_EVENT_TO_TIME_TYPE[event.event_type];
      nextTimes[mappedType] = event.created_at;
      latestTimeEvent = { type: mappedType, eventId: event.id };
    });

    setMatchTimes(nextTimes);
    setLastTimeRecord(latestTimeEvent);
  };

  const refreshEvents = useCallback(async () => {
    const { data } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', matchId)
      .order('sort_minute', { ascending: false })
      .order('created_at', { ascending: false });

    const nextEvents = (data || []) as MatchEvent[];
    setEvents(nextEvents);
    applyTimeStateFromEvents(nextEvents);
    return nextEvents;
  }, [matchId, supabase]);

  const syncMatchScoreFromEvents = useCallback(async () => {
    const { data: goalEvents, error } = await supabase
      .from('match_events')
      .select('team_side')
      .eq('match_id', matchId)
      .eq('event_type', 'goal');

    if (error) {
      console.error('Error syncing match score from events:', error);
      return;
    }

    const homeScore = (goalEvents || []).filter(
      (event: any) => event.team_side === 'HOME',
    ).length;
    const awayScore = (goalEvents || []).filter(
      (event: any) => event.team_side === 'AWAY',
    ).length;

    const { error: updateError } = await supabase
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore })
      .eq('id', matchId);

    if (updateError) {
      console.error('Error updating match score:', updateError);
      return;
    }

    setMatch((prev) =>
      prev ? { ...prev, home_score: homeScore, away_score: awayScore } : prev,
    );
  }, [matchId, supabase]);

  const syncLineupPlayerStatusesFromEvents = useCallback(async () => {
    const { data: lineups } = await supabase
      .from('match_lineups')
      .select('id')
      .eq('match_id', matchId);
    const lineupIds = (lineups || []).map((lineup: any) => lineup.id);
    if (lineupIds.length === 0) return { error: null };

    const { data: lineupPlayers, error: lineupPlayersError } = await supabase
      .from('match_lineup_players')
      .select('id, player_status')
      .in('match_lineup_id', lineupIds);
    if (lineupPlayersError) return { error: lineupPlayersError };

    const statusByPlayerId: Record<
      string,
      'available' | 'sub_in' | 'sub_out' | 'sent_off'
    > = {};
    (lineupPlayers || []).forEach((player: any) => {
      statusByPlayerId[player.id] = 'available';
    });

    const { data: allEvents, error: eventsError } = await supabase
      .from('match_events')
      .select('event_type, player_id, sub_in_player_id, sub_out_player_id')
      .eq('match_id', matchId)
      .order('sort_minute', { ascending: true })
      .order('created_at', { ascending: true });
    if (eventsError) return { error: eventsError };

    (allEvents || []).forEach((event: any) => {
      if (event.event_type === 'red_card' && event.player_id && statusByPlayerId[event.player_id]) {
        statusByPlayerId[event.player_id] = 'sent_off';
      }
      if (event.event_type === 'substitution') {
        if (
          event.sub_in_player_id &&
          statusByPlayerId[event.sub_in_player_id] &&
          statusByPlayerId[event.sub_in_player_id] !== 'sent_off'
        ) {
          statusByPlayerId[event.sub_in_player_id] = 'sub_in';
        }
        if (
          event.sub_out_player_id &&
          statusByPlayerId[event.sub_out_player_id] &&
          statusByPlayerId[event.sub_out_player_id] !== 'sent_off'
        ) {
          statusByPlayerId[event.sub_out_player_id] = 'sub_out';
        }
      }
    });

    for (const player of lineupPlayers || []) {
      const nextStatus = statusByPlayerId[player.id] || 'available';
      if ((player.player_status || 'available') === nextStatus) continue;
      const { error } = await supabase
        .from('match_lineup_players')
        .update({ player_status: nextStatus })
        .eq('id', player.id);
      if (error) return { error };
    }

    return { error: null };
  }, [matchId, supabase]);

  // Auth guard
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  // Fetch data
  useEffect(() => {
    if (isLoading || !user) return;

    async function fetchData() {
      const [matchResult, eventsResult] = await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).single(),
        supabase
          .from('match_events')
          .select('*')
          .eq('match_id', matchId)
          .order('sort_minute', { ascending: false })
          .order('created_at', { ascending: false }),
      ]);

      if (matchResult.data) {
        setMatch(matchResult.data);
        setShowThumbnail(Boolean(matchResult.data.display_status));
        // Fetch team names
        const homeTeamPromise = matchResult.data.home_team_id
          ? supabase
              .from('teams')
              .select('name')
              .eq('id', matchResult.data.home_team_id)
              .single()
          : Promise.resolve({ data: null });
        const awayTeamPromise = matchResult.data.away_team_id
          ? supabase
              .from('teams')
              .select('name')
              .eq('id', matchResult.data.away_team_id)
              .single()
          : Promise.resolve({ data: null });
        const [homeTeamResult, awayTeamResult] = await Promise.all([
          homeTeamPromise,
          awayTeamPromise,
        ]);
        setTeamNames({
          home:
            homeTeamResult.data?.name || matchResult.data.home_team || '홈팀',
          away:
            awayTeamResult.data?.name || matchResult.data.away_team || '원정팀',
        });
      }
      if (eventsResult.data) {
        const nextEvents = eventsResult.data as MatchEvent[];
        setEvents(nextEvents);
        applyTimeStateFromEvents(nextEvents);

        if (matchResult.data) {
          const homeGoals = nextEvents.filter(
            (event) =>
              event.event_type === 'goal' && event.team_side === 'HOME',
          ).length;
          const awayGoals = nextEvents.filter(
            (event) =>
              event.event_type === 'goal' && event.team_side === 'AWAY',
          ).length;

          if (
            homeGoals !== matchResult.data.home_score ||
            awayGoals !== matchResult.data.away_score
          ) {
            await supabase
              .from('matches')
              .update({ home_score: homeGoals, away_score: awayGoals })
              .eq('id', matchId);
            setMatch((prev) =>
              prev
                ? { ...prev, home_score: homeGoals, away_score: awayGoals }
                : prev,
            );
          }
        }
      } else {
        setEvents([]);
        setMatchTimes(EMPTY_MATCH_TIMES);
        setLastTimeRecord(null);
      }

      const { data: lineupData } = await supabase
        .from('match_lineups')
        .select('id, team_side')
        .eq('match_id', matchId);

      const homePlayers: Player[] = [];
      const awayPlayers: Player[] = [];

      if (lineupData?.length) {
        const lineupIds = lineupData.map((lineup: any) => lineup.id);
        const { data: lineupPlayersData } = await supabase
          .from('match_lineup_players')
          .select(
            'id, match_lineup_id, lineup_role, player_status, team_player:team_players!inner(name, jersey_number)',
          )
          .in('match_lineup_id', lineupIds);

        lineupPlayersData?.forEach((lp: any) => {
          const lineup = lineupData.find(
            (l: any) => l.id === lp.match_lineup_id,
          );
          if (!lineup) return;

          const player = {
            id: lp.id,
            name: lp.team_player?.name || '',
            number: lp.team_player?.jersey_number || 0,
            role: lp.lineup_role,
            status: lp.player_status || 'available',
          };

          if (lineup.team_side === 'HOME') {
            homePlayers.push(player);
          } else {
            awayPlayers.push(player);
          }
        });
      }

      setPlayers({ home: homePlayers, away: awayPlayers });
      await syncLineupPlayerStatusesFromEvents();
      setLoading(false);
    }

    fetchData();

    // Subscribe to realtime updates
    const eventsChannel = supabase
      .channel(`match-events-admin-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          fetchData();
        },
      )
      .subscribe();

    const matchChannel = supabase
      .channel(`match-admin-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        () => {
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [isLoading, user, matchId, supabase, syncLineupPlayerStatusesFromEvents]);

  // Initialize penalty kicks
  useEffect(() => {
    if (penaltyKicks.length === 0) {
      const initialKicks: PenaltyKick[] = [];
      for (let i = 1; i <= 5; i++) {
        initialKicks.push({ order: i, team: 'first', result: null });
        initialKicks.push({ order: i, team: 'second', result: null });
      }
      setPenaltyKicks(initialKicks);
    }
  }, [penaltyKicks.length]);

  useEffect(() => {
    if (match?.status?.toLowerCase() !== 'live') return;
    const interval = setInterval(() => {
      setClockTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [match?.status]);

  const parseIsoTime = (value: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const getElapsedMinutes = (startValue: string, endDate = new Date()) => {
    const startDate = parseIsoTime(startValue);
    if (!startDate) return 0;
    return Math.max(
      0,
      Math.floor((endDate.getTime() - startDate.getTime()) / 60000),
    );
  };

  const getFirstHalfDuration = () => {
    if (matchTimes.first_half_end && matchTimes.first_half_start) {
      const halfEnd = parseIsoTime(matchTimes.first_half_end);
      if (halfEnd)
        return getElapsedMinutes(matchTimes.first_half_start, halfEnd);
    }
    if (matchTimes.first_half_start)
      return getElapsedMinutes(matchTimes.first_half_start);
    return 0;
  };

  const getSecondHalfDuration = () => {
    if (matchTimes.second_half_end && matchTimes.second_half_start) {
      const secondEnd = parseIsoTime(matchTimes.second_half_end);
      if (secondEnd)
        return getElapsedMinutes(matchTimes.second_half_start, secondEnd);
    }
    if (matchTimes.second_half_start)
      return getElapsedMinutes(matchTimes.second_half_start);
    return 0;
  };

  const getLiveClockLabel = () => {
    void clockTick;
    if (matchTimes.extra_end) return '연장 ET';
    if (matchTimes.extra_start) {
      return `연장 ${getElapsedMinutes(matchTimes.extra_start)}'`;
    }
    if (matchTimes.second_half_end) return '후반 FT';
    if (matchTimes.second_half_start) {
      return `후반 ${getElapsedMinutes(matchTimes.second_half_start)}'`;
    }
    if (matchTimes.first_half_end) return '전반 HT';
    if (matchTimes.first_half_start) {
      return `전반 ${getElapsedMinutes(matchTimes.first_half_start)}'`;
    }
    return 'LIVE';
  };

  const getCurrentPeriod = (): MatchPeriod => {
    if (matchTimes.extra_start && !matchTimes.extra_end) return '연장';
    if (matchTimes.second_half_start && !matchTimes.second_half_end) return '후반';
    if (matchTimes.first_half_start && !matchTimes.first_half_end) return '전반';
    if (matchTimes.extra_end) return '연장';
    if (matchTimes.second_half_end) return '후반';
    if (matchTimes.first_half_end) return '전반';
    return '전반';
  };

  const getCurrentDisplayMinute = () => {
    if (matchTimes.extra_end && matchTimes.extra_start) {
      const extraEndDate = parseIsoTime(matchTimes.extra_end);
      if (extraEndDate)
        return getElapsedMinutes(matchTimes.extra_start, extraEndDate);
    }
    if (matchTimes.extra_start) return getElapsedMinutes(matchTimes.extra_start);
    if (matchTimes.second_half_end && matchTimes.second_half_start) {
      const secondEndDate = parseIsoTime(matchTimes.second_half_end);
      if (secondEndDate)
        return getElapsedMinutes(matchTimes.second_half_start, secondEndDate);
    }
    if (matchTimes.second_half_start)
      return getElapsedMinutes(matchTimes.second_half_start);
    if (matchTimes.first_half_end && matchTimes.first_half_start) {
      const firstEndDate = parseIsoTime(matchTimes.first_half_end);
      if (firstEndDate)
        return getElapsedMinutes(matchTimes.first_half_start, firstEndDate);
    }
    if (matchTimes.first_half_start) return getElapsedMinutes(matchTimes.first_half_start);
    return 0;
  };

  const toSortMinute = (period: MatchPeriod, displayMinute: number) => {
    const firstHalfAccumulated = getFirstHalfDuration();
    const secondHalfAccumulated = getSecondHalfDuration();
    const regularAccumulated = firstHalfAccumulated + secondHalfAccumulated;

    if (period === '전반') return displayMinute;
    if (period === '후반') return firstHalfAccumulated + displayMinute;
    return regularAccumulated + displayMinute;
  };

  const getPenaltyTiming = () => {
    if (matchTimes.extra_end && matchTimes.extra_start) {
      const extraEndDate = parseIsoTime(matchTimes.extra_end);
      if (extraEndDate) {
        const displayMinute = getElapsedMinutes(matchTimes.extra_start, extraEndDate);
        return {
          period: '연장' as MatchPeriod,
          displayMinute,
          sortMinute: toSortMinute('연장', displayMinute),
        };
      }
    }

    const period = getCurrentPeriod();
    const displayMinute = getCurrentDisplayMinute();
    return {
      period,
      displayMinute,
      sortMinute: toSortMinute(period, displayMinute),
    };
  };

  const formatStoredTime = (value: string) => {
    const parsed = parseIsoTime(value);
    if (!parsed) return value;
    return parsed.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const getPlayers = useCallback(
    (team: 'home' | 'away') => {
      return team === 'home' ? players.home : players.away;
    },
    [players],
  );

  const getPlayersByRole = useCallback(
    (team: 'home' | 'away', role: 'STARTER' | 'SUBSTITUTE') => {
      return getPlayers(team).filter((player) => player.role === role);
    },
    [getPlayers],
  );

  const getSubstitutionInCandidates = useCallback(
    (team: 'home' | 'away') =>
      getPlayers(team).filter(
        (player) =>
          player.status !== 'sub_out' && player.status !== 'sent_off',
      ),
    [getPlayers],
  );

  const getSubstitutionOutCandidates = useCallback(
    (team: 'home' | 'away') =>
      getPlayers(team).filter((player) => {
        const canBeOutByRole = player.role === 'STARTER';
        const canBeOutByStatus = player.status === 'sub_in';
        const blocked = player.status === 'sub_out' || player.status === 'sent_off';
        return (canBeOutByRole || canBeOutByStatus) && !blocked;
      }),
    [getPlayers],
  );

  const resetForm = () => {
    setSelectedTeam('');
    setSelectedPlayer('');
    setSelectedPlayerOut('');
    setSelectedAssistPlayer('');
    setCardType('yellow_card');
    setInputMinute('');
    setActivePanel(null);
  };

  const handleSaveEvent = async () => {
    if (!selectedTeam || !selectedPlayer || !match) return;

    const supabase = createClient() as any;
    const displayMinute = inputMinute ? parseInt(inputMinute) : 0;
    const period = getCurrentPeriod();
    const sortMinute = toSortMinute(period, displayMinute);
    const teamPlayers = getPlayers(selectedTeam as 'home' | 'away');
    const substitutionInCandidates = getSubstitutionInCandidates(
      selectedTeam as 'home' | 'away',
    );
    const substitutionOutCandidates = getSubstitutionOutCandidates(
      selectedTeam as 'home' | 'away',
    );
    const starterPlayers = getPlayersByRole(
      selectedTeam as 'home' | 'away',
      'STARTER',
    );
    const player = teamPlayers.find((p) => p.id === selectedPlayer);

    if (!player) return;

    const eventType =
      activePanel === 'yellow_card' || activePanel === 'red_card'
        ? cardType
        : activePanel!;

    if (
      (activePanel === 'goal' ||
        activePanel === 'yellow_card' ||
        activePanel === 'red_card') &&
      !starterPlayers.some((p) => p.id === selectedPlayer)
    ) {
      toast({
        title: '선수 선택 오류',
        description:
          '득점/경고/퇴장은 선발(STARTER) 선수만 선택할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }

    if (
      activePanel === 'substitution' &&
      !substitutionInCandidates.some((p) => p.id === selectedPlayer)
    ) {
      toast({
        title: '선수 선택 오류',
        description:
          '교체 IN은 퇴장/교체아웃 상태가 아닌 선수만 선택할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }

    let description = '';
    let assistPlayerId = null;
    let substitutedInPlayerId = null;
    let substitutedOutPlayerId = null;

    if (
      activePanel === 'goal' &&
      selectedAssistPlayer &&
      selectedAssistPlayer !== 'none'
    ) {
      const assistPlayer = teamPlayers.find(
        (p) => p.id === selectedAssistPlayer,
      );
      if (assistPlayer) {
        description = `어시스트: #${assistPlayer.number} ${assistPlayer.name}`;
        assistPlayerId = assistPlayer.id;
      }
    }
    if (activePanel === 'substitution' && selectedPlayerOut) {
      const playerOut = substitutionOutCandidates.find(
        (p) => p.id === selectedPlayerOut,
      );
      if (playerOut) {
        description = playerOut.name;
        substitutedInPlayerId = player.id;
        substitutedOutPlayerId = playerOut.id;
      } else {
        toast({
          title: '선수 선택 오류',
          description:
            '교체 OUT은 선발 선수 또는 교체 투입(sub_in) 선수만 선택할 수 있습니다.',
          variant: 'destructive',
        });
        return;
      }
    }

    const payload = {
      match_id: matchId,
      event_type: eventType,
      team_side: selectedTeam.toUpperCase(),
      player_id: player.id,
      sort_minute: sortMinute,
      display_minute: displayMinute,
      period,
      description,
      assist_player_id: assistPlayerId,
      sub_in_player_id: substitutedInPlayerId,
      sub_out_player_id: substitutedOutPlayerId,
      created_at: new Date().toISOString(),
    };

    const { data: insertedEvent, error } = await supabase
      .from('match_events')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error('Error saving event:', error);
      return;
    }

    const { error: statusSyncError } = await syncLineupPlayerStatusesFromEvents();
    if (statusSyncError) {
      console.error('Error syncing lineup player statuses:', statusSyncError);
      if (insertedEvent?.id) {
        await supabase.from('match_events').delete().eq('id', insertedEvent.id);
      }
      toast({
        title: '선수 상태 반영 실패',
        description: statusSyncError.message,
        variant: 'destructive',
      });
      return;
    }

    await refreshEvents();
    await syncMatchScoreFromEvents();

    resetForm();
  };

  const handleStartMatch = async () => {
    const { error } = await supabase
      .from('matches')
      .update({ status: 'LIVE' })
      .eq('id', matchId);

    if (error) {
      toast({
        title: '경기 시작 실패',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: '경기가 시작되었습니다' });
      setMatch((prev) => (prev ? { ...prev, status: 'LIVE' } : null));
    }
  };

  const handleEndMatch = async () => {
    const { error } = await supabase
      .from('matches')
      .update({ status: 'ENDED' })
      .eq('id', matchId);

    if (error) {
      toast({
        title: '경기 종료 실패',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: '경기가 종료되었습니다' });
      setMatch((prev) =>
        prev ? { ...prev, status: 'ENDED' as Match['status'] } : null,
      );
    }
  };

  const handleToggleDisplayStatus = async (checked: boolean) => {
    setShowThumbnail(checked);

    const { error } = await supabase
      .from('matches')
      .update({ display_status: checked })
      .eq('id', matchId);

    if (error) {
      setShowThumbnail((prev) => !prev);
      toast({
        title: '표시 상태 변경 실패',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setMatch((prev) => (prev ? { ...prev, display_status: checked } : prev));
  };

  const handleSetTime = async (timeType: TimeType) => {
    if (timeType === 'first_half_start' && match?.status?.toLowerCase() !== 'live') {
      toast({
        title: '경기 시작 필요',
        description: '전반 시작 전에 먼저 경기 시작 버튼을 눌러주세요.',
        variant: 'destructive',
      });
      return;
    }

    // 순서 검증
    const timeOrder: TimeType[] = [
      'first_half_start',
      'first_half_end',
      'second_half_start',
      'second_half_end',
      'extra_start',
      'extra_end',
    ];
    const currentIndex = timeOrder.indexOf(timeType);

    // 이전 단계가 완료되었는지 확인
    for (let i = 0; i < currentIndex; i++) {
      if (!matchTimes[timeOrder[i]]) {
        const labels: Record<TimeType, string> = {
          first_half_start: '전반 시작',
          first_half_end: '전반 종료',
          second_half_start: '후반 시작',
          second_half_end: '후반 종료',
          extra_start: '연장 시작',
          extra_end: '연장 종료',
        };
        toast({
          title: '순서 오류',
          description: `${labels[timeOrder[i]]}을(를) 먼저 기록해주세요.`,
          variant: 'destructive',
        });
        return;
      }
    }

    const nowDate = new Date();
    const nowIso = nowDate.toISOString();
    const nowDisplay = nowDate.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    setMatchTimes((prev) => ({ ...prev, [timeType]: nowIso }));

    // 이벤트 타임라인에 기록
    const timeLabels: Record<TimeType, string> = {
      first_half_start: '전반 시작',
      first_half_end: '전반 종료',
      second_half_start: '후반 시작',
      second_half_end: '후반 종료',
      extra_start: '연장 시작',
      extra_end: '연장 종료',
    };

    const firstHalfDuration = getFirstHalfDuration();
    const secondHalfDuration = getSecondHalfDuration();
    const regularTotal = firstHalfDuration + secondHalfDuration;
    const minuteValues: Record<TimeType, number> = {
      first_half_start: 0,
      first_half_end: firstHalfDuration,
      second_half_start: firstHalfDuration,
      second_half_end: regularTotal,
      extra_start: regularTotal,
      extra_end: regularTotal + getElapsedMinutes(matchTimes.extra_start),
    };

    const displayMinuteValues: Record<TimeType, number> = {
      first_half_start: 0,
      first_half_end: firstHalfDuration,
      second_half_start: 0,
      second_half_end: secondHalfDuration,
      extra_start: 0,
      extra_end: getElapsedMinutes(matchTimes.extra_start),
    };

    const periodValues: Record<TimeType, MatchPeriod> = {
      first_half_start: '전반',
      first_half_end: '전반',
      second_half_start: '후반',
      second_half_end: '후반',
      extra_start: '연장',
      extra_end: '연장',
    };

    const timeDescription = `${timeLabels[timeType]} (${nowDisplay})`;
    const timeEventType = TIME_TYPE_TO_TIME_EVENT[timeType];

    const { data: insertedTimeEvent, error: insertError } = await supabase
      .from('match_events')
      .insert({
        match_id: matchId,
        event_type: timeEventType,
        team_side: 'NONE',
        player_id: null,
        sort_minute: minuteValues[timeType],
        display_minute: displayMinuteValues[timeType],
        period: periodValues[timeType],
        description: timeDescription,
        assist_player_id: null,
        sub_in_player_id: null,
        sub_out_player_id: null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error saving time record:', insertError);
      const isMissingEnumValue =
        insertError.code === '22P02' &&
        insertError.message?.includes('match_event_type');
      toast({
        title: '시간 기록 실패',
        description: isMissingEnumValue
          ? 'DB enum(match_event_type) 값이 현재 코드와 다릅니다. 시간 관련 enum 값을 확인해주세요.'
          : insertError.message,
        variant: 'destructive',
      });
      return;
    }

    if (insertedTimeEvent?.id) {
      setLastTimeRecord({ type: timeType, eventId: insertedTimeEvent.id });
    }

    // 이벤트 목록 새로고침
    await refreshEvents();
    await syncMatchScoreFromEvents();
  };

  const handleUndoLatestEvent = async () => {
    if (events.length === 0) return;

    // DB에서 이벤트 삭제
    const latestEvent = [...events].sort(
      (a, b) =>
        b.sort_minute - a.sort_minute ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];

    const { error } = await supabase
      .from('match_events')
      .delete()
      .eq('id', latestEvent.id);

    // 로컬 상태 초기화
    if (error) {
      console.error('Error undoing latest event:', error);
      toast({
        title: '되돌리기 실패',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    await refreshEvents();
    const { error: statusSyncError } = await syncLineupPlayerStatusesFromEvents();
    if (statusSyncError) {
      console.error('Error syncing lineup player statuses:', statusSyncError);
      toast({
        title: '선수 상태 반영 실패',
        description: statusSyncError.message,
        variant: 'destructive',
      });
      return;
    }

    // 이벤트 목록 새로고침
    await syncMatchScoreFromEvents();
  };

  const handlePenaltyResult = async (result: 'success' | 'fail') => {
    const currentRound = currentPenaltyRound;
    const currentTeam = currentPenaltyTeam;
    const firstTeamSide = penaltyFirstTeam === 'home' ? 'HOME' : 'AWAY';
    const kickingTeamSide =
      currentTeam === 'first'
        ? firstTeamSide
        : firstTeamSide === 'HOME'
          ? 'AWAY'
          : 'HOME';
    const kickingTeamName =
      kickingTeamSide === 'HOME' ? teamNames.home : teamNames.away;
    const resultLabel = result === 'success' ? '성공' : '실패';
    // 현재 키커 결과 기록
    setPenaltyKicks((prev) =>
      prev.map((kick) =>
        kick.order === currentRound && kick.team === currentTeam
          ? { ...kick, result }
          : kick,
      ),
    );

    const penaltyDescription = `승부차기 ${currentRound}번 키커 - ${kickingTeamName}: ${resultLabel}`;
    const penaltyTiming = getPenaltyTiming();
    const { error: penaltyEventError } = await supabase
      .from('match_events')
      .insert({
        match_id: matchId,
        event_type: result === 'success' ? 'shootout_goal' : 'shootout_missed',
        team_side: kickingTeamSide,
        player_id: null,
        sort_minute: penaltyTiming.sortMinute,
        display_minute: penaltyTiming.displayMinute,
        period: penaltyTiming.period,
        description: penaltyDescription,
        assist_player_id: null,
        sub_in_player_id: null,
        sub_out_player_id: null,
        created_at: new Date().toISOString(),
      });

    if (penaltyEventError) {
      console.error('Error saving penalty record:', penaltyEventError);
      toast({
        title: '승부차기 기록 실패',
        description: penaltyEventError.message,
        variant: 'destructive',
      });
    } else {
      await refreshEvents();
    }

    // 다음 키커로 자동 이동
    if (currentTeam === 'first') {
      // 선공 → 후공
      setCurrentPenaltyTeam('second');
    } else {
      // 후공 → 다음 라운드 선공
      const nextRound = currentRound + 1;
      // 새 라운드 추가 (기존에 없으면)
      const hasNextRound = penaltyKicks.some((k) => k.order === nextRound);
      if (!hasNextRound) {
        setPenaltyKicks((prev) => [
          ...prev,
          { order: nextRound, team: 'first', result: null },
          { order: nextRound, team: 'second', result: null },
        ]);
      }
      setCurrentPenaltyRound(nextRound);
      setCurrentPenaltyTeam('first');
    }
  };

  const handleUndoPenalty = () => {
    // 이전 키커로 되돌리기
    if (currentPenaltyTeam === 'second') {
      // 후공 → 선공으로 되돌리기
      const firstKick = penaltyKicks.find(
        (k) => k.order === currentPenaltyRound && k.team === 'first',
      );
      if (firstKick?.result) {
        setPenaltyKicks((prev) =>
          prev.map((kick) =>
            kick.order === currentPenaltyRound && kick.team === 'first'
              ? { ...kick, result: null }
              : kick,
          ),
        );
        setCurrentPenaltyTeam('first');
      }
    } else if (currentPenaltyRound > 1) {
      // 선공 → ���전 라운드 후공으로 되돌리기
      const prevRound = currentPenaltyRound - 1;
      const secondKick = penaltyKicks.find(
        (k) => k.order === prevRound && k.team === 'second',
      );
      if (secondKick?.result) {
        setPenaltyKicks((prev) =>
          prev.map((kick) =>
            kick.order === prevRound && kick.team === 'second'
              ? { ...kick, result: null }
              : kick,
          ),
        );
        setCurrentPenaltyRound(prevRound);
        setCurrentPenaltyTeam('second');
      }
    }
  };

  const canUndoPenalty = () => {
    if (currentPenaltyTeam === 'second') {
      const firstKick = penaltyKicks.find(
        (k) => k.order === currentPenaltyRound && k.team === 'first',
      );
      return firstKick?.result !== null;
    } else if (currentPenaltyRound > 1) {
      const prevSecondKick = penaltyKicks.find(
        (k) => k.order === currentPenaltyRound - 1 && k.team === 'second',
      );
      return prevSecondKick?.result !== null;
    }
    return false;
  };

  const getPenaltyScore = () => {
    const firstTeamScore = penaltyKicks.filter(
      (k) => k.team === 'first' && k.result === 'success',
    ).length;
    const secondTeamScore = penaltyKicks.filter(
      (k) => k.team === 'second' && k.result === 'success',
    ).length;
    return { first: firstTeamScore, second: secondTeamScore };
  };

  const getPlayerDisplayByLineupPlayerId = useCallback(
    (lineupPlayerId: string | null | undefined) => {
      if (!lineupPlayerId) return '';
      const found = [...players.home, ...players.away].find(
        (p) => p.id === lineupPlayerId,
      );
      if (!found) return '';
      return `#${found.number} ${found.name}`;
    },
    [players],
  );

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'goal':
        return <Goal className="size-4" />;
      case 'yellow_card':
        return <div className="size-3 rounded-sm bg-yellow-400" />;
      case 'red_card':
        return <div className="size-3 rounded-sm bg-red-500" />;
      case 'substitution':
        return <RefreshCw className="size-4" />;
      case 'half_start':
      case 'half_end':
      case 'second_half_start':
      case 'second_half_end':
      case 'extra':
      case 'extra_time_start':
      case 'extra_time_end':
      case 'shootout_goal':
      case 'shootout_missed':
        return <Timer className="size-4" />;
      default:
        return null;
    }
  };

  const getEventLabel = (event: MatchEvent) => {
    const scorerName = getPlayerDisplayByLineupPlayerId(event.player_id) || '';
    const subInName =
      getPlayerDisplayByLineupPlayerId(event.sub_in_player_id) || '';
    const subOutName =
      getPlayerDisplayByLineupPlayerId(event.sub_out_player_id) ||
      event.description ||
      '';

    switch (event.event_type) {
      case 'goal':
        return event.description
          ? `${scorerName} 득점 (${event.description})`
          : `${scorerName} 득점`;
      case 'yellow_card':
        return `${scorerName} 경고`;
      case 'red_card':
        return `${scorerName} 퇴장`;
      case 'substitution':
        return subOutName
          ? `${subOutName} OUT / ${subInName} IN`
          : `${subInName} IN`;
      case 'half_start':
      case 'half_end':
      case 'second_half_start':
      case 'second_half_end':
      case 'extra':
      case 'extra_time_start':
      case 'extra_time_end':
        return event.description || '시간 기록';
      default:
        return scorerName || event.description || '이벤트';
    }
  };

  if (!user) {
    return null;
  }

  if (loading || !match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const penaltyScore = getPenaltyScore();
  const firstTeamName =
    penaltyFirstTeam === 'home' ? teamNames.home : teamNames.away;
  const secondTeamName =
    penaltyFirstTeam === 'home' ? teamNames.away : teamNames.home;
  const shootoutHomeScore = events.filter(
    (event) => event.event_type === 'shootout_goal' && event.team_side === 'HOME',
  ).length;
  const shootoutAwayScore = events.filter(
    (event) => event.event_type === 'shootout_goal' && event.team_side === 'AWAY',
  ).length;
  const hasShootoutResult = shootoutHomeScore + shootoutAwayScore > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header - Score & Controls */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        {/* Top bar */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/manager')}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/manager/match/${matchId}/lineup`)}
            >
              <Users className="size-5" />
            </Button>
          </div>
          {match.status.toLowerCase() === 'scheduled' && (
            <Button size="sm" onClick={handleStartMatch}>
              경기 시작
            </Button>
          )}
          <Badge
            className={
              match.status.toLowerCase() === 'live'
                ? 'bg-destructive text-destructive-foreground'
                : match.status.toLowerCase() === 'ended'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-secondary'
            }
          >
            {match.status.toLowerCase() === 'live' && (
              <span className="relative flex size-2 mr-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive-foreground opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-destructive-foreground" />
              </span>
            )}
            {match.status.toLowerCase() === 'live'
              ? 'LIVE'
              : match.status.toLowerCase() === 'scheduled'
                ? '예정'
                : '종료'}
          </Badge>
          <div className="flex items-center gap-3">
            {match.status.toLowerCase() === 'live' && (
              <Button size="sm" variant="destructive" onClick={handleEndMatch}>
                경기 종료
              </Button>
            )}
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-muted-foreground" />
              <Switch
                checked={showThumbnail}
                onCheckedChange={handleToggleDisplayStatus}
              />
            </div>
          </div>
        </div>

        {/* Thumbnail overlay indicator */}
        {showThumbnail && (
          <div className="px-4 py-2 bg-accent/20 border-b border-border">
            <p className="text-xs text-accent text-center font-medium">
              썸네일 오버레이 활성화 - 시청자에게 대기 화면이 표시됩니다
            </p>
          </div>
        )}

        {/* Score display */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-foreground truncate">
                {teamNames.home}
              </p>
            </div>
            <div className="px-4 text-center">
              <p className="text-3xl font-bold text-foreground">
                {match.home_score} : {match.away_score}
              </p>
              {match.status.toLowerCase() === 'ended' &&
                hasShootoutResult && (
                  <p className="text-xs text-muted-foreground mt-1">
                    PSO {shootoutHomeScore}-{shootoutAwayScore}
                  </p>
                )}
              {match.status.toLowerCase() === 'live' && (
                <div className="flex items-center justify-center gap-1 text-primary text-sm font-medium mt-1">
                  <Clock className="size-3" />
                  {
                    getLiveClockLabel() /* 
                    // 경기 진행 시간 계산
                    const now = new Date();
                    if (
                      matchTimes.second_half_start &&
                      !matchTimes.second_half_end
                    ) {
                      const start = new Date(matchTimes.second_half_start);
                      const minutes =
                        Math.floor((now.getTime() - start.getTime()) / 60000) +
                        45;
                      return `${minutes}'`;
                    } else if (
                      matchTimes.first_half_start &&
                      !matchTimes.first_half_end
                    ) {
                      const start = new Date(matchTimes.first_half_start);
                      const minutes = Math.floor(
                        (now.getTime() - start.getTime()) / 60000,
                      );
                      return `${minutes}'`;
                    } else if (
                      matchTimes.first_half_end &&
                      !matchTimes.second_half_start
                    ) {
                      return 'HT';
                    } else if (
                      matchTimes.extra_start &&
                      !matchTimes.extra_end
                    ) {
                      const start = new Date(matchTimes.extra_start);
                      const minutes =
                        Math.floor((now.getTime() - start.getTime()) / 60000) +
                        90;
                      return `${minutes}'`;
                    }
                    return 'LIVE';
                  */
                  }
                </div>
              )}
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-foreground truncate">
                {teamNames.away}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Action Buttons */}
      <div className="px-4 py-3 bg-secondary/30 border-b border-border">
        <div className="grid grid-cols-3 gap-2 mb-2">
          <Button
            size="lg"
            variant={activePanel === 'goal' ? 'default' : 'secondary'}
            className="h-14 flex-col gap-1"
            onClick={() => {
              const nextPanel = activePanel === 'goal' ? null : 'goal';
              resetForm();
              setActivePanel(nextPanel);
              if (nextPanel) {
                setInputMinute(String(getCurrentDisplayMinute()));
              }
              setShowTimePanel(false);
              setShowPenaltyPanel(false);
            }}
          >
            <Goal className="size-5" />
            <span className="text-xs">득점 추가</span>
          </Button>
          <Button
            size="lg"
            variant={
              activePanel === 'yellow_card' || activePanel === 'red_card'
                ? 'default'
                : 'secondary'
            }
            className="h-14 flex-col gap-1"
            onClick={() => {
              const nextPanel =
                activePanel === 'yellow_card' || activePanel === 'red_card'
                  ? null
                  : 'yellow_card';
              resetForm();
              setActivePanel(nextPanel);
              if (nextPanel) {
                setInputMinute(String(getCurrentDisplayMinute()));
              }
              setShowTimePanel(false);
              setShowPenaltyPanel(false);
            }}
          >
            <Square className="size-5" />
            <span className="text-xs">경고/퇴장</span>
          </Button>
          <Button
            size="lg"
            variant={activePanel === 'substitution' ? 'default' : 'secondary'}
            className="h-14 flex-col gap-1"
            onClick={() => {
              const nextPanel =
                activePanel === 'substitution' ? null : 'substitution';
              resetForm();
              setActivePanel(nextPanel);
              if (nextPanel) {
                setInputMinute(String(getCurrentDisplayMinute()));
              }
              setShowTimePanel(false);
              setShowPenaltyPanel(false);
            }}
          >
            <RefreshCw className="size-5" />
            <span className="text-xs">교체 추가</span>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            variant={showTimePanel ? 'default' : 'secondary'}
            className="h-12 flex-col gap-1"
            onClick={() => {
              resetForm();
              setShowTimePanel(!showTimePanel);
              setShowPenaltyPanel(false);
            }}
          >
            <Timer className="size-5" />
            <span className="text-xs">시간 입력</span>
          </Button>
          <Button
            size="lg"
            variant={showPenaltyPanel ? 'default' : 'secondary'}
            className="h-12 flex-col gap-1"
            onClick={() => {
              resetForm();
              setShowPenaltyPanel(!showPenaltyPanel);
              setShowTimePanel(false);
            }}
          >
            <CircleDot className="size-5" />
            <span className="text-xs">승부차기</span>
          </Button>
        </div>
      </div>

      {/* Time Input Panel */}
      {showTimePanel && (
        <div className="px-4 py-4 bg-card border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">경기 시간 기록</h3>
            <div className="flex items-center gap-2">
              {false && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndoLatestEvent}
                >
                  <Undo2 className="size-4 mr-1" />
                  되돌리기
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTimePanel(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* 전반 */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium text-center">
                전반
              </p>
              <Button
                variant={matchTimes.first_half_start ? 'default' : 'outline'}
                className="w-full h-10 text-xs"
                onClick={() => handleSetTime('first_half_start')}
              >
                {matchTimes.first_half_start
                  ? `시작 : ${formatStoredTime(matchTimes.first_half_start)}`
                  : '시작'}
              </Button>
              <Button
                variant={matchTimes.first_half_end ? 'default' : 'outline'}
                className="w-full h-10 text-xs"
                onClick={() => handleSetTime('first_half_end')}
              >
                {matchTimes.first_half_end
                  ? `종료 : ${formatStoredTime(matchTimes.first_half_end)}`
                  : '종료'}
              </Button>
            </div>
            {/* 후반 */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium text-center">
                후반
              </p>
              <Button
                variant={matchTimes.second_half_start ? 'default' : 'outline'}
                className="w-full h-10 text-xs"
                onClick={() => handleSetTime('second_half_start')}
              >
                {matchTimes.second_half_start
                  ? `시작 : ${formatStoredTime(matchTimes.second_half_start)}`
                  : '시작'}
              </Button>
              <Button
                variant={matchTimes.second_half_end ? 'default' : 'outline'}
                className="w-full h-10 text-xs"
                onClick={() => handleSetTime('second_half_end')}
              >
                {matchTimes.second_half_end
                  ? `종료 : ${formatStoredTime(matchTimes.second_half_end)}`
                  : '종료'}
              </Button>
            </div>
            {/* 연장 */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium text-center">
                연장
              </p>
              <Button
                variant={matchTimes.extra_start ? 'default' : 'outline'}
                className="w-full h-10 text-xs"
                onClick={() => handleSetTime('extra_start')}
              >
                {matchTimes.extra_start
                  ? `시작 : ${formatStoredTime(matchTimes.extra_start)}`
                  : '시작'}
              </Button>
              <Button
                variant={matchTimes.extra_end ? 'default' : 'outline'}
                className="w-full h-10 text-xs"
                onClick={() => handleSetTime('extra_end')}
              >
                {matchTimes.extra_end
                  ? `종료 : ${formatStoredTime(matchTimes.extra_end)}`
                  : '종료'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Penalty Shootout Panel */}
      {showPenaltyPanel && (
        <div className="px-4 py-4 bg-card border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">승부차기 기록</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPenaltyPanel(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* First kick team selection */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">
              선공 팀
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={penaltyFirstTeam === 'home' ? 'default' : 'outline'}
                className="h-10"
                onClick={() => setPenaltyFirstTeam('home')}
              >
                {teamNames.home}
              </Button>
              <Button
                variant={penaltyFirstTeam === 'away' ? 'default' : 'outline'}
                className="h-10"
                onClick={() => setPenaltyFirstTeam('away')}
              >
                {teamNames.away}
              </Button>
            </div>
          </div>

          {/* Score display */}
          <div className="flex items-center justify-center gap-4 mb-4 py-3 bg-secondary/30 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {firstTeamName} (선공)
              </p>
              <p className="text-2xl font-bold text-primary">
                {penaltyScore.first}
              </p>
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {secondTeamName} (후공)
              </p>
              <p className="text-2xl font-bold text-primary">
                {penaltyScore.second}
              </p>
            </div>
          </div>

          {/* Current kicker input */}
          <div className="bg-secondary/20 rounded-lg p-4 mb-4">
            <div className="text-center mb-3">
              <span className="text-sm font-bold text-primary">
                {currentPenaltyRound}번 키커
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                (
                {currentPenaltyTeam === 'first'
                  ? firstTeamName
                  : secondTeamName}
                )
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                variant="outline"
                className="h-16 text-xl font-bold border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => handlePenaltyResult('success')}
              >
                O 성공
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-16 text-xl font-bold border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handlePenaltyResult('fail')}
              >
                X 실패
              </Button>
            </div>
          </div>

          {/* Undo button */}
          {false && canUndoPenalty() && (
            <Button
              variant="outline"
              className="w-full mb-4"
              onClick={handleUndoPenalty}
            >
              <Undo2 className="size-4 mr-2" />
              이전으로 되돌리기
            </Button>
          )}

          {/* Kick history */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium mb-2">
              기록
            </p>
            <div className="flex flex-wrap gap-1">
              {Array.from(new Set(penaltyKicks.map((k) => k.order))).map(
                (order) => {
                  const firstKick = penaltyKicks.find(
                    (k) => k.order === order && k.team === 'first',
                  );
                  const secondKick = penaltyKicks.find(
                    (k) => k.order === order && k.team === 'second',
                  );

                  return (
                    <div
                      key={order}
                      className="flex items-center gap-1 text-xs bg-secondary/30 px-2 py-1 rounded"
                    >
                      <span className="text-muted-foreground">{order}.</span>
                      <span
                        className={
                          firstKick?.result === 'success'
                            ? 'text-primary font-bold'
                            : firstKick?.result === 'fail'
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                        }
                      >
                        {firstKick?.result === 'success'
                          ? 'O'
                          : firstKick?.result === 'fail'
                            ? 'X'
                            : '-'}
                      </span>
                      <span className="text-muted-foreground">:</span>
                      <span
                        className={
                          secondKick?.result === 'success'
                            ? 'text-primary font-bold'
                            : secondKick?.result === 'fail'
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                        }
                      >
                        {secondKick?.result === 'success'
                          ? 'O'
                          : secondKick?.result === 'fail'
                            ? 'X'
                            : '-'}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input Panel */}
      {activePanel && (
        <div className="px-4 py-4 bg-card border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">
              {activePanel === 'goal' && '득점 기록'}
              {(activePanel === 'yellow_card' || activePanel === 'red_card') &&
                '경고/퇴장 기록'}
              {activePanel === 'substitution' && '교체 기록'}
            </h3>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {/* Team Select */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedTeam === 'home' ? 'default' : 'outline'}
                className="h-12"
                onClick={() => {
                  setSelectedTeam('home');
                  setSelectedPlayer('');
                  setSelectedPlayerOut('');
                  setSelectedAssistPlayer('');
                }}
              >
                {teamNames.home}
              </Button>
              <Button
                variant={selectedTeam === 'away' ? 'default' : 'outline'}
                className="h-12"
                onClick={() => {
                  setSelectedTeam('away');
                  setSelectedPlayer('');
                  setSelectedPlayerOut('');
                  setSelectedAssistPlayer('');
                }}
              >
                {teamNames.away}
              </Button>
            </div>

            {/* Card Type (for card events) */}
            {(activePanel === 'yellow_card' || activePanel === 'red_card') && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={cardType === 'yellow_card' ? 'default' : 'outline'}
                  className="h-12 gap-2"
                  onClick={() => setCardType('yellow_card')}
                >
                  <div className="size-4 rounded-sm bg-yellow-400" />
                  경고
                </Button>
                <Button
                  variant={cardType === 'red_card' ? 'default' : 'outline'}
                  className="h-12 gap-2"
                  onClick={() => setCardType('red_card')}
                >
                  <div className="size-4 rounded-sm bg-red-500" />
                  퇴장
                </Button>
              </div>
            )}

            {/* Player Select */}
            {selectedTeam && (
              <>
                <Select
                  value={selectedPlayer}
                  onValueChange={setSelectedPlayer}
                >
                  <SelectTrigger className="w-full h-12">
                    <SelectValue
                      placeholder={
                        activePanel === 'goal'
                          ? '득점 선수 선택'
                          : activePanel === 'substitution'
                            ? '교체 IN 선수 선택'
                            : '선수 선택'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(activePanel === 'substitution'
                      ? getSubstitutionInCandidates(selectedTeam as 'home' | 'away')
                      : getPlayersByRole(
                          selectedTeam as 'home' | 'away',
                          'STARTER',
                        )
                    ).map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        #{player.number} {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Assist Player Select (for goals) */}
                {activePanel === 'goal' && (
                  <Select
                    value={selectedAssistPlayer}
                    onValueChange={setSelectedAssistPlayer}
                  >
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="어시스트 선수 선택 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">없음</SelectItem>
                      {getPlayersByRole(
                        selectedTeam as 'home' | 'away',
                        'STARTER',
                      )
                        .filter((p) => p.id !== selectedPlayer)
                        .map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            #{player.number} {player.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Player Out Select (for substitution) */}
                {activePanel === 'substitution' && (
                  <Select
                    value={selectedPlayerOut}
                    onValueChange={setSelectedPlayerOut}
                  >
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="교체 OUT 선수 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSubstitutionOutCandidates(selectedTeam as 'home' | 'away')
                        .filter((p) => p.id !== selectedPlayer)
                        .map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            #{player.number} {player.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}

            {/* Minute Input */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="분"
                value={inputMinute}
                onChange={(e) => setInputMinute(e.target.value)}
                className="h-12 flex-1"
                min={1}
                max={120}
              />
            </div>

            {/* Save Button */}
            <Button
              className="w-full h-14 text-base font-semibold"
              disabled={
                !selectedTeam ||
                !selectedPlayer ||
                (activePanel === 'substitution' && !selectedPlayerOut)
              }
              onClick={handleSaveEvent}
            >
              저장하기
            </Button>
          </div>
        </div>
      )}

      {/* Event Timeline */}
      <main className="flex-1 px-4 py-4">
        {events.length > 0 && (
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={handleUndoLatestEvent}>
              <Undo2 className="size-4 mr-1" />
              되돌리기
            </Button>
          </div>
        )}
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          이벤트 타임라인
        </h3>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            아직 기록된 이벤트가 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event, index) => (
              <div
                key={
                  event.id ||
                  `${event.created_at}-${event.event_type}-${event.player_id || 'none'}-${index}`
                }
                className="flex items-center gap-3 bg-card border border-border rounded-lg p-3"
              >
                <div className="flex items-center justify-center size-8 rounded-full bg-secondary">
                  {getEventIcon(event.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {getEventLabel(event)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.team_side === 'HOME'
                      ? teamNames.home
                      : event.team_side === 'AWAY'
                        ? teamNames.away
                        : '-'}
                  </p>
                </div>
                <div className="text-sm font-medium text-primary">
                  {event.period ? `${event.period} ` : ''}
                  {event.display_minute ?? event.sort_minute ?? 0}&apos;
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
