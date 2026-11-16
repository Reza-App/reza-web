import { api } from '../client';
import type { Pagination, PersonRef } from '@/lib/types/api';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  status: ReviewStatus;
  rejectReason?: string | null;
  moderatedAt?: string | null;
  createdAt: string;
  client?: (PersonRef & { email?: string | null }) | null;
  employee?: PersonRef | null;
  appointment?: { id: string; startTime: string } | null;
  /** Reported to Selia by the salon. */
  reportedAt?: string | null;
  /** Removed by Selia: hidden and locked. */
  platformRemovedAt?: string | null;
  platformRemovedReason?: string | null;
}

export interface ReviewStats {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  averageRating: number;
  ratingDistribution: { rating: number; count: number }[];
  trendsLastMonth: { total: number; approved: number; rejected: number; averageRating: number };
}

const R = 'backend/reviews';

export const reviewService = {
  list: (query: { status?: ReviewStatus; page?: number; limit?: number }, signal?: AbortSignal) =>
    api.get<{ reviews: Review[]; pagination: Pagination }>(R, { query, signal }),
  setStatus: (id: string, status: ReviewStatus, rejectReason?: string) =>
    api.put<{ review: Review }>(`${R}/${encodeURIComponent(id)}/status`, { status, rejectReason }),
  report: (id: string, reason: string) => api.post<{ success: boolean }>(R + '/' + encodeURIComponent(id) + '/report', { reason }),
  remove: (id: string) => api.delete<void>(`${R}/${encodeURIComponent(id)}`),
  stats: (signal?: AbortSignal) =>
    api.get<{ stats: ReviewStats; reviews: Review[] }>('backend/dashboard/clients/statistiques/avis', { signal }),
};
