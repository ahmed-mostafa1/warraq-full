import axios from "axios";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Download, Upload, Database, HardDrive } from "lucide-react";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useToastContext } from "../hooks/useToastContext";
import { getMembers } from "../slices/membersSlice";
import { downloadBackup, restoreBackup, type RestoreBackupResponse } from "../services/backup";
import type { RootState } from "../store";
import type { AppDispatch } from "../store";

const BackupPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { addToast } = useToastContext();
  const { list: members } = useSelector((state: RootState) => state.members);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSummary, setRestoreSummary] = useState<RestoreBackupResponse | null>(null);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const handleBackup = async () => {
    setIsBackingUp(true);

    try {
      const { blob, filename } = await downloadBackup();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast({
        title: t("common.success"),
        message: t("backup.backupSuccess"),
        type: "success",
      });
    } catch (error) {
      console.error("Backup download failed:", error);
      addToast({
        title: t("common.error"),
        message: t("backup.backupError"),
        type: "error",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    setIsRestoring(true);

    try {
      const result = await restoreBackup(file);
      setRestoreSummary(result);
      await dispatch(getMembers());

      addToast({
        title: t("common.success"),
        message: t("backup.restoreSuccessDetailed", {
          inserted: result.inserted,
          current: result.total,
        }),
        type: "success",
      });
    } catch (error) {
      console.error("Restore error:", error);
      let message = t("backup.restoreError");
      if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;
        const fileError = errors && typeof errors === "object"
          ? (Object.values(errors).flat().find((value) => typeof value === "string") as string | undefined)
          : undefined;
        const responseMessage =
          (error.response?.data as { message?: string })?.message ||
          error.response?.data?.error;
        message = fileError || responseMessage || message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      addToast({
        title: t("common.error"),
        message,
        type: "error",
      });
    } finally {
      setIsRestoring(false);
      if (restoreInputRef.current) {
        restoreInputRef.current.value = "";
      }
      input.value = "";
    }
  };

  const openRestorePicker = () => {
    if (isRestoring) return;
    restoreInputRef.current?.click();
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-dark-background-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <TopNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 lg:p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                  {t("backup.title")}
                </h1>
                <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
                  {t("backup.subtitle")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Backup Section */}
              <Card className="p-6">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                    <Upload className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                    {t("backup.createBackup")}
                  </h3>
                  <p className="text-gray-600 dark:text-dark-text-muted mb-6">
                    {t("backup.backupDescription")}
                  </p>
                  <Button
                    onClick={handleBackup}
                    disabled={isBackingUp}
                    leftIcon={<Database className="h-5 w-5" />}
                    className="w-full"
                    size="lg"
                  >
                    {isBackingUp
                      ? t("backup.creatingBackup")
                      : t("backup.createBackup")}
                  </Button>
                </div>
              </Card>

              {/* Restore Section */}
              <Card className="p-6">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                    <Download className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                    {t("backup.restoreData")}
                  </h3>
                  <p className="text-gray-600 dark:text-dark-text-muted mb-6">
                    {t("backup.restoreDescription")}
                  </p>
                  <div className="space-y-4">
                    <input
                      ref={restoreInputRef}
                      type="file"
                      accept=".sqlite"
                      onChange={handleRestore}
                      className="hidden"
                      disabled={isRestoring}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      leftIcon={<HardDrive className="h-5 w-5" />}
                      disabled={isRestoring}
                      className="w-full"
                      onClick={openRestorePicker}
                    >
                      {isRestoring
                        ? t("backup.restoring")
                        : t("backup.selectRestoreFile")}
                    </Button>

                        {restoreSummary && (
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-start dark:border-slate-700 dark:bg-slate-900/40">
                            <p className="mb-3 text-sm font-medium text-gray-900 dark:text-slate-100">
                              {t("backup.restoreSummaryTitle")}
                            </p>
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div>
                            <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                              {restoreSummary.previous_count}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-slate-300">
                              {t("backup.previousCount")}
                            </p>
                          </div>
                          <div>
                            <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                              {restoreSummary.total}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-slate-300">
                              {t("backup.currentCount")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Data Statistics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
                {t("backup.dataStatistics")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-dark-background-secondary rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                    {members.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-dark-text-muted">
                    {t("backup.totalMembers")}
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-50 dark:bg-dark-background-secondary rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                    {new Date().toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-dark-text-muted">
                    {t("backup.lastUpdate")}
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-50 dark:bg-dark-background-secondary rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                    {Math.round(JSON.stringify(members).length / 1024)} KB
                  </div>
                  <div className="text-sm text-gray-600 dark:text-dark-text-muted">
                    {t("backup.dataSize")}
                  </div>
                </div>
              </div>
            </Card>

          </div>
        </main>
      </div>
    </div>
  );
};

export default BackupPage;
