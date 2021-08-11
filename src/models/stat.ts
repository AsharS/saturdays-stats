interface Stat {
  name: string;
  tag: string;
  elo: number;

  currenttier?: number;
  currenttierpatched?: string;
  mmr_change_to_last_game?: number;
  mmr_difference_text?: string;
  rank?: number;
  ranking_in_tier?: number;
}
