import apiClient from "../lib/api";
import type { Religion } from "../types/member";

export interface MembersQueryParams {
  page?: number;
  search?: string;
  unit?: string;
  status?: string;
  membership_type?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  links: Record<string, string | null>;
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface ApiMember {
  id: number;
  name: string;
  national_id: string | null;
  gender: string | null;
  religion: string | null;
  dob: string | null;
  phone: string | null;
  address: string | null;
  unit: string | null;
  membership_type: string | null;
  status: string | null;
  membership_number: string | null;
  job: string | null;
  photo: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberPayload {
  name: string;
  national_id?: string | null;
  gender?: "male" | "female" | null;
  religion?: Religion;
  dob?: string | null;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  unit?: string | null;
  membership_type?: string | null;
  status?: "active" | "inactive";
  membership_number?: string | null;
  job?: string | null;
  photo?: string | null;
}

export interface MembersListResult<T = ApiMember> {
  rows: T[];
  meta: PaginatedResponse<T>["meta"] | null;
  links: PaginatedResponse<T>["links"] | null;
  raw: unknown;
}

export const listMembers = async (
  params: MembersQueryParams = {},
): Promise<MembersListResult> => {
  const response = await apiClient.get("/members", { params });
  const body = response.data as unknown;

  let rows: ApiMember[] = [];
  if (Array.isArray(body)) {
    rows = body as ApiMember[];
  } else if (body && Array.isArray((body as { data?: ApiMember[] }).data)) {
    rows = (body as { data: ApiMember[] }).data;
  }

  return {
    rows,
    meta: (body as Partial<PaginatedResponse<ApiMember>> | undefined)?.meta ?? null,
    links: (body as Partial<PaginatedResponse<ApiMember>> | undefined)?.links ?? null,
    raw: body,
  };
};

export const getMember = async (id: number): Promise<ApiMember> => {
  const response = await apiClient.get<ApiMember>(`/members/${id}`);
  return response.data;
};

export const createMember = async (
  payload: MemberPayload,
): Promise<ApiMember> => {
  const response = await apiClient.post<ApiMember>("/members", payload);
  return response.data;
};

export const updateMember = async (
  id: number,
  payload: Partial<MemberPayload>,
): Promise<ApiMember> => {
  const response = await apiClient.put<ApiMember>(`/members/${id}`, payload);
  return response.data;
};

export const deleteMember = async (id: number): Promise<void> => {
  await apiClient.delete(`/members/${id}`);
};

export interface ImportMembersResult {
  inserted: number;
  updated: number;
  failed: number;
  warnings: string[];
  failure_report_id: string | null;
}

export const importMembersExcel = async (
  file: File,
): Promise<ImportMembersResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<ImportMembersResult>(
    "/members/import",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
};

export const exportMembersExcel = async (
  format: "csv" | "xlsx" = "xlsx",
): Promise<Blob> => {
  const response = await apiClient.get<Blob>("/members/export", {
    params: { format },
    responseType: "blob",
  });

  return response.data;
};
