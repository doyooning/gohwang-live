'use client';

import type { MatchEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface EventTimelineProps {
  events: MatchEvent[];
  teamNames: { home: string; away: string };
  getEventIcon: (eventType: string) => ReactNode;
  getEventLabel: (event: MatchEvent) => string;
  onUndoLatestEvent: () => void;
}

export function EventTimeline({
  events,
  teamNames,
  getEventIcon,
  getEventLabel,
  onUndoLatestEvent,
}: EventTimelineProps) {
  return (
    <main className="flex-1 px-4 py-4">
      {events.length > 0 && (
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={onUndoLatestEvent}>
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
  );
}
