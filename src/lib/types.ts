export type DashboardSummary = {
  total_trades: number;
  cumulative_pnl: string;
  winning_trades: number;
  losing_trades: number;
};

export type UserProfile = {
  id: number;
  email: string;
  full_name: string;
  username: string | null;
  phone: string | null;
  gender: string | null;
  age: number | null;
  experience_level: string | null;
  bio: string | null;
  public_profile: boolean;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type Trade = {
  id: number;
  user_id: number;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: string;
  price: string;
  order_type: "MARKET" | "LIMIT";
  status: string;
  pnl: string;
  broker_order_id: string;
  broker: string;
  strategy_tag?: string | null;
  leader_trade_id?: number | null;
  stop_loss?: string | null;
  take_profit?: string | null;
  created_at: string;
};

export type BrokerAccount = {
  id: number;
  user_id: number;
  broker_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata_json: string | null;
  display_client_id?: string | null;
};

export type BrokerBalance = {
  broker: string;
  balance: string;
  currency: string;
  available_balance?: string | null;
};

export type BrokerPosition = {
  symbol: string;
  quantity: string;
  avg_entry_price: string;
  unrealized_pnl: string;
};

export type DashboardOverview = {
  pnl: {
    daily: string;
    weekly: string;
    total: string;
  };
  win_rate: string;
  trade_history_count: number;
  open_positions: BrokerPosition[];
  strategy_performance: {
    strategy_tag: string;
    total_trades: number;
    win_rate: string;
    pnl: string;
  }[];
  updated_at: string;
};

export type StrategySignalRequest = {
  symbol: string;
  side: "BUY" | "SELL";
  confidence: number;
  strategy_tag: string;
  broker: "delta" | "zerodha" | "binance";
  quantity?: string | null;
  price?: string | null;
  order_type: "MARKET" | "LIMIT";
};

export type CopyLeaderStats = {
  leader_id: number;
  followers: number;
  total_copied_trades: number;
  win_rate: number;
};
