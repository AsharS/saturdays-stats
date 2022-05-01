interface StatResponse {
  name: string;
  tag: string;
  elo: number;
  currenttier?: number;
  currenttierpatched?: string;
  mmr_change_to_last_game?: number;
  ranking_in_tier?: number;
}

interface Stat extends StatResponse {
  id: string;
  mmr_difference_text?: string;
  rank?: number;
}
