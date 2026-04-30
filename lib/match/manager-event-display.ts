import type { MatchEvent } from '@/lib/types';

export type TimelineIconType =
  | 'goal'
  | 'own_goal'
  | 'yellow_card'
  | 'red_card'
  | 'substitution'
  | 'time'
  | 'unknown';

export function getTimelineIconType(eventType: string): TimelineIconType {
  switch (eventType) {
    case 'goal':
      return 'goal';
    case 'own_goal':
      return 'own_goal';
    case 'yellow_card':
      return 'yellow_card';
    case 'red_card':
      return 'red_card';
    case 'substitution':
      return 'substitution';
    case 'half_start':
    case 'half_end':
    case 'second_half_start':
    case 'second_half_end':
    case 'extra':
    case 'extra_time_start':
    case 'extra_time_end':
    case 'shootout_goal':
    case 'shootout_missed':
      return 'time';
    default:
      return 'unknown';
  }
}

interface LabelDeps {
  getPlayerDisplayByLineupPlayerId: (id: string | null | undefined) => string;
}

export function getTimelineLabel(event: MatchEvent, deps: LabelDeps): string {
  const scorerName = deps.getPlayerDisplayByLineupPlayerId(event.player_id) || '';
  const subInName = deps.getPlayerDisplayByLineupPlayerId(event.sub_in_player_id) || '';
  const subOutName =
    deps.getPlayerDisplayByLineupPlayerId(event.sub_out_player_id) ||
    event.description ||
    '';

  switch (event.event_type) {
    case 'goal':
      return event.description
        ? `${scorerName} 득점 (${event.description})`
        : `${scorerName} 득점`;
    case 'own_goal':
      return `${scorerName} 자책골`;
    case 'yellow_card':
      return `${scorerName} 경고`;
    case 'red_card':
      return `${scorerName} 퇴장`;
    case 'substitution':
      return subOutName ? `${subOutName} OUT / ${subInName} IN` : `${subInName} IN`;
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
}

