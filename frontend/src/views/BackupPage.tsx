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
import { LocalStorageService } from "../services/localStorage";
import { ExcelService } from "../services/excelService";
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
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const handleBackup = async (format: "json" | "excel" = "excel") => {
    if (members.length === 0) {
      addToast({
        title: t("common.warning"),
        message: t("backup.noDataToBackup"),
        type: "warning",
      });
      return;
    }

    setIsBackingUp(true);

    try {
      if (format === "excel") {
        const fileName = `backup_${new Date().toISOString().split("T")[0]}.xlsx`;
        await ExcelService.exportToExcel(members, fileName);
        addToast({
          title: t("common.success"),
          message: t("backup.backupSuccess"),
          type: "success",
        });
        return;
      }

      // JSON backup (fallback)
      const backupData = {
        members,
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_${new Date().toISOString().split("T")[0]}.json`;
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
      console.error("Backup error:", error);
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
      let restoredCount = 0;

      if (file.name.endsWith(".json")) {
        const text = await file.text();
        const backupData = JSON.parse(text);

        if (!backupData.members || !Array.isArray(backupData.members)) {
          throw new Error(t("backup.invalidBackupFile"));
        }

        LocalStorageService.clearAllData();

        for (const member of backupData.members) {
          LocalStorageService.addMember(member);
        }
        restoredCount = backupData.members.length;
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const importedMembers = await ExcelService.importMembers(file);
        if (!importedMembers || importedMembers.length === 0) {
          throw new Error(t("backup.invalidBackupFile"));
        }

        LocalStorageService.clearAllData();
        for (const member of importedMembers) {
          LocalStorageService.addMember(member);
        }
        restoredCount = importedMembers.length;
      } else {
        addToast({
          title: t("common.error"),
          message: t("backup.invalidFile"),
          type: "error",
        });
        return;
      }

      await dispatch(getMembers());

      addToast({
        title: t("common.success"),
        message: t("backup.membersRestored", {
          count: restoredCount,
        }),
        type: "success",
      });
    } catch (error) {
      console.error("Restore error:", error);
      addToast({
        title: t("common.error"),
        message: t("backup.restoreError"),
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

  const handleClearAllData = () => {
    if (window.confirm(t("backup.clearAllDataWarning"))) {
      try {
        LocalStorageService.clearAllData();
        dispatch(getMembers());
        addToast({
          title: t("common.success"),
          message: t("backup.dataCleared"),
          type: "success",
        });
      } catch (error) {
        console.error("Clear data error:", error);
        addToast({
          title: t("common.error"),
          message: t("backup.clearDataError"),
          type: "error",
        });
      }
    }
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
                    onClick={() => handleBackup()}
                    disabled={isBackingUp || members.length === 0}
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
                      accept=".json,.xlsx,.xls"
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

            {/* Danger Zone */}
            <Card className="p-6 border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
                {t("backup.dangerZone")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t("backup.clearAllDataWarning")}
              </p>
              <Button
                onClick={handleClearAllData}
                variant="secondary"
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900"
              >
                {t("backup.clearAllData")}
              </Button>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default BackupPage;
