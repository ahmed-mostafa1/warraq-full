import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { listMembers, deleteMember as deleteMemberApi, type ApiMember } from "../services/members";
import { Eye, Edit, Trash2 } from "lucide-react";
import { restoreMembers } from "../slices/membersSlice";
import {
  normalizeMembershipType,
  normalizeReligion,
  type Member,
} from "../types/member";
import type { AppDispatch } from "../store";

interface TableRow extends ApiMember {}

const PAGE_SIZE = 20;

const MembersPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allRows, setAllRows] = useState<TableRow[]>([]);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");

  const mapApiMemberToMember = (member: ApiMember): Member => {
    const membershipType = normalizeMembershipType(member.membership_type);

    const createdAt = member.created_at ?? new Date().toISOString();
    const updatedAt = member.updated_at ?? createdAt;

    const dob = member.dob ? new Date(member.dob) : null;
    const age = dob
      ? Math.max(0, Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)))
      : 0;

    return {
      id: String(member.id),
      fullName: member.name ?? "",
      nationalId: member.national_id ?? "",
      gender: member.gender === "female" ? "female" : "male",
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
  };

  const load = useCallback(async (term: string) => {
    setIsLoading(true);
    try {
      console.log("[MembersPage] fetching", { search: term });
      const result = await listMembers({ search: term || undefined });
      setAllRows(result.rows);
      const membersForStore = result.rows.map(mapApiMemberToMember);
      dispatch(restoreMembers(membersForStore));
      setPage(1);
      setError(null);
    } catch (err) {
      console.error("[MembersPage] failed to load members", err);
      setError("تعذر تحميل البيانات. حاول مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("[MembersPage] mount");
  }, []);

  useEffect(() => {
    void load(search);
  }, [search, load]);

  useEffect(() => {
    const start = (page - 1) * PAGE_SIZE;
    setRows(allRows.slice(start, start + PAGE_SIZE));
  }, [allRows, page]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(allRows.length / PAGE_SIZE)),
    [allRows],
  );

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = draftSearch.trim();
    setPage(1);
    setSearch(term);
    if (term === search) {
      void load(term);
    }
  };

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
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              الأعضاء
            </h1>
          </div>
          <Card className="mb-4 p-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
              <Input
                name="search"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="ابحث بالاسم أو الرقم القومي"
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading}>
                بحث
              </Button>
            </form>
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
