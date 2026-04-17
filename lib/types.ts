export interface Match {
  id: string
  title: string
  home_team_id: string | null
  away_team_id: string | null
  home_team?: string // for backward compatibility
  away_team?: string // for backward compatibility
  home_score: number
  away_score: number
  location: string
  match_date: string
  youtube_url: string | null
  status: "scheduled" | "live" | "finished" | "SCHEDULED" | "LIVE" | "FINISHED"
  created_at: string
}

export interface Team {
  id: string
  name: string
  created_at: string
}

export interface TeamPlayer {
  id: string
  team_id: string
  name: string
  jersey_number: number
  position: string | null
  created_at: string
}

export interface MatchLineup {
  id: string
  match_id: string
  team_id: string
  team_side: "home" | "away"
  formation: string | null
  created_at: string
  updated_at: string
}

export interface MatchLineupPlayer {
  id: string
  match_lineup_id: string
  team_player_id: string
  lineup_role: "starter" | "substitute"
  created_at: string
  // Joined data
  team_player?: TeamPlayer
}

export interface MatchEvent {
  id: string
  match_id: string
  event_type: "goal" | "yellow_card" | "red_card" | "substitution" | "time_record"
  team_side: "home" | "away"
  player_name: string
  minute: number
  description: string | null
  assist_player_name: string | null
  substituted_in_player_name: string | null
  substituted_out_player_name: string | null
  created_at: string
}

export interface Lineup {
  id: string
  match_id: string
  team_side: "home" | "away"
  player_name: string
  jersey_number: number
  is_starter: boolean
  created_at: string
}

export interface Admin {
  id: string
  email: string
  role: "super_admin" | "operator"
  is_active: boolean
  created_at: string
}
