import apiClient from "../lib/api";

export interface BackupPayload {
  blob: Blob;
  filename: string;
}

export interface RestoreBackupResponse {
  previous_count: number;
  inserted: number;
  total: number;
  warnings: string[];
}

export interface RestoreBackupError {
  message?: string;
  failure_report_id?: string;
  failed?: number;
  previous_count?: number;
}

const parseFilename = (disposition?: string | null): string => {
  if (!disposition) {
    return "warraq-backup.sqlite";
  }

  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match?.[1] ?? "warraq-backup.sqlite";
};

export const downloadBackup = async (): Promise<BackupPayload> => {
  const response = await apiClient.get<Blob>("/backup", {
    responseType: "blob",
  });

  const contentDisposition = response.headers["content-disposition"] as
    | string
    | undefined;
  const filename = parseFilename(contentDisposition);

  return {
    blob: response.data,
    filename,
  };
};

export const restoreBackup = async (file: File): Promise<RestoreBackupResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<RestoreBackupResponse>("/backup/restore", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};
