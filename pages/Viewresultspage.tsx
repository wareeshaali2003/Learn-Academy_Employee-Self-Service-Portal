// pages/ViewResultsPage.tsx
// View Assessment Results — alag standalone page

import React, { useState, useMemo, useEffect } from "react";
import { FileCheck, RefreshCw, Search } from "lucide-react";

import { useStudentGroups }    from "../hooks/Usestudents";
import { useEmployee }         from "../hooks/useEmployee";
import { useAssessmentPlans, useAssessmentResults } from "../hooks/Useassessment";
import { SectionHeader, Skeleton, avatarColor, gradeBadgeColor } from "../components/Shared";

export const ViewResultsPage: React.FC = () => {

  // ── Instructor ──────────────────────────────────────────────────────────

  const { loading: empLoading } = useEmployee();

  // ── Hooks ────────────────────────────────────────────────────────────────
  const { groups, loading: groupsLoading } = useStudentGroups(undefined, !empLoading);
  const { plans, loading: plansLoading }   = useAssessmentPlans();

  const [selectedGroup, setSelectedGroup]  = useState<string>("");
  const [selectedPlan, setSelectedPlan]    = useState<string>("");
  const [search, setSearch]                = useState("");

  // ── Comments map — result name → comment string ──────────────────────────
  const [commentsMap, setCommentsMap] = useState<Record<string, string>>({});
  const [commentsLoading, setCommentsLoading] = useState(false);

  const filteredPlans = useMemo(
    () => selectedGroup ? plans.filter((p) => p.student_group === selectedGroup) : plans,
    [plans, selectedGroup]
  );

  const { results, loading, error, refetch } = useAssessmentResults(
    selectedPlan  || undefined,
    selectedGroup || undefined
  );

  // ── Fetch comments individually jab results aayein ──────────────────────
  useEffect(() => {
    if (!results.length) { setCommentsMap({}); return; }
    setCommentsLoading(true);

    Promise.all(
      results.map(async (r) => {
        try {
          // ✅ FIX: field naam "comments" galat tha — ERPNext Assessment
          // Result doctype mein field "comment" (singular) hai.
          const res = await fetch(
            `/api/resource/Assessment%20Result/${encodeURIComponent(r.name)}?fields=["comment"]`,
            { credentials: "include", headers: { Accept: "application/json" } }
          );
          const json = await res.json();
          return { name: r.name, comment: json?.data?.comment || "" };
        } catch {
          return { name: r.name, comment: "" };
        }
      })
    ).then((arr) => {
      const map: Record<string, string> = {};
      arr.forEach((item) => { map[item.name] = item.comment; });
      setCommentsMap(map);
      setCommentsLoading(false);
    });
  }, [results]);

  const filtered = useMemo(() =>
    results.filter((r) =>
      !search ||
      r.student_name.toLowerCase().includes(search.toLowerCase()) ||
      r.student.toLowerCase().includes(search.toLowerCase())
    ), [results, search]);

  const avgScore = useMemo(() => {
    const valid = results.filter((r) => r.maximum_score && r.maximum_score > 0);
    if (!valid.length) return null;
    const sum = valid.reduce(
      (s, r) => s + ((r.total_score ?? 0) / (r.maximum_score ?? 1)) * 100, 0
    );
    return Math.round(sum / valid.length);
  }, [results]);

  const topScore = useMemo(() => {
    if (!results.length) return null;
    return results.reduce(
      (best, r) => (r.total_score ?? 0) > (best.total_score ?? 0) ? r : best,
      results[0]
    );
  }, [results]);

  return (
    <div className="space-y-6">

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionHeader
          icon={<FileCheck size={20} />}
          title="View Assessment Results"
          subtitle="Filter by student group and assessment plan"
          action={
            <button type="button" onClick={refetch}
              className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
              <RefreshCw size={15} />
            </button>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Student Group</label>
            {groupsLoading || empLoading ? <Skeleton rows={1} /> : (
              <select value={selectedGroup}
                onChange={(e) => { setSelectedGroup(e.target.value); setSelectedPlan(""); }}
                className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100">
                <option value="">— All Groups —</option>
                {groups.map((g) => <option key={g.name} value={g.name}>{g.student_group_name || g.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Assessment Plan</label>
            {plansLoading ? <Skeleton rows={1} /> : (
              <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100">
                <option value="">— All Plans —</option>
                {filteredPlans.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Records", value: results.length,  color: "text-gray-800" },
            { label: "Class Average", value: avgScore !== null ? `${avgScore}%` : "—", color: avgScore !== null ? (avgScore >= 75 ? "text-green-600" : avgScore >= 50 ? "text-amber-600" : "text-red-500") : "text-gray-400" },
            { label: "Top Score",     value: topScore ? `${topScore.total_score ?? 0}/${topScore.maximum_score ?? 0}` : "—", color: "text-green-700" },
            { label: "Top Student",   value: topScore?.student_name || "—", color: "text-gray-700" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-green-100 shadow-sm p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-xl font-black truncate ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {(selectedGroup || selectedPlan) && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search student…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 w-52" />
            </div>
            {search && (
              <button type="button" onClick={() => setSearch("")}
                className="text-xs text-red-500 border border-red-200 px-3 py-2 rounded-xl hover:bg-red-50 font-semibold">
                Clear
              </button>
            )}
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} of {results.length} records</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {error && <p className="text-sm text-red-500 bg-red-50 px-6 py-3">⚠ {error}</p>}
            {loading ? <div className="p-8"><Skeleton rows={6} /></div> : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <FileCheck size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm font-semibold">No results found</p>
                <p className="text-xs mt-1">Select a group or plan above to load data</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-6 py-4">#</th>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Group</th>
                      <th className="px-6 py-4">Assessment Plan</th>
                      <th className="px-6 py-4 text-center">Score</th>
                      <th className="px-6 py-4 text-center">%</th>
                      <th className="px-6 py-4 text-center">Grade</th>
                      <th className="px-6 py-4">Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((r, i) => {
                      const pct =
                        r.maximum_score && r.maximum_score > 0
                          ? Math.round(((r.total_score ?? 0) / r.maximum_score) * 100)
                          : null;
                      const pctColor =
                        pct === null ? "text-gray-400"
                        : pct >= 75 ? "text-green-600"
                        : pct >= 50 ? "text-amber-600"
                        : "text-red-500";
                      return (
                        <tr key={r.name} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4 text-xs text-gray-400 font-mono">{i + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${avatarColor(r.student_name)} text-white flex items-center justify-center text-[11px] font-bold uppercase flex-shrink-0`}>
                                {r.student_name.slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{r.student_name}</p>
                                <p className="text-[11px] text-gray-400 font-mono">{r.student}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-semibold">{r.student_group}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 font-medium max-w-[160px] truncate">{r.assessment_plan}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-gray-800">{r.total_score ?? "—"}</span>
                            {r.maximum_score ? <span className="text-[11px] text-gray-400">/{r.maximum_score}</span> : null}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-bold text-sm ${pctColor}`}>
                              {pct !== null ? `${pct}%` : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {r.grade
                              ? <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${gradeBadgeColor(r.grade)}`}>{r.grade}</span>
                              : <span className="text-gray-300 text-xs">—</span>
                            }
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px]">
                            {commentsLoading
                              ? <span className="inline-block w-16 h-3 bg-gray-100 animate-pulse rounded" />
                              : commentsMap[r.name]
                                ? <span className="truncate block" title={commentsMap[r.name]}>{commentsMap[r.name]}</span>
                                : <span className="text-gray-300">—</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!selectedGroup && !selectedPlan && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center text-gray-400">
          <FileCheck size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold">Select a group or plan to view results</p>
          <p className="text-xs mt-1 text-gray-300">All saved assessment records will appear here</p>
        </div>
      )}
    </div>
  );
};

export default ViewResultsPage;