interface StatResponse {
  name: string;
  tag: string;
  data: StatResponseData[];
}

interface StatResponseData {
  currenttier: number;
  currenttierpatched: string;
  elo: number;
  mmr_change_to_last_game: number;
  ranking_in_tier: number;
  date_raw: number;
  formatted_date?: string;
  map: {
    name: string;
  };
}

interface Stat extends StatResponse {
  id: string;
  last_data: StatResponseData;
  mmr_difference_text?: string;
  rank?: number;
}
