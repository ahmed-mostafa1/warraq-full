import apiClient from "../lib/api";

export interface BackupPayload {
  blob: Blob;
  filename: string;
}

const parseFilename = (disposition?: string | null): string => {
  if (!disposition) {
    return "warraq-backup.zip";
  }

  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match?.[1] ?? "warraq-backup.zip";
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
