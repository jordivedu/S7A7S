export interface Player {
  id: number;
  name: string;
  number: string;
  club_name: string;
  club_logo: string;
  player_image: string;
}

export interface Match {
  id?: number;
  player_id: number;
  player_name?: string;
  date: string;
  category: string;
  rival: string;
  season: string;
  is_home: number; // 1 for home, 0 for away
  team_score: number;
  rival_score: number;
  points: number;
  pir: number;
  two_made: number;
  two_missed: number;
  three_made: number;
  three_missed: number;
  ft_made: number;
  ft_missed: number;
  off_reb: number;
  def_reb: number;
  assists: number;
  steals: number;
  turnovers: number;
  blocks: number;
}

export interface Averages {
  games_played: number;
  avg_points: number;
  avg_pir: number;
  avg_two_made: number;
  avg_three_made: number;
  avg_ft_made: number;
  avg_rebounds: number;
  avg_assists: number;
  avg_steals: number;
  avg_turnovers: number;
  avg_blocks: number;
}
