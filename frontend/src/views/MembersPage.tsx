import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import {
  listMembers,
  deleteMember as deleteMemberApi,
  exportMembersExcel,
  type ApiMember,
  type MembersQueryParams,
  importMembersExcel,
} from "../services/members";
import {
  Eye,
  Edit,
  FileInput,
  FileSpreadsheet,
  Plus,
  Trash2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import clsx from "clsx";
import colourfulLogo from "/colourfull logo.png";
import { restoreMembers } from "../slices/membersSlice";
import {
  normalizeMembershipType,
  normalizeReligion,
  type Member,
  getMembershipTypeTranslationKey,
} from "../types/member";
import type { AppDispatch } from "../store";
import { useToastContext } from "../hooks/useToastContext";

type TableRow = ApiMember;

const PAGE_SIZE = 20;

type FilterKey =
  | "name"
  | "national_id"
  | "gender"
  | "religion"
  | "unit"
  | "membership_type"
  | "job";

const FILTER_OPTION_KEYS: (FilterKey | "all")[] = [
  "all",
  "name",
  "national_id",
  "gender",
  "religion",
  "unit",
  "membership_type",
  "job",
];

const FILTER_OPTION_LABEL_KEY_MAP: Record<FilterKey | "all", string> = {
  all: "members.page.filters.all",
  name: "members.page.filters.name",
  national_id: "members.page.filters.national_id",
  gender: "members.page.filters.gender",
  religion: "members.page.filters.religion",
  unit: "members.page.filters.unit",
  membership_type: "members.page.filters.membership_type",
  job: "members.page.filters.job",
};

const SEARCH_PLACEHOLDER_KEY_MAP: Record<FilterKey | "all", string> = {
  all: "members.page.searchPlaceholder.all",
  name: "members.page.searchPlaceholder.name",
  national_id: "members.page.searchPlaceholder.national_id",
  gender: "members.page.searchPlaceholder.gender",
  religion: "members.page.searchPlaceholder.religion",
  unit: "members.page.searchPlaceholder.unit",
  membership_type: "members.page.searchPlaceholder.membership_type",
  job: "members.page.searchPlaceholder.job",
};

const MembersPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const { addToast } = useToastContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allRows, setAllRows] = useState<TableRow[]>([]);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterKey | "all">(
    "all",
  );
  const initialLoadRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TableRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const filterOptions = useMemo(
    () =>
      FILTER_OPTION_KEYS.map((key) => ({
        value: key,
        label: t(FILTER_OPTION_LABEL_KEY_MAP[key]),
      })),
    [t],
  );

  const quickFilters: (FilterKey | "all")[] = ["all", "name", "unit", "membership_type"];
  const activeFilterLabel = useMemo(() => {
    const match = filterOptions.find((option) => option.value === selectedFilter);
    return match?.label ?? t("members.page.filters.all");
  }, [filterOptions, selectedFilter, t]);

  const mapApiMemberToMember = useCallback((member: ApiMember): Member => {
    const membershipType = normalizeMembershipType(member.membership_type);

    const createdAt = member.created_at ?? new Date().toISOString();
    const updatedAt = member.updated_at ?? createdAt;

    const dob = member.dob ? new Date(member.dob) : null;
    const age = dob
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
          ),
        )
      : 0;

    const rawGender = (member.gender ?? "").trim().toLowerCase();
    const gender: Member["gender"] =
      rawGender === "female" ||
      rawGender === "f" ||
      rawGender === "أنثى" ||
      rawGender === "انثى"
        ? "female"
        : "male";

    return {
      id: String(member.id),
      fullName: member.name ?? "",
      nationalId: member.national_id ?? "",
      gender,
      phoneNumber: member.phone ?? "",
      landlineNumber: "",
      partyUnit: member.unit ?? "",
      email: member.email ?? "",
      membershipNumber: member.membership_number ?? "",
      age,
      address: member.address ?? "",
      job: member.job ?? "",
      membershipType,
      religion: normalizeReligion(member.religion),
      photo: member.photo ?? undefined,
      registrationDate: createdAt,
      createdAt,
      updatedAt,
    };
  }, []);

  const load = useCallback(
    async (params: MembersQueryParams) => {
      setIsLoading(true);
      try {
        console.log("[MembersPage] fetching", params);
        const result = await listMembers(params);
        const normalizedRows = result.rows.map((row) => ({
          ...row,
          membership_type: normalizeMembershipType(row.membership_type),
        }));

        setAllRows(normalizedRows);
        const membersForStore = normalizedRows.map(mapApiMemberToMember);
        dispatch(restoreMembers(membersForStore));
        setPage(1);
        setError(null);
      } catch (err) {
        console.error("[MembersPage] failed to load members", err);
        setError(t("members.page.loadError"));
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, mapApiMemberToMember, t],
  );

  useEffect(() => {
    console.log("[MembersPage] mount");
  }, []);

  const searchPlaceholder = useMemo(
    () => t(SEARCH_PLACEHOLDER_KEY_MAP[selectedFilter]),
    [selectedFilter, t],
  );

  const currentQueryParams = useMemo<MembersQueryParams>(() => {
    const params: MembersQueryParams = {};
    const trimmed = searchTerm.trim();

    if (!trimmed) {
      return params;
    }

    if (selectedFilter === "all") {
      params.search = trimmed;
    } else if (selectedFilter === "membership_type") {
      params.membership_type = normalizeMembershipType(trimmed);
    } else {
      (params as Record<FilterKey, string>)[selectedFilter] = trimmed;
    }

    return params;
  }, [searchTerm, selectedFilter]);

  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      void load(currentQueryParams);
      return;
    }

    const debounce = window.setTimeout(() => {
      void load(currentQueryParams);
    }, 350);

    return () => {
      window.clearTimeout(debounce);
    };
  }, [currentQueryParams, load]);

  useEffect(() => {
    const start = (page - 1) * PAGE_SIZE;
    setRows(allRows.slice(start, start + PAGE_SIZE));
  }, [allRows, page]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(allRows.length / PAGE_SIZE)),
    [allRows],
  );

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await exportMembersExcel("xlsx", currentQueryParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `members-${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[MembersPage] export failed", err);
      window.alert(t("members.page.exportError"));
    } finally {
      setIsExporting(false);
    }
  }, [currentQueryParams, t]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPendingImportFile(file);
    event.target.value = "";
  };

  const cancelImport = () => {
    if (isProcessingImport) return;
    setPendingImportFile(null);
    addToast({
      title: t("common.info"),
      message: t("members.page.importCanceled"),
      type: "info",
    });
  };

  const confirmImport = async () => {
    if (!pendingImportFile) return;
    setIsProcessingImport(true);
    setIsImporting(true);
    try {
      const result = await importMembersExcel(pendingImportFile);

      addToast({
        title: t("common.success"),
        message: t("members.page.importSuccess", {
          inserted: result.inserted,
          failed: result.failed,
        }),
        type: "success",
      });

      if (result.failed > 0 || result.warnings.length > 0) {
        addToast({
          title: t("common.warning"),
          message: t("members.page.importWarnings", {
            failed: result.failed,
            warnings: result.warnings.length,
          }),
          type: "warning",
        });
      }

      await load(currentQueryParams);
    } catch (error) {
      addToast({
        title: t("common.error"),
        message: t("members.page.importError", {
          error: error instanceof Error ? error.message : String(error),
        }),
        type: "error",
      });
    } finally {
      setIsProcessingImport(false);
      setIsImporting(false);
      setPendingImportFile(null);
    }
  };

  const handleEdit = (member: TableRow) => {
    navigate(`/entry/${member.id}`);
  };

  const handleView = (member: TableRow) => {
    navigate(`/member/${member.id}`);
  };

  const handleDelete = (member: TableRow) => {
    setPendingDelete(member);
  };

  const cancelDelete = () => {
    if (isDeleting) return;
    setPendingDelete(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteMemberApi(Number(pendingDelete.id));
      setAllRows((prev) => {
        const updated = prev.filter((row) => row.id !== pendingDelete.id);
        dispatch(restoreMembers(updated.map(mapApiMemberToMember)));
        return updated;
      });
      addToast({
        title: t("common.success"),
        message: t("members.deleteSuccess", { name: pendingDelete.name ?? "" }),
        type: "success",
      });
    } catch (err) {
      console.error("[MembersPage] delete failed", err);
      addToast({
        title: t("common.error"),
        message: t("members.page.deleteError"),
        type: "error",
      });
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col">
        <TopNav onMenuClick={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 overflow-y-auto p-6">
          <Card className="mb-6 overflow-hidden border-none bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400 text-white shadow-xl">
            <div className="relative flex items-center justify-center p-8">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-white/20 blur-3xl" aria-hidden />
                <img
                  src={colourfulLogo}
                  alt={t("app.title")}
                  className="relative h-64 w-64 rounded-3xl object-contain shadow-2xl ring-4 ring-white/50 transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                />
              </div>
            </div>
          </Card>
          <Card className="mb-4 border-none bg-white/80 p-4 shadow-xl backdrop-blur dark:bg-slate-900/60">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
                <div className="flex-1">
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <Search className="h-4 w-4" />
                    {t("members.page.searchLabel", "بحث ذكي")}
                  </label>
                  <Input
                    name="search"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setPage(1);
                    }}
                    placeholder={searchPlaceholder}
                    leftIcon={<Search className="h-4 w-4" />}
                    rightIcon={
                      searchTerm ? (
                        <button
                          type="button"
                          className="rounded-lg bg-red-500/10 p-1 text-red-600 transition hover:bg-red-500/20"
                          onClick={() => {
                            setSearchTerm("");
                            setPage(1);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : undefined
                    }
                    className="min-w-[220px] bg-white/70 shadow-lg dark:bg-slate-900/70"
                  />
                </div>
                <div className="flex flex-col gap-2 lg:w-72">
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <SlidersHorizontal className="h-4 w-4" />
                    {t("members.page.filterLabel", "تصفية متقدمة")}
                  </label>
                  <Select
                    value={selectedFilter}
                    onChange={(event) => {
                      const value = event.target.value as FilterKey | "all";
                      setSelectedFilter(value);
                      setPage(1);
                    }}
                    options={filterOptions}
                    className="rounded-2xl border-0 bg-slate-100/80 text-slate-900 shadow-inner focus:ring-red-500 dark:bg-slate-800/70 dark:text-white"
                  />
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("members.page.activeFilter", "المرشح الحالي")}: {activeFilterLabel}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("members.page.quickFilters", "تصفية سريعة")}
                  </span>
                  {quickFilters.map((filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => {
                        setSelectedFilter(filterKey);
                        setPage(1);
                      }}
                      className={clsx(
                        "rounded-full px-4 py-1 text-sm font-medium transition",
                        selectedFilter === filterKey
                          ? "bg-rose-600 text-white shadow"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
                      )}
                    >
                      {t(FILTER_OPTION_LABEL_KEY_MAP[filterKey])}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 whitespace-nowrap"
                    onClick={handleExport}
                    disabled={isLoading || isExporting}
                  >
                    {isExporting ? t("members.page.exporting") : t("export.excel")}
                    <FileSpreadsheet className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 whitespace-nowrap"
                    onClick={handleImportClick}
                    disabled={isLoading || isImporting}
                  >
                    {isImporting ? t("members.page.importing") : t("import.excel")}
                    <FileInput className="h-4 w-4" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImportFileChange}
                  />
                  <Button
                    type="button"
                    onClick={() => navigate("/entry")}
                    className="flex items-center gap-2 whitespace-nowrap"
                    rightIcon={<Plus className="h-4 w-4" />}
                  >
                    {t("navigation.addMember")}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {error && (
            <Card className="mb-4 border border-rose-500 bg-rose-50 p-4 text-rose-700 dark:bg-rose-900/40">
              {error}
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm text-center">
                <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">{t("members.fullName")}</th>
                    <th className="px-4 py-3 font-semibold">{t("members.partyUnit")}</th>
                    <th className="px-4 py-3 font-semibold">{t("members.membershipType")}</th>
                    <th className="px-4 py-3 font-semibold">{t("members.lastUpdated")}</th>
                    <th className="px-4 py-3 font-semibold">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        {t("members.page.loading")}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        {t("members.page.noResults")}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="px-4 py-3 text-slate-800 dark:text-white">
                          {row.id}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                          {row.name}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-white">
                          {row.unit ?? "—"}
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-700 dark:text-slate-200">
                          {row.membership_type
                            ? t(
                                `members.memberTypes.${getMembershipTypeTranslationKey(
                                  normalizeMembershipType(row.membership_type),
                                )}`,
                              )
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(row.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 flex-shrink-0"
                              onClick={() => handleView(row)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 flex-shrink-0"
                              onClick={() => handleEdit(row)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 text-red-600 hover:text-red-700 flex-shrink-0"
                              onClick={() => handleDelete(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                {t("members.page.paginationStatus", { page, total: totalPages })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  {t("common.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  {t("common.next")}
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-dark-background-primary">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("members.page.deleteConfirmTitle")}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {t("members.page.deleteConfirmMessage", {
                  name: pendingDelete.name ?? "",
                })}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                {t("members.page.deleteCancel")}
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                isLoading={isDeleting}
              >
                {t("members.page.deleteConfirmButton")}
              </Button>
            </div>
          </Card>
        </div>
      )}
      {pendingImportFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-dark-background-primary">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("members.page.importConfirmTitle")}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {t("members.page.importConfirmMessage", {
                  fileName: pendingImportFile.name,
                })}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={cancelImport}
                disabled={isProcessingImport}
              >
                {t("members.page.importCancel")}
              </Button>
              <Button
                variant="primary"
                onClick={confirmImport}
                isLoading={isProcessingImport}
              >
                {t("members.page.importConfirmButton")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MembersPage;
