import type { AssetClass } from "@/lib/supabase/types";

export interface Quote {
  assetClass: AssetClass;
  symbol: string;
  price: number;
  percentChange: number;
  volume: number | null;
}
