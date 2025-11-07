import { useEffect, useState } from "react";
import { listMembers, type ApiMember } from "../services/members";
import apiClient from "../lib/api";

type MemberRow = Pick<ApiMember, "id" | "name" | "unit" | "status">;

export const ConnectivityTest = () => {
  const [healthStatus, setHealthStatus] = useState<"idle" | "ok" | "error">(
    "idle",
  );
  const [healthError, setHealthError] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await apiClient.get<{ ok: boolean }>("/health");
        if (response.data.ok) {
          setHealthStatus("ok");
        } else {
          setHealthStatus("error");
          setHealthError("Unexpected response");
        }
      } catch (error) {
        console.error("Healthcheck failed", error);
        setHealthStatus("error");
        setHealthError("Unable to reach API");
      }
    };

    checkHealth();
  }, []);

  const handleLoadMembers = async () => {
    setIsLoading(true);
    setMembersError(null);
    try {
      const response = await listMembers({ page: 1 });
      setMembers(response.rows.slice(0, 5));
    } catch (error) {
      console.error("Failed to load members", error);
      setMembersError("Failed to load members.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-dashed border-slate-300 p-4">
      <h2 className="text-lg font-semibold">Connectivity Test</h2>
      <div className="mt-2 flex items-center gap-2">
        <span>Status:</span>
        {healthStatus === "ok" && (
          <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">
            API OK
          </span>
        )}
        {healthStatus === "error" && (
          <span className="rounded bg-rose-100 px-2 py-1 text-rose-700">
            {healthError ?? "API Error"}
          </span>
        )}
        {healthStatus === "idle" && (
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">
            Checking…
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleLoadMembers}
        className="mt-4 rounded bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
        disabled={isLoading}
      >
        {isLoading ? "Loading…" : "Load Members"}
      </button>

      {membersError && (
        <p className="mt-3 text-sm text-rose-600">{membersError}</p>
      )}

      <div className="mt-4">
        {members.length === 0 && !membersError ? (
          <p className="text-sm text-slate-600">
            No members loaded yet. Click “Load Members”.
          </p>
        ) : (
          <table className="min-w-full border border-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="border border-slate-200 px-2 py-1 text-left">
                  ID
                </th>
                <th className="border border-slate-200 px-2 py-1 text-left">
                  Name
                </th>
                <th className="border border-slate-200 px-2 py-1 text-left">
                  Unit
                </th>
                <th className="border border-slate-200 px-2 py-1 text-left">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="border border-slate-200 px-2 py-1">
                    {member.id}
                  </td>
                  <td className="border border-slate-200 px-2 py-1">
                    {member.name}
                  </td>
                  <td className="border border-slate-200 px-2 py-1">
                    {member.unit ?? "—"}
                  </td>
                  <td className="border border-slate-200 px-2 py-1 capitalize">
                    {member.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default ConnectivityTest;
