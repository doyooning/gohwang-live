"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MatchCard } from "./match-card";
import type { Match } from "@/lib/types";
import { Loader2 } from "lucide-react";

type LiveTimes = Record<
  string,
  {
    first_half_start?: string;
    first_half_end?: string;
    second_half_start?: string;
    second_half_end?: string;
    extra_start?: string;
    extra_end?: string;
  }
>;

const MATCH_CHECK_INTERVAL_MS = 10000;
const EVENT_POLL_INTERVAL_MS = 10000;

const TIME_EVENT_TYPES = [
  "half_start",
  "half_end",
  "second_half_start",
  "second_half_end",
  "extra_time_start",
  "extra_time_end",
] as const;

const SHOOTOUT_EVENT_TYPES = ["shootout_goal", "shootout_missed"] as const;

function normalizeStatus(status: string) {
  return String(status || "").toLowerCase();
}

function buildMatchSignature(
  rows: Array<{ id: string; updated_at?: string | null }>
) {
  return rows.map((row) => `${row.id}:${row.updated_at || ""}`).join("|");
}

function parseIso(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function elapsedMinutes(start?: string, end = new Date()) {
  const s = parseIso(start);
  if (!s) return 0;
  return Math.max(0, Math.floor((end.getTime() - s.getTime()) / 60000));
}

export function MatchList() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teamNamesById, setTeamNamesById] = useState<Record<string, string>>({});
  const [liveMatchTimesById, setLiveMatchTimesById] = useState<LiveTimes>({});
  const [shootoutByMatchId, setShootoutByMatchId] = useState<
    Record<string, { home: number; away: number }>
  >({});
  const [clockTick, setClockTick] = useState(0);
  const [loading, setLoading] = useState(true);

  const supabaseRef = useRef<any>(null);
  const matchesRef = useRef<Match[]>([]);
  const matchSignatureRef = useRef("");
  const teamKeyRef = useRef("");

  if (!supabaseRef.current) {
    supabaseRef.current = createClient() as any;
  }
  const supabase = supabaseRef.current;

  const setMatchesState = (next: Match[]) => {
    matchesRef.current = next;
    setMatches(next);
  };

  const buildTeamKey = (rows: Match[]) => {
    const ids = Array.from(
      new Set(
        rows
          .flatMap((match) => [match.home_team_id, match.away_team_id])
          .filter(Boolean)
      )
    ).sort();
    return ids.join("|");
  };

  const refreshTeamsIfNeeded = async (rows: Match[]) => {
    const nextTeamKey = buildTeamKey(rows);
    if (nextTeamKey === teamKeyRef.current) return;
    teamKeyRef.current = nextTeamKey;

    const ids = nextTeamKey ? nextTeamKey.split("|") : [];
    if (ids.length === 0) {
      setTeamNamesById({});
      return;
    }

    const { data: teamsData, error } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", ids);

    if (error) {
      console.error("Error fetching teams:", error);
      return;
    }

    const nextTeamNames: Record<string, string> = {};
    (teamsData || []).forEach((team: any) => {
      nextTeamNames[team.id] = team.name;
    });
    setTeamNamesById(nextTeamNames);
  };

  const refreshEventSummaries = async (rows: Match[]) => {
    const liveIds = rows
      .filter((m) => normalizeStatus(m.status) === "live")
      .map((m) => m.id);
    const endedIds = rows
      .filter((m) => normalizeStatus(m.status) === "ended")
      .map((m) => m.id);

    const targetIds = Array.from(new Set([...liveIds, ...endedIds]));
    if (targetIds.length === 0) {
      setLiveMatchTimesById({});
      setShootoutByMatchId({});
      return;
    }

    const { data: summaryEvents, error } = await supabase
      .from("match_events")
      .select("match_id, team_side, event_type, created_at")
      .in("match_id", targetIds)
      .in("event_type", [...TIME_EVENT_TYPES, ...SHOOTOUT_EVENT_TYPES])
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching event summaries:", error);
      return;
    }

    const nextTimesById: LiveTimes = {};
    const nextShootout: Record<string, { home: number; away: number }> = {};

    (summaryEvents || []).forEach((event: any) => {
      const matchId = event.match_id as string;
      if (!nextTimesById[matchId]) nextTimesById[matchId] = {};
      if (!nextShootout[matchId]) nextShootout[matchId] = { home: 0, away: 0 };

      if (event.event_type === "half_start")
        nextTimesById[matchId].first_half_start = event.created_at;
      if (event.event_type === "half_end")
        nextTimesById[matchId].first_half_end = event.created_at;
      if (event.event_type === "second_half_start")
        nextTimesById[matchId].second_half_start = event.created_at;
      if (event.event_type === "second_half_end")
        nextTimesById[matchId].second_half_end = event.created_at;
      if (event.event_type === "extra_time_start")
        nextTimesById[matchId].extra_start = event.created_at;
      if (event.event_type === "extra_time_end")
        nextTimesById[matchId].extra_end = event.created_at;

      if (event.event_type === "shootout_goal") {
        if (event.team_side === "HOME") nextShootout[matchId].home += 1;
        if (event.team_side === "AWAY") nextShootout[matchId].away += 1;
      }
    });

    setLiveMatchTimesById(nextTimesById);
    setShootoutByMatchId(nextShootout);
  };

  const refreshMatchesFull = async () => {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: false });

    if (error) {
      console.error("Error fetching matches:", error);
      return;
    }

    const nextMatches = (data || []) as Match[];
    setMatchesState(nextMatches);
    matchSignatureRef.current = buildMatchSignature(
      nextMatches.map((match) => ({
        id: match.id,
        updated_at: match.updated_at || null,
      }))
    );

    await Promise.all([
      refreshTeamsIfNeeded(nextMatches),
      refreshEventSummaries(nextMatches),
    ]);
  };

  const checkMatchChanges = async () => {
    const { data, error } = await supabase
      .from("matches")
      .select("id, updated_at")
      .order("match_date", { ascending: false });

    if (error) {
      console.error("Error checking match changes:", error);
      return;
    }

    const signature = buildMatchSignature(
      (data || []).map((row: any) => ({
        id: row.id as string,
        updated_at: row.updated_at as string | null,
      }))
    );

    if (signature !== matchSignatureRef.current) {
      await refreshMatchesFull();
    }
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      await refreshMatchesFull();
      if (!cancelled) setLoading(false);
    };
    init();

    const matchCheckId = setInterval(() => {
      checkMatchChanges();
    }, MATCH_CHECK_INTERVAL_MS);
    const eventPollId = setInterval(() => {
      refreshEventSummaries(matchesRef.current);
    }, EVENT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(matchCheckId);
      clearInterval(eventPollId);
    };
  }, []);

  useEffect(() => {
    if (!matches.some((m) => normalizeStatus(m.status) === "live")) return;
    const interval = setInterval(() => setClockTick((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [matches]);

  const getLiveClockLabel = (matchId: string) => {
    void clockTick;
    const t = liveMatchTimesById[matchId];
    if (!t) return "LIVE";
    if (t.extra_end) return "연장 ET";
    if (t.extra_start) return `연장 ${elapsedMinutes(t.extra_start)}'`;
    if (t.second_half_end) return "후반 FT";
    if (t.second_half_start) return `후반 ${elapsedMinutes(t.second_half_start)}'`;
    if (t.first_half_end) return "전반 HT";
    if (t.first_half_start) return `전반 ${elapsedMinutes(t.first_half_start)}'`;
    return "LIVE";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const liveMatches = matches.filter((m) => normalizeStatus(m.status) === "live");
  const scheduledMatches = matches.filter(
    (m) => normalizeStatus(m.status) === "scheduled"
  );
  const endedMatches = matches.filter((m) => normalizeStatus(m.status) === "ended");

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        등록된 경기가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {liveMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            진행 중
          </h2>
          <div className="space-y-3">
            {liveMatches.map((match) => (
              <MatchCard
                key={match.id}
                id={match.id}
                homeTeam={`홈팀 ${teamNamesById[match.home_team_id] || match.home_team || "미지정"}`}
                awayTeam={`원정팀 ${teamNamesById[match.away_team_id] || match.away_team || "미지정"}`}
                homeScore={match.home_score}
                awayScore={match.away_score}
                liveClockLabel={getLiveClockLabel(match.id)}
                venue={match.location || "-"}
                status="live"
              />
            ))}
          </div>
        </section>
      )}

      {scheduledMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            예정된 경기
          </h2>
          <div className="space-y-3">
            {scheduledMatches.map((match) => (
              <MatchCard
                key={match.id}
                id={match.id}
                homeTeam={`홈팀 ${teamNamesById[match.home_team_id] || match.home_team || "미지정"}`}
                awayTeam={`원정팀 ${teamNamesById[match.away_team_id] || match.away_team || "미지정"}`}
                scheduledTime={new Date(match.match_date).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                venue={match.location || "-"}
                status="scheduled"
              />
            ))}
          </div>
        </section>
      )}

      {endedMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            종료된 경기
          </h2>
          <div className="space-y-3">
            {endedMatches.map((match) => (
              <MatchCard
                key={match.id}
                id={match.id}
                homeTeam={`홈팀 ${teamNamesById[match.home_team_id] || match.home_team || "미지정"}`}
                awayTeam={`원정팀 ${teamNamesById[match.away_team_id] || match.away_team || "미지정"}`}
                homeScore={match.home_score}
                awayScore={match.away_score}
                shootoutScoreLabel={
                  shootoutByMatchId[match.id]
                    ? `${shootoutByMatchId[match.id].home}-${shootoutByMatchId[match.id].away}`
                    : undefined
                }
                shootoutWinnerSide={
                  shootoutByMatchId[match.id]
                    ? shootoutByMatchId[match.id].home > shootoutByMatchId[match.id].away
                      ? "home"
                      : shootoutByMatchId[match.id].away > shootoutByMatchId[match.id].home
                      ? "away"
                      : null
                    : null
                }
                venue={match.location || "-"}
                status="ended"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

