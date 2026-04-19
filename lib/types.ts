export interface Match {
  id: string;
  title: string;
  home_team_id: string;
  away_team_id: string;
  home_team?: string; // for backward compatibility
  away_team?: string; // for backward compatibility
  home_score: number;
  away_score: number;
  location: string;
  match_date: string;
  youtube_url: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'SCHEDULED' | 'LIVE' | 'ENDED';
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  created_at: string;
}

export interface TeamPlayer {
  id: string;
  team_id: string;
  name: string;
  jersey_number: number;
  position: string | null;
  created_at: string;
}

export interface MatchLineup {
  id: string;
  match_id: string;
  team_id: string;
  team_side: 'HOME' | 'AWAY';
  formation: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchLineupPlayer {
  id: string;
  match_lineup_id: string;
  team_player_id: string;
  lineup_role: 'STARTER' | 'SUBSTITUTE';
  created_at: string;
  // Joined data
  team_player?: TeamPlayer;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  event_type:
    | 'goal'
    | 'yellow_card'
    | 'red_card'
    | 'substitution'
    | 'half_start'
    | 'half_end'
    | 'second_half_start'
    | 'second_half_end'
    | 'extra'
    | 'extra_time_start'
    | 'extra_time_end'
    | 'shootout_goal'
    | 'shootout_missed';
  team_side: 'HOME' | 'AWAY' | 'NONE';
  player_id: string | null;
  minute: number;
  description: string | null;
  assist_player_id: string | null;
  sub_in_player_id: string | null;
  sub_out_player_id: string | null;
  created_at: string;
}

export interface Lineup {
  id: string;
  match_id: string;
  team_side: 'HOME' | 'AWAY';
  player_name: string;
  jersey_number: number;
  is_starter: boolean;
  created_at: string;
}

export interface Admin {
  id: string;
  email: string;
  role: 'super_admin' | 'operator';
  is_active: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      matches: {
        Row: Match;
        Insert: Partial<Match>;
        Update: Partial<Match>;
      };
      teams: {
        Row: Team;
        Insert: Partial<Team>;
        Update: Partial<Team>;
      };
      team_players: {
        Row: TeamPlayer;
        Insert: Partial<TeamPlayer>;
        Update: Partial<TeamPlayer>;
      };
      match_lineups: {
        Row: MatchLineup;
        Insert: Partial<MatchLineup>;
        Update: Partial<MatchLineup>;
      };
      match_lineup_players: {
        Row: MatchLineupPlayer;
        Insert: Partial<MatchLineupPlayer>;
        Update: Partial<MatchLineupPlayer>;
      };
      match_events: {
        Row: MatchEvent;
        Insert: Partial<MatchEvent>;
        Update: Partial<MatchEvent>;
      };
      lineups: {
        Row: Lineup;
        Insert: Partial<Lineup>;
        Update: Partial<Lineup>;
      };
      admins: {
        Row: Admin;
        Insert: Partial<Admin>;
        Update: Partial<Admin>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      team_side: 'HOME' | 'AWAY';
      lineup_role: 'STARTER' | 'SUBSTITUTE';
    };
  };
}
