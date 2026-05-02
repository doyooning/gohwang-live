'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';

type EventType = 'goal' | 'yellow_card' | 'red_card' | 'substitution';

interface PlayerOption {
  id: string;
  name: string;
  number: number;
}

interface EventInputPanelProps {
  activePanel: EventType | null;
  teamNames: { home: string; away: string };
  selectedTeam: 'home' | 'away' | '';
  selectedPlayer: string;
  selectedPlayerOut: string;
  selectedAssistPlayer: string;
  cardType: 'yellow_card' | 'red_card';
  inputMinute: string;
  isOwnGoal: boolean;
  onReset: () => void;
  onSelectTeam: (team: 'home' | 'away') => void;
  onSelectPlayer: (playerId: string) => void;
  onSelectPlayerOut: (playerId: string) => void;
  onSelectAssistPlayer: (playerId: string) => void;
  onSetCardType: (cardType: 'yellow_card' | 'red_card') => void;
  onSetInputMinute: (minute: string) => void;
  onSetOwnGoal: (checked: boolean) => void;
  onSave: () => void;
  getStarterPlayers: (team: 'home' | 'away') => PlayerOption[];
  getSubstitutionInCandidates: (team: 'home' | 'away') => PlayerOption[];
  getSubstitutionOutCandidates: (team: 'home' | 'away') => PlayerOption[];
}

export function EventInputPanel({
  activePanel,
  teamNames,
  selectedTeam,
  selectedPlayer,
  selectedPlayerOut,
  selectedAssistPlayer,
  cardType,
  inputMinute,
  isOwnGoal,
  onReset,
  onSelectTeam,
  onSelectPlayer,
  onSelectPlayerOut,
  onSelectAssistPlayer,
  onSetCardType,
  onSetInputMinute,
  onSetOwnGoal,
  onSave,
  getStarterPlayers,
  getSubstitutionInCandidates,
  getSubstitutionOutCandidates,
}: EventInputPanelProps) {
  if (!activePanel) return null;

  return (
    <div className="px-4 py-4 bg-card border-b border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">
          {activePanel === 'goal' && '득점 기록'}
          {(activePanel === 'yellow_card' || activePanel === 'red_card') &&
            '경고/퇴장 기록'}
          {activePanel === 'substitution' && '교체 기록'}
        </h3>
        <Button variant="ghost" size="icon" onClick={onReset}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {activePanel === 'goal' && (
          <div className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2">
            <span className="text-sm font-medium text-foreground">자책골</span>
            <Switch
              checked={isOwnGoal}
              onCheckedChange={(checked) => {
                onSetOwnGoal(checked);
                onSelectAssistPlayer('none');
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={selectedTeam === 'home' ? 'default' : 'outline'}
            className="h-12"
            onClick={() => onSelectTeam('home')}
          >
            {teamNames.home}
          </Button>
          <Button
            variant={selectedTeam === 'away' ? 'default' : 'outline'}
            className="h-12"
            onClick={() => onSelectTeam('away')}
          >
            {teamNames.away}
          </Button>
        </div>

        {(activePanel === 'yellow_card' || activePanel === 'red_card') && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={cardType === 'yellow_card' ? 'default' : 'outline'}
              className="h-12 gap-2"
              onClick={() => onSetCardType('yellow_card')}
            >
              <div className="size-4 rounded-sm bg-yellow-400" />
              경고
            </Button>
            <Button
              variant={cardType === 'red_card' ? 'default' : 'outline'}
              className="h-12 gap-2"
              onClick={() => onSetCardType('red_card')}
            >
              <div className="size-4 rounded-sm bg-red-500" />
              퇴장
            </Button>
          </div>
        )}

        {selectedTeam && (
          <>
            <Select value={selectedPlayer} onValueChange={onSelectPlayer}>
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
                  : getStarterPlayers(selectedTeam as 'home' | 'away')
                ).map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    #{player.number} {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activePanel === 'goal' && !isOwnGoal && (
              <Select value={selectedAssistPlayer} onValueChange={onSelectAssistPlayer}>
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="어시스트 선수 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  {getStarterPlayers(selectedTeam as 'home' | 'away')
                    .filter((p) => p.id !== selectedPlayer)
                    .map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        #{player.number} {player.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}

            {activePanel === 'substitution' && (
              <Select value={selectedPlayerOut} onValueChange={onSelectPlayerOut}>
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

        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="분"
            value={inputMinute}
            onChange={(e) => onSetInputMinute(e.target.value)}
            className="h-12 flex-1"
            min={1}
            max={120}
          />
        </div>

        <Button
          className="w-full h-14 text-base font-semibold"
          disabled={
            !selectedTeam ||
            !selectedPlayer ||
            (activePanel === 'substitution' && !selectedPlayerOut)
          }
          onClick={onSave}
        >
          저장하기
        </Button>
      </div>
    </div>
  );
}

