export interface Player {
    name: string;
    pts?: number;
    reb?: number;
    ast?: number;
    tov?: number;
    personId?: string; // 👈 needed for stat polling
    position?: {
      row: number;
      column: number;
    };
  }