export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PersonRef {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
}
