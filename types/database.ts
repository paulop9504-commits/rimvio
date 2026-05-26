export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** One executable action attached to a saved link */
export type LinkActionItem = {
  id: string;
  label: string;
  kind: "open" | "save" | "share" | "remind" | "copy" | "custom";
  href?: string;
  payload?: Record<string, Json>;
};

export type LinkRow = {
  id: string;
  user_id: string | null;
  original_url: string;
  title: string;
  thumbnail_url: string | null;
  domain: string;
  category: string | null;
  actions: LinkActionItem[];
  created_at: string;
  expires_at: string | null;
};

export type UserActionBinRow = {
  id: string;
  user_id: string | null;
  context_bin: string;
  action_key: string;
  impressions: number;
  clicks: number;
  skips: number;
  updated_at: string;
};

export type AnalyticsEventRow = {
  id: string;
  event_type: "enrich" | "action_click" | "funnel";
  ts: string;
  session_id: string;
  flow_id: string | null;
  domain: string | null;
  enricher_id: string | null;
  payload: Json;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      links: {
        Row: LinkRow;
        Insert: {
          id?: string;
          user_id?: string | null;
          original_url: string;
          title: string;
          thumbnail_url?: string | null;
          domain: string;
          category?: string | null;
          actions?: LinkActionItem[];
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          original_url?: string;
          title?: string;
          thumbnail_url?: string | null;
          domain?: string;
          category?: string | null;
          actions?: LinkActionItem[];
          created_at?: string;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      user_action_bins: {
        Row: UserActionBinRow;
        Insert: {
          id?: string;
          user_id?: string | null;
          context_bin: string;
          action_key: string;
          impressions?: number;
          clicks?: number;
          skips?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          context_bin?: string;
          action_key?: string;
          impressions?: number;
          clicks?: number;
          skips?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: AnalyticsEventRow;
        Insert: {
          id?: string;
          event_type: "enrich" | "action_click" | "funnel";
          ts: string;
          session_id: string;
          flow_id?: string | null;
          domain?: string | null;
          enricher_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: "enrich" | "action_click" | "funnel";
          ts?: string;
          session_id?: string;
          flow_id?: string | null;
          domain?: string | null;
          enricher_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      record_action_bin_event: {
        Args: {
          p_context_bin: string;
          p_action_key: string;
          p_event: string;
          p_user_id?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const mockLinks: LinkRow[] = [
  {
    id: "mock-1",
    user_id: null,
    original_url: "https://www.figma.com/file/design-handoff",
    title: "Review design handoff",
    thumbnail_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&h=256&fit=crop",
    domain: "figma.com",
    category: "Design",
    actions: [
      { id: "a1", label: "Open in Figma", kind: "open", href: "https://www.figma.com/file/design-handoff" },
      { id: "a2", label: "Remind me tonight", kind: "remind", payload: { at: "20:00" } },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    expires_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "mock-2",
    user_id: null,
    original_url: "https://linear.app/team/issue/SCOPE-42",
    title: "Approve sprint scope",
    thumbnail_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=256&h=256&fit=crop",
    domain: "linear.app",
    category: "Product",
    actions: [
      { id: "a1", label: "Open issue", kind: "open", href: "https://linear.app/team/issue/SCOPE-42" },
      { id: "a2", label: "Share with team", kind: "share" },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "mock-3",
    user_id: null,
    original_url: "https://stripe.com/docs/payments/checkout",
    title: "Stripe Checkout integration guide",
    thumbnail_url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=256&h=256&fit=crop",
    domain: "stripe.com",
    category: "Engineering",
    actions: [
      { id: "a1", label: "Read docs", kind: "open", href: "https://stripe.com/docs/payments/checkout" },
      { id: "a2", label: "Save for later", kind: "save" },
      { id: "a3", label: "Copy link", kind: "copy" },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "mock-4",
    user_id: null,
    original_url: "https://www.notion.so/product-roadmap-q2",
    title: "Q2 product roadmap",
    thumbnail_url: null,
    domain: "notion.so",
    category: "Planning",
    actions: [
      { id: "a1", label: "Open in Notion", kind: "open", href: "https://www.notion.so/product-roadmap-q2" },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
];
