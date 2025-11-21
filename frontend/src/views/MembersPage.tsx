import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
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
  importMembersExcel,
  type ApiMember,
  type MembersQueryParams,
} from "../services/members";
import { Download, Eye, Edit, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { restoreMembers } from "../slices/membersSlice";
import {
  normalizeMembershipType,
  normalizeReligion,
  type Member,
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
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const filterOptions = useMemo(
    () => [
      { value: "all", label: "بحث شامل" },
      { value: "name", label: "الاسم" },
      { value: "national_id", label: "الرقم القومي" },
      { value: "gender", label: "النوع" },
      { value: "religion", label: "الديانة" },
      { value: "unit", label: "الوحدة" },
      { value: "membership_type", label: "نوع العضوية" },
      { value: "job", label: "الوظيفة" },
    ],
    [],
  );

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
        setError("تعذر تحميل البيانات. حاول مرة أخرى.");
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, mapApiMemberToMember],
  );

  useEffect(() => {
    console.log("[MembersPage] mount");
  }, []);

  const searchPlaceholder = useMemo(() => {
    switch (selectedFilter) {
      case "name":
        return "ابحث بالاسم";
      case "national_id":
        return "ابحث بالرقم القومي";
      case "gender":
        return "ابحث بالنوع (ذكر / أنثى)";
      case "religion":
        return "ابحث بالديانة";
      case "unit":
        return "ابحث باسم الوحدة";
      case "membership_type":
        return "ابحث بنوع العضوية";
      case "job":
        return "ابحث بالوظيفة";
      default:
        return "ابحث في جميع الحقول";
    }
  }, [selectedFilter]);

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

  type ImportErrorResponse = {
    message?: string;
    errors?: Record<string, string[]>;
  };

  const handleImportMembers = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);

    try {
      const result = await importMembersExcel(file);
      await load(currentQueryParams);

      const inserted = result.inserted ?? 0;
      const failed = result.failed ?? 0;
      const success = inserted > 0;

      addToast({
        title: success ? t("common.success") : t("common.error"),
        message: t("members.importSummary", { inserted, failed }),
        type: success ? "success" : "error",
      });
    } catch (error) {
      const axiosError = error as AxiosError<ImportErrorResponse>;
      const responseData = axiosError.response?.data;
      const fileError = responseData?.errors?.file?.[0];
      addToast({
        title: t("common.error"),
        message: fileError ?? responseData?.message ?? t("members.importError"),
        type: "error",
      });
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

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
      alert("تعذر تصدير البيانات. حاول مرة أخرى.");
    } finally {
      setIsExporting(false);
    }
  }, [currentQueryParams]);

  const handleEdit = (member: TableRow) => {
    navigate(`/entry/${member.id}`);
  };

  const handleView = (member: TableRow) => {
    navigate(`/member/${member.id}`);
  };

  const handleDelete = async (member: TableRow) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف العضو ${member.name}؟`);
    if (!confirmed) return;
    try {
      await deleteMemberApi(Number(member.id));
      setAllRows((prev) => {
        const updated = prev.filter((row) => row.id !== member.id);
        dispatch(restoreMembers(updated.map(mapApiMemberToMember)));
        return updated;
      });
    } catch (err) {
      console.error("[MembersPage] delete failed", err);
      alert("تعذر حذف العضو. حاول مرة أخرى.");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col">
        <TopNav onMenuClick={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              الأعضاء
            </h1>
          </div>
          <Card className="mb-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <Input
                  name="search"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="flex-1 min-w-[200px]"
                />
                <Select
                  value={selectedFilter}
                  onChange={(event) => {
                    const value = event.target.value as FilterKey | "all";
                    setSelectedFilter(value);
                    setPage(1);
                  }}
                  options={filterOptions}
                  className="min-w-[160px]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  ref={importInputRef}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleImportMembers}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-2 whitespace-nowrap"
                  onClick={handleImportClick}
                  isLoading={isImporting}
                  leftIcon={<Download className="h-4 w-4" />}
                  disabled={isLoading}
                >
                  {isImporting ? t("common.loading") : t("common.import")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-2 whitespace-nowrap"
                  onClick={handleExport}
                  disabled={isLoading || isExporting}
                >
                  {isExporting ? "جاري التصدير..." : "تصدير Excel"}
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  onClick={() => navigate("/entry")}
                  className="flex items-center gap-2 whitespace-nowrap"
                  rightIcon={<Plus className="h-4 w-4" />}
                >
                  إضافة عضو
                </Button>
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
                    <th className="px-4 py-3 font-semibold">الاسم</th>
                    <th className="px-4 py-3 font-semibold">الوحدة</th>
                    <th className="px-4 py-3 font-semibold">نوع العضوية</th>
                    <th className="px-4 py-3 font-semibold">آخر تحديث</th>
                    <th className="px-4 py-3 font-semibold">الإجراءات / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        يجري تحميل البيانات...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        لا توجد بيانات مطابقة للبحث الحالي.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="px-4 py-3">{row.id}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                          {row.name}
                        </td>
                        <td className="px-4 py-3">{row.unit ?? "—"}</td>
                        <td className="px-4 py-3 capitalize text-slate-700 dark:text-slate-200">
                          {row.membership_type ?? "—"}
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
                الصفحة {page} من {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  التالي
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default MembersPage;
