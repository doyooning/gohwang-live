import type { MatchEvent } from '@/lib/types';

type SupabaseLike = any;

export async function fetchMatchById(supabase: SupabaseLike, matchId: string) {
  return supabase.from('matches').select('*').eq('id', matchId).single();
}

export async function fetchMatchEventsDesc(
  supabase: SupabaseLike,
  matchId: string,
) {
  return supabase
    .from('match_events')
    .select('*')
    .eq('match_id', matchId)
    .order('sort_minute', { ascending: false })
    .order('created_at', { ascending: false });
}

export async function fetchGoalEventsForScoreSync(
  supabase: SupabaseLike,
  matchId: string,
) {
  return supabase
    .from('match_events')
    .select('event_type, team_side')
    .eq('match_id', matchId)
    .in('event_type', ['goal', 'own_goal']);
}

export async function updateMatchScore(
  supabase: SupabaseLike,
  matchId: string,
  homeScore: number,
  awayScore: number,
) {
  return supabase
    .from('matches')
    .update({ home_score: homeScore, away_score: awayScore })
    .eq('id', matchId);
}

export async function fetchTeamNameById(
  supabase: SupabaseLike,
  teamId: string | null | undefined,
) {
  if (!teamId) return { data: null, error: null };
  return supabase.from('teams').select('name').eq('id', teamId).single();
}

export async function fetchLineupsByMatchId(
  supabase: SupabaseLike,
  matchId: string,
) {
  return supabase
    .from('match_lineups')
    .select('id, team_side')
    .eq('match_id', matchId);
}

export async function fetchLineupIdsByMatchId(
  supabase: SupabaseLike,
  matchId: string,
) {
  return supabase.from('match_lineups').select('id').eq('match_id', matchId);
}

export async function fetchLineupPlayersWithTeamPlayer(
  supabase: SupabaseLike,
  lineupIds: string[],
) {
  if (lineupIds.length === 0) return { data: [], error: null };
  return supabase
    .from('match_lineup_players')
    .select(
      'id, match_lineup_id, lineup_role, player_status, team_player:team_players!inner(name, jersey_number)',
    )
    .in('match_lineup_id', lineupIds);
}

export async function fetchLineupPlayersForStatusSync(
  supabase: SupabaseLike,
  lineupIds: string[],
) {
  if (lineupIds.length === 0) return { data: [], error: null };
  return supabase
    .from('match_lineup_players')
    .select('id, lineup_role, player_status')
    .in('match_lineup_id', lineupIds);
}

export async function fetchEventsForStatusSync(
  supabase: SupabaseLike,
  matchId: string,
) {
  return supabase
    .from('match_events')
    .select('event_type, player_id, sub_in_player_id, sub_out_player_id')
    .eq('match_id', matchId)
    .order('sort_minute', { ascending: true })
    .order('created_at', { ascending: true });
}

export async function updateLineupPlayerStatusAndRole(
  supabase: SupabaseLike,
  lineupPlayerId: string,
  playerStatus: 'available' | 'sub_in' | 'sub_out' | 'sent_off',
  lineupRole: 'STARTER' | 'SUBSTITUTE',
) {
  return supabase
    .from('match_lineup_players')
    .update({ player_status: playerStatus, lineup_role: lineupRole })
    .eq('id', lineupPlayerId);
}

export function computeScoreFromGoalEvents(
  goalEvents: Array<{ event_type: string; team_side: string }>,
) {
  let homeScore = 0;
  let awayScore = 0;
  goalEvents.forEach((event) => {
    if (event.event_type === 'goal') {
      if (event.team_side === 'HOME') homeScore += 1;
      if (event.team_side === 'AWAY') awayScore += 1;
    } else if (event.event_type === 'own_goal') {
      if (event.team_side === 'HOME') awayScore += 1;
      if (event.team_side === 'AWAY') homeScore += 1;
    }
  });
  return { homeScore, awayScore };
}

export function computeScoreFromTimelineEvents(events: MatchEvent[]) {
  return events.reduce(
    (acc, event) => {
      if (event.event_type === 'goal' && event.team_side === 'HOME') acc.home += 1;
      if (event.event_type === 'goal' && event.team_side === 'AWAY') acc.away += 1;
      if (event.event_type === 'own_goal' && event.team_side === 'AWAY') acc.home += 1;
      if (event.event_type === 'own_goal' && event.team_side === 'HOME') acc.away += 1;
      return acc;
    },
    { home: 0, away: 0 },
  );
}

