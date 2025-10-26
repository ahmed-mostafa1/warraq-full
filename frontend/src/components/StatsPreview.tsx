import { useEffect, useState } from "react";
import { getStats, type StatsDTO } from "../services/stats";

type LoadingState = "idle" | "loading" | "ready" | "error";

const StatsPreview = () => {
  const [state, setState] = useState<LoadingState>("idle");
  const [stats, setStats] = useState<StatsDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async (bypassCache = false) => {
    setState("loading");
    setError(null);
    try {
      const data = await getStats({ bypassCache });
      setStats(data);
      setState("ready");
    } catch (err) {
      console.error("Failed to load stats", err);
      setError("Failed to load stats");
      setState("error");
    }
  };

  useEffect(() => {
    // initial load with cache
    void loadStats(false);
  }, []);

  return (
    <section className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Stats Preview</h2>
        <button
          type="button"
          onClick={() => loadStats(true)}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          disabled={state === "loading"}
        >
          {state === "loading" ? "Refreshing..." : "Refresh (no cache)"}
        </button>
      </div>

      {state === "loading" && (
        <p className="mt-3 text-sm text-slate-500">Loading stats…</p>
      )}

      {state === "error" && (
        <p className="mt-3 text-sm text-rose-600">{error ?? "Unknown error"}</p>
      )}

      {state === "ready" && stats && (
        <div className="mt-4 space-y-4 text-sm text-slate-700">
          <div>
            <h3 className="font-semibold text-slate-900">Total members</h3>
            <p className="mt-1 text-base font-semibold text-slate-800">
              {stats.total.toLocaleString()}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">By Gender</h3>
            <ul className="mt-1 space-y-1">
              {stats.byGender.map((item) => (
                <li key={item.key} className="flex justify-between">
                  <span className="capitalize">{item.key}</span>
                  <span>{item.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">Age Buckets</h3>
            <ul className="mt-1 space-y-1">
              {stats.ageBuckets.map((item) => (
                <li key={item.bucket} className="flex justify-between">
                  <span>{item.bucket}</span>
                  <span>{item.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
};

export default StatsPreview;
