import type { MatchEvent } from '@/lib/types';

export type TimeType =
  | 'first_half_start'
  | 'first_half_end'
  | 'second_half_start'
  | 'second_half_end'
  | 'extra_start'
  | 'extra_end';

export interface MatchTimes {
  first_half_start: string;
  first_half_end: string;
  second_half_start: string;
  second_half_end: string;
  extra_start: string;
  extra_end: string;
}

export type MatchPeriod = '전반' | '후반' | '연장';

export type TimeEventType =
  | 'half_start'
  | 'half_end'
  | 'second_half_start'
  | 'second_half_end'
  | 'extra_time_start'
  | 'extra_time_end';

export const EMPTY_MATCH_TIMES: MatchTimes = {
  first_half_start: '',
  first_half_end: '',
  second_half_start: '',
  second_half_end: '',
  extra_start: '',
  extra_end: '',
};

export const TIME_EVENT_TO_TIME_TYPE: Record<TimeEventType, TimeType> = {
  half_start: 'first_half_start',
  half_end: 'first_half_end',
  second_half_start: 'second_half_start',
  second_half_end: 'second_half_end',
  extra_time_start: 'extra_start',
  extra_time_end: 'extra_end',
};

export const TIME_TYPE_TO_TIME_EVENT: Record<TimeType, TimeEventType> = {
  first_half_start: 'half_start',
  first_half_end: 'half_end',
  second_half_start: 'second_half_start',
  second_half_end: 'second_half_end',
  extra_start: 'extra_time_start',
  extra_end: 'extra_time_end',
};

export function isTimeEventType(eventType: string): eventType is TimeEventType {
  return eventType in TIME_EVENT_TO_TIME_TYPE;
}

export function deriveMatchTimesFromEvents(eventRows: MatchEvent[]): {
  times: MatchTimes;
  lastTimeRecord: { type: TimeType; eventId: string } | null;
} {
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

  return { times: nextTimes, lastTimeRecord: latestTimeEvent };
}

export function parseIsoTime(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getElapsedMinutes(startValue: string, endDate = new Date()) {
  const startDate = parseIsoTime(startValue);
  if (!startDate) return 0;
  return Math.max(
    0,
    Math.floor((endDate.getTime() - startDate.getTime()) / 60000),
  );
}

export function getFirstHalfDuration(matchTimes: MatchTimes) {
  if (matchTimes.first_half_end && matchTimes.first_half_start) {
    const halfEnd = parseIsoTime(matchTimes.first_half_end);
    if (halfEnd) return getElapsedMinutes(matchTimes.first_half_start, halfEnd);
  }
  if (matchTimes.first_half_start) return getElapsedMinutes(matchTimes.first_half_start);
  return 0;
}

export function getSecondHalfDuration(matchTimes: MatchTimes) {
  if (matchTimes.second_half_end && matchTimes.second_half_start) {
    const secondEnd = parseIsoTime(matchTimes.second_half_end);
    if (secondEnd) return getElapsedMinutes(matchTimes.second_half_start, secondEnd);
  }
  if (matchTimes.second_half_start) return getElapsedMinutes(matchTimes.second_half_start);
  return 0;
}

export function getLiveClockLabel(matchTimes: MatchTimes) {
  if (matchTimes.extra_end) return '연장 ET';
  if (matchTimes.extra_start) return `연장 ${getElapsedMinutes(matchTimes.extra_start)}'`;
  if (matchTimes.second_half_end) return '후반 FT';
  if (matchTimes.second_half_start) return `후반 ${getElapsedMinutes(matchTimes.second_half_start)}'`;
  if (matchTimes.first_half_end) return '전반 HT';
  if (matchTimes.first_half_start) return `전반 ${getElapsedMinutes(matchTimes.first_half_start)}'`;
  return 'LIVE';
}

export function getCurrentPeriod(matchTimes: MatchTimes): MatchPeriod {
  if (matchTimes.extra_start && !matchTimes.extra_end) return '연장';
  if (matchTimes.second_half_start && !matchTimes.second_half_end) return '후반';
  if (matchTimes.first_half_start && !matchTimes.first_half_end) return '전반';
  if (matchTimes.extra_end) return '연장';
  if (matchTimes.second_half_end) return '후반';
  if (matchTimes.first_half_end) return '전반';
  return '전반';
}

export function getCurrentDisplayMinute(matchTimes: MatchTimes) {
  if (matchTimes.extra_end && matchTimes.extra_start) {
    const extraEndDate = parseIsoTime(matchTimes.extra_end);
    if (extraEndDate) return getElapsedMinutes(matchTimes.extra_start, extraEndDate);
  }
  if (matchTimes.extra_start) return getElapsedMinutes(matchTimes.extra_start);
  if (matchTimes.second_half_end && matchTimes.second_half_start) {
    const secondEndDate = parseIsoTime(matchTimes.second_half_end);
    if (secondEndDate) return getElapsedMinutes(matchTimes.second_half_start, secondEndDate);
  }
  if (matchTimes.second_half_start) return getElapsedMinutes(matchTimes.second_half_start);
  if (matchTimes.first_half_end && matchTimes.first_half_start) {
    const firstEndDate = parseIsoTime(matchTimes.first_half_end);
    if (firstEndDate) return getElapsedMinutes(matchTimes.first_half_start, firstEndDate);
  }
  if (matchTimes.first_half_start) return getElapsedMinutes(matchTimes.first_half_start);
  return 0;
}

export function toSortMinute(
  matchTimes: MatchTimes,
  period: MatchPeriod,
  displayMinute: number,
) {
  const firstHalfAccumulated = getFirstHalfDuration(matchTimes);
  const secondHalfAccumulated = getSecondHalfDuration(matchTimes);
  const regularAccumulated = firstHalfAccumulated + secondHalfAccumulated;

  if (period === '전반') return displayMinute;
  if (period === '후반') return firstHalfAccumulated + displayMinute;
  return regularAccumulated + displayMinute;
}

export function getPenaltyTiming(matchTimes: MatchTimes) {
  if (matchTimes.extra_end && matchTimes.extra_start) {
    const extraEndDate = parseIsoTime(matchTimes.extra_end);
    if (extraEndDate) {
      const displayMinute = getElapsedMinutes(matchTimes.extra_start, extraEndDate);
      return {
        period: '연장' as MatchPeriod,
        displayMinute,
        sortMinute: toSortMinute(matchTimes, '연장', displayMinute),
      };
    }
  }

  const period = getCurrentPeriod(matchTimes);
  const displayMinute = getCurrentDisplayMinute(matchTimes);
  return {
    period,
    displayMinute,
    sortMinute: toSortMinute(matchTimes, period, displayMinute),
  };
}

export function formatStoredTime(value: string) {
  const parsed = parseIsoTime(value);
  if (!parsed) return value;
  return parsed.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

