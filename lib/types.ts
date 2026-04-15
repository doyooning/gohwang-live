export interface Match {
  id: string
  title: string
  home_team: string
  away_team: string
  home_score: number
  away_score: number
  location: string
  match_date: string
  youtube_url: string | null
  status: "scheduled" | "live" | "finished"
  created_at: string
}

export interface MatchEvent {
  id: string
  match_id: string
  event_type: "goal" | "yellow_card" | "red_card" | "substitution"
  team_side: "home" | "away"
  player_name: string
  minute: number
  description: string | null
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
  name: string
  created_at: string
}
