export type ActivityStatus = 'success' | 'pending' | 'info';

export interface ActivityItem {
  id: number;
  summary: string;
  actor_name: string | null;
  status: ActivityStatus;
  created_at: string;
}
