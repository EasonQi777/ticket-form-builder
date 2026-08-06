import api from '../api';

export interface DashboardSummary {
  ticket_form_count: number;
  ticket_count: number;
  experience_group_count: number;
  project_count: number;
}

const BASE = '/api/dashboard';

export const DashboardAPI = {
  summary() {
    return api.get<DashboardSummary>(`${BASE}/summary/`).then((res) => res.data);
  },
};
