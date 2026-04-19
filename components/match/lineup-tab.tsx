'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import type { Lineup, Match } from '@/lib/types';

interface LineupTabProps {
  matchId?: string;
}

interface Player {
  number: number;
  name: string;
  isCaptain?: boolean;
}

interface TeamLineup {
  teamName: string;
  starters: Player[];
  substitutes: Player[];
}

function PlayerRow({ player }: { player: Player }) {
  return (
    <div className="flex items-center justify-between py-2 px-3">
      <div className="flex items-center gap-3">
        <span className="w-6 text-center text-sm font-bold text-primary tabular-nums">
          {player.number}
        </span>
        <span className="text-sm text-foreground">
          {player.name}
          {player.isCaptain && (
            <span className="ml-1.5 text-[10px] text-accent font-bold">
              (C)
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function TeamSection({
  lineup,
  isAway,
}: {
  lineup: TeamLineup;
  isAway?: boolean;
}) {
  return (
    <div className={`flex-1 ${isAway ? 'border-l border-border' : ''}`}>
      <div className="px-3 py-2 bg-secondary/50">
        <div className="text-sm font-bold text-foreground">
          {lineup.teamName}
        </div>
      </div>

      <div className="px-1">
        <div className="text-xs text-muted-foreground px-3 py-2 border-b border-border/50">
          선발 ({lineup.starters.length}명)
        </div>
        {lineup.starters.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            라인업 없음
          </div>
        ) : (
          lineup.starters.map((player) => (
            <PlayerRow key={player.number} player={player} />
          ))
        )}

        <div className="text-xs text-muted-foreground px-3 py-2 border-b border-border/50 mt-2">
          교체 ({lineup.substitutes.length}명)
        </div>
        {lineup.substitutes.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            교체 선수 없음
          </div>
        ) : (
          lineup.substitutes.map((player) => (
            <PlayerRow key={player.number} player={player} />
          ))
        )}
      </div>
    </div>
  );
}

export function LineupTab({ matchId }: LineupTabProps) {
  const [match, setMatch] = useState<Match | null>(null);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    const supabase = createClient() as any;

    async function fetchData() {
      const matchResult = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      const { data: matchLineups } = await supabase
        .from('match_lineups')
        .select('id, team_side')
        .eq('match_id', matchId);

      let fetchedLineups: Lineup[] = [];

      if (matchLineups?.length) {
        const lineupIds = matchLineups.map((lineup: any) => lineup.id);
        const { data: lineupPlayersData } = await supabase
          .from('match_lineup_players')
          .select(
            'id, match_lineup_id, lineup_role, team_player:team_players!inner(name, jersey_number)',
          )
          .in('match_lineup_id', lineupIds);

        fetchedLineups =
          lineupPlayersData?.map((lp: any) => {
            const lineup = matchLineups.find(
              (item: any) => item.id === lp.match_lineup_id,
            );
            return {
              id: lp.id,
              match_id: matchId || '',
              team_side: (lineup?.team_side || 'HOME') as 'HOME' | 'AWAY',
              player_name: lp.team_player?.name || '',
              jersey_number: lp.team_player?.jersey_number || 0,
              is_starter: lp.lineup_role === 'STARTER',
              created_at: '',
            };
          }) || [];
      }

      if (matchResult.data) {
        const homeTeamPromise = matchResult.data.home_team_id
          ? supabase
              .from('teams')
              .select('name')
              .eq('id', matchResult.data.home_team_id)
              .single()
          : Promise.resolve({ data: null, error: null });
        const awayTeamPromise = matchResult.data.away_team_id
          ? supabase
              .from('teams')
              .select('name')
              .eq('id', matchResult.data.away_team_id)
              .single()
          : Promise.resolve({ data: null, error: null });

        const [homeTeamResult, awayTeamResult] = await Promise.all([
          homeTeamPromise,
          awayTeamPromise,
        ]);

        setMatch({
          ...matchResult.data,
          home_team: homeTeamResult.data?.name || matchResult.data.home_team,
          away_team: awayTeamResult.data?.name || matchResult.data.away_team,
        });
      }
      setLineups(fetchedLineups);
      setLoading(false);
    }

    fetchData();

    // Subscribe to realtime updates
    const lineupChannel = supabase
      .channel(`match-lineups-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_lineups',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          fetchData();
        },
      )
      .subscribe();

    const lineupPlayersChannel = supabase
      .channel(`match-lineup-players-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_lineup_players',
        },
        () => {
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(lineupChannel);
      supabase.removeChannel(lineupPlayersChannel);
    };
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const homeLineup: TeamLineup = {
    teamName: match?.home_team || '홈팀',
    starters: lineups
      .filter((l) => l.team_side === 'HOME' && l.is_starter)
      .map((l) => ({ number: l.jersey_number, name: l.player_name })),
    substitutes: lineups
      .filter((l) => l.team_side === 'HOME' && !l.is_starter)
      .map((l) => ({ number: l.jersey_number, name: l.player_name })),
  };

  const awayLineup: TeamLineup = {
    teamName: match?.away_team || '원정팀',
    starters: lineups
      .filter((l) => l.team_side === 'AWAY' && l.is_starter)
      .map((l) => ({ number: l.jersey_number, name: l.player_name })),
    substitutes: lineups
      .filter((l) => l.team_side === 'AWAY' && !l.is_starter)
      .map((l) => ({ number: l.jersey_number, name: l.player_name })),
  };

  return (
    <ScrollArea className="h-full">
      <div className="flex">
        <TeamSection lineup={homeLineup} />
        <TeamSection lineup={awayLineup} isAway />
      </div>
    </ScrollArea>
  );
}
