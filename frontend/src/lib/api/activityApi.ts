import api from '../api';
import type { ActivityItem } from '@/types/activity';

const BASE = '/api/dashboard';

export const ActivityAPI = {
  recent(limit = 4) {
    return api
      .get<ActivityItem[]>(`${BASE}/activity/`, { params: { limit } })
      .then((res) => res.data);
  },
};
