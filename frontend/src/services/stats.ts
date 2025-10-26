import apiClient from "../lib/api";

export interface StatsBucket {
  key: string;
  count: number;
}

export interface AgeBucket {
  bucket: "<25" | "25-34" | "35-44" | "45-54" | "55+";
  count: number;
}

export interface StatsDTO {
  total: number;
  byGender: StatsBucket[];
  byUnit: StatsBucket[];
  byMembershipType: StatsBucket[];
  ageBuckets: AgeBucket[];
}

interface GetStatsOptions {
  bypassCache?: boolean;
}

export const getStats = async (options: GetStatsOptions = {}): Promise<StatsDTO> => {
  const params = options.bypassCache ? { cache: 0 } : undefined;
  const response = await apiClient.get<StatsDTO>("/stats", { params });

  return response.data;
};
