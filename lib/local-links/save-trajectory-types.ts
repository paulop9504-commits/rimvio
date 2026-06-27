/** L0 — link save trajectory wire (localStorage SSOT). */
export type SaveTrajectoryEntry = {
  timestamp: string;
  category: string;
  title: string;
  domain: string | null;
  query?: string | null;
  source_type?: string | null;
  session_id?: string | null;
};
