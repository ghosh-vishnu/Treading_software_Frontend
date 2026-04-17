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

export type StrategyCard = {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  strategy_tag: string;
  is_public: boolean;
  exchange: string;
  followers: number;
  recommended_margin: string;
  mdd_percent: string;
  win_rate_percent: string;
  pnl: string;
  roi_percent: string;
  chart_points: string | null;
  academy_slugs: string | null;
  is_featured: boolean;
  created_at: string;
};

export type AdminStrategyCreateRequest = {
  name: string;
  description: string | null;
  strategy_tag: string;
  exchange: string;
  followers: number;
  recommended_margin: string;
  mdd_percent: string;
  win_rate_percent: string;
  pnl: string;
  roi_percent: string;
  chart_points: string[];
  academy_slugs: string[];
  is_public: boolean;
  is_featured: boolean;
};

export type AdminStrategyUpdateRequest = Partial<AdminStrategyCreateRequest>;

export type CopyLeaderStats = {
  leader_id: number;
  followers: number;
  total_copied_trades: number;
  win_rate: number;
};

export type UserSettings = {
  id: number;
  user_id: number;
  theme: "dark" | "light";
  accent_color: string;
  notify_trade_alerts: boolean;
  notify_strategy_alerts: boolean;
  notify_system_alerts: boolean;
  default_lot_size: string;
  max_open_positions: number;
  created_at: string;
  updated_at: string;
};

export type UserSettingsUpdateRequest = {
  theme: "dark" | "light";
  accent_color: string;
  notify_trade_alerts: boolean;
  notify_strategy_alerts: boolean;
  notify_system_alerts: boolean;
  default_lot_size: number;
  max_open_positions: number;
};

export type KYCRecord = {
  id: number;
  user_id: number;
  status: "pending" | "approved" | "rejected";
  document_type: string;
  document_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
};

export type KYCSubmitRequest = {
  document_type: string;
  document_id: string;
  notes?: string | null;
};

export type AcademyArticle = {
  id: number;
  title: string;
  slug: string;
  category: string;
  summary: string;
  content_markdown: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type AcademyArticleCreateRequest = {
  title: string;
  slug: string;
  category: string;
  summary: string;
  content_markdown: string;
  is_published: boolean;
};

export type AcademyArticleUpdateRequest = Partial<AcademyArticleCreateRequest>;

export type BacktestRun = {
  id: number;
  user_id: number;
  strategy_tag: string;
  symbol: string;
  timeframe: string;
  periods: number;
  roi: number;
  drawdown: number;
  win_rate: number;
  report_json: string;
  created_at: string;
};

export type BacktestRunRequest = {
  strategy_tag: string;
  symbol: string;
  timeframe: string;
  periods: number;
  initial_capital: number;
};

export type AppNotification = {
  id: number;
  user_id: number;
  category: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type CreateNotificationRequest = {
  category: string;
  title: string;
  message: string;
};

export type AdminDashboardSummary = {
  total_customers: number;
  active_customers: number;
  total_admins: number;
  total_strategies: number;
  public_strategies: number;
  total_academy_articles: number;
  published_academy_articles: number;
  total_trades: number;
  open_trades: number;
};
