export type TradeSide = "long" | "short";
export type TradeSource = "tradovate" | "tradelocker" | "manual";
export type Broker = "tradovate" | "tradelocker";
export type BrokerConnectionStatus = "disconnected" | "connected" | "error";
export type InsightKind =
  | "strategy_insights"
  | "strategy_playbook"
  | "game_plan_daily"
  | "game_plan_weekly";
export type EnvironmentFilter = "all" | "demo" | "live";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      broker_connections: {
        Row: {
          id: string;
          user_id: string;
          broker: Broker;
          environment: "demo" | "live";
          broker_account_id: string | null;
          broker_account_number: string | null;
          broker_server: string | null;
          access_token_encrypted: string | null;
          refresh_token_encrypted: string | null;
          access_token_expires_at: string | null;
          status: BrokerConnectionStatus;
          last_synced_at: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["broker_connections"]["Row"]> & {
          user_id: string;
          broker: Broker;
        };
        Update: Partial<Database["public"]["Tables"]["broker_connections"]["Row"]>;
        Relationships: [];
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          broker_connection_id: string | null;
          source: TradeSource;
          broker_trade_id: string | null;
          symbol: string;
          side: TradeSide;
          quantity: number;
          entry_price: number;
          exit_price: number | null;
          entry_time: string;
          exit_time: string | null;
          fees: number;
          pnl: number | null;
          strategy: string | null;
          notes: string | null;
          tags: string[];
          environment: "demo" | "live";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["trades"]["Row"]> & {
          user_id: string;
          symbol: string;
          side: TradeSide;
          quantity: number;
          entry_price: number;
          entry_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["trades"]["Row"]>;
        Relationships: [];
      };
      ai_feedback: {
        Row: {
          id: string;
          trade_id: string;
          user_id: string;
          model: string;
          content: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_feedback"]["Row"]> & {
          trade_id: string;
          user_id: string;
          model: string;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_feedback"]["Row"]>;
        Relationships: [];
      };
      ai_insights: {
        Row: {
          id: string;
          user_id: string;
          kind: InsightKind;
          model: string;
          content: string;
          environment_filter: EnvironmentFilter;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_insights"]["Row"]> & {
          user_id: string;
          kind: InsightKind;
          model: string;
          content: string;
          environment_filter: EnvironmentFilter;
        };
        Update: Partial<Database["public"]["Tables"]["ai_insights"]["Row"]>;
        Relationships: [];
      };
      tradelocker_instrument_specs: {
        Row: {
          environment: "demo" | "live";
          tradable_instrument_id: number;
          name: string;
          lot_size: number;
          base_currency: string | null;
          quoting_currency: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tradelocker_instrument_specs"]["Row"]> & {
          environment: "demo" | "live";
          tradable_instrument_id: number;
          name: string;
          lot_size: number;
        };
        Update: Partial<Database["public"]["Tables"]["tradelocker_instrument_specs"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type Trade = Database["public"]["Tables"]["trades"]["Row"];
export type BrokerConnection = Database["public"]["Tables"]["broker_connections"]["Row"];
export type AiFeedback = Database["public"]["Tables"]["ai_feedback"]["Row"];
export type AiInsight = Database["public"]["Tables"]["ai_insights"]["Row"];
