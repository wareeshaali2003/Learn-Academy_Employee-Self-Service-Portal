// pages/AssessmentPage.tsx
// Assessment Result (Enter Scores) — alag standalone page

import React, { useState, useMemo, useEffect } from "react";
import {
  ClipboardList, Users, BookOpen, FileCheck,
  CheckCircle2, AlertCircle, Save, RotateCcw,
} from "lucide-react";

import { api }                          from "../services/api";
import { useStudentGroups, useGroupStudents } from "../hooks/Usestudents";
import { useAssessmentPlans, useAssessmentPlanDetail } from "../hooks/Useassessment";
import { Skeleton, avatarColor, gradeFromPct, gradeBadgeColor } from "../components/Shared";

async function saveInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize = 5
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export const AssessmentPage: React.FC = () => {
  const { groups, loading: groupsLoading } = useStudentGroups();
  const [selectedGroup, setSelectedGroup]  = useState<string>("");
  const { plans, loading: plansLoading }   = useAssessmentPlans();
  const [selectedPlanName, setSelectedPlanName] = useState<string>("");

  const filteredPlans = useMemo(
    () => selectedGroup ? plans.filter((p) => p.student_group === selectedGroup) : [],
    [plans, selectedGroup]
  );

  const { plan, loading: planLoading }                = useAssessmentPlanDetail(selectedPlanName || null);
  const { students, loading: stuLoading }             = useGroupStudents(selectedGroup || undefined);
  const activeStudents = useMemo(() => students.filter((s) => s.active !== 0), [students]);

  const [scoreMap, setScoreMap]     = useState<Record<string, Record<string, string>>>({});
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [saving, setSaving]         = useState(false);
  const [saveResults, setSaveResults] = useState<{ success: number; failed: string[] } | null>(null);

  useEffect(() => { setSelectedPlanName(""); setScoreMap({}); setCommentMap({}); setSaveResults(null); }, [selectedGroup]);
  useEffect(() => { setScoreMap({}); setCommentMap({}); setSaveResults(null); }, [selectedPlanName]);

  const criteria = plan?.assessment_criteria ?? [];
  const maxTotal = criteria.reduce((sum, c) => sum + (c.maximum_score || 0), 0);

  const handleScoreChange = (studentId: string, criteriaName: string, value: string) =>
    setScoreMap((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [criteriaName]: value } }));

  const handleCommentChange = (studentId: string, value: string) =>
    setCommentMap((prev) => ({ ...prev, [studentId]: value }));

  const getTotal = (studentId: string) =>
    criteria.reduce(
      (sum, c) => sum + (parseFloat(scoreMap[studentId]?.[c.assessment_criteria] || "0") || 0),
      0
    );

  const handleSave = async () => {
    if (!plan || activeStudents.length === 0) return;
    setSaving(true);
    setSaveResults(null);

    const results = await saveInBatches(
      activeStudents,
      (s) => {
        const row       = scoreMap[s.student] || {};
        const totalScore = criteria.reduce(
          (sum, c) => sum + (parseFloat(row[c.assessment_criteria] || "0") || 0), 0
        );
        const maxScore =
          plan.maximum_assessment_score ??
          criteria.reduce((sum, c) => sum + (c.maximum_score || 0), 0);
        const pct   = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

        return api.saveAssessmentResult({
          student:         s.student,
          student_name:    s.student_name,
          assessment_plan: plan.name,
          student_group:   selectedGroup,
          program:         plan.program,
          course:          plan.course,
          academic_year:   plan.academic_year,
          academic_term:   plan.academic_term,
          assessment_group: plan.assessment_group,
          grading_scale:   plan.grading_scale,
          maximum_score:   maxScore,
          grade:           gradeFromPct(pct),
          comment:         commentMap[s.student] || "",
          details:         criteria.map((c) => ({
            assessment_criteria: c.assessment_criteria,
            score:               parseFloat(row[c.assessment_criteria] || "0") || 0,
            maximum_score:       c.maximum_score,
          })),
        });
      },
      5 // ek waqt mein sirf 5 students ki request server ko jayegi
    );

    const failed = results
      .map((r, i) => (!r.success ? `${activeStudents[i].student_name}: ${r.error}` : null))
      .filter(Boolean) as string[];

    setSaveResults({ success: results.filter((r) => r.success).length, failed });
    setSaving(false);
  };

  const handleReset = () => {
    setSelectedGroup(""); setSelectedPlanName("");
    setScoreMap({}); setCommentMap({}); setSaveResults(null);
  };

  return (
    <div className="space-y-6">

      {/* Step 1 & 2 selectors */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <ClipboardList size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-base">Assessment Result</h3>
            <p className="text-xs text-gray-400">Select a student group, then choose the assessment plan</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Step 1 — Student Group</label>
            {groupsLoading ? <Skeleton rows={1} /> : (
              <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100">
                <option value="">— Select a Student Group —</option>
                {groups.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.student_group_name || g.name}{g.activeCount !== undefined ? ` (${g.activeCount} active)` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Step 2 — Assessment Plan</label>
            {plansLoading ? <Skeleton rows={1} /> : (
              <select value={selectedPlanName} onChange={(e) => setSelectedPlanName(e.target.value)}
                disabled={!selectedGroup}
                className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">
                  {!selectedGroup
                    ? "— Select a group first —"
                    : filteredPlans.length === 0
                    ? "— No plans for this group —"
                    : "— Select an Assessment Plan —"}
                </option>
                {filteredPlans.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {plan && (
          <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-green-700 font-bold"><FileCheck size={13} /> {plan.name}</span>
            <span className="flex items-center gap-1.5 text-green-600"><Users size={13} /> {selectedGroup}</span>
            {plan.course && <span className="flex items-center gap-1.5 text-green-600"><BookOpen size={13} /> {plan.course}</span>}
            <span className="flex items-center gap-1.5 text-green-600 font-semibold">
              {criteria.length} criteria · Max: {maxTotal} marks
            </span>
          </div>
        )}
      </div>

      {selectedPlanName && planLoading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8"><Skeleton rows={4} /></div>
      )}

      {plan && !planLoading && (
        <>
          {stuLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8"><Skeleton rows={6} /></div>
          ) : activeStudents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm font-semibold">No active students in {selectedGroup}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Criteria Header */}
              <div className="px-6 py-4 border-b border-gray-50 flex flex-wrap gap-2">
                {criteria.map((c) => (
                  <span key={c.assessment_criteria}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                    {c.assessment_criteria}<span className="ml-1 text-green-400">/{c.maximum_score}</span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold ml-auto">
                  Total /{maxTotal}
                </span>
              </div>

              {/* Score Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-4 py-3 w-8">#</th>
                      <th className="px-4 py-3 min-w-[160px]">Student</th>
                      {criteria.map((c) => (
                        <th key={c.assessment_criteria} className="px-3 py-3 text-center min-w-[100px]">
                          <div>{c.assessment_criteria}</div>
                          <div className="text-[9px] text-gray-300 font-normal">max {c.maximum_score}</div>
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center min-w-[80px]">Total</th>
                      <th className="px-3 py-3 min-w-[140px]">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {activeStudents.map((s, i) => {
                      const total = getTotal(s.student);
                      const pct   = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
                      const totalColor = pct >= 75 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-500";
                      return (
                        <tr key={s.student} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-400 font-mono">{s.group_roll_number ?? i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold uppercase flex-shrink-0 ${avatarColor(s.student_name)}`}>
                                {s.student_name.slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800 text-xs leading-tight">{s.student_name}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{s.student}</p>
                              </div>
                            </div>
                          </td>
                          {criteria.map((c) => {
                            const val  = scoreMap[s.student]?.[c.assessment_criteria] ?? "";
                            const over = !isNaN(parseFloat(val)) && parseFloat(val) > c.maximum_score;
                            return (
                              <td key={c.assessment_criteria} className="px-3 py-3 text-center">
                                <input type="number" min={0} max={c.maximum_score} step="0.5"
                                  value={val}
                                  onChange={(e) => handleScoreChange(s.student, c.assessment_criteria, e.target.value)}
                                  placeholder="—"
                                  className={`w-16 text-center px-2 py-1.5 rounded-lg border text-sm font-semibold focus:outline-none focus:ring-2 transition-colors ${over ? "border-red-300 bg-red-50 text-red-600 focus:ring-red-100" : "border-gray-200 bg-gray-50 text-gray-800 focus:border-green-400 focus:ring-green-100"}`}
                                />
                                {over && <p className="text-[9px] text-red-500 mt-0.5">Max {c.maximum_score}</p>}
                              </td>
                            );
                          })}
                          <td className="px-3 py-3 text-center">
                            <span className={`font-bold text-sm ${totalColor}`}>{total}</span>
                            <span className="text-[10px] text-gray-400">/{maxTotal}</span>
                            {maxTotal > 0 && (
                              <div className="mt-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${gradeBadgeColor(gradeFromPct(pct))}`}>
                                  {gradeFromPct(pct)}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <input type="text" value={commentMap[s.student] ?? ""}
                              onChange={(e) => handleCommentChange(s.student, e.target.value)}
                              placeholder="Optional…"
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Save Result Banner */}
          {saveResults && (
            <div className={`rounded-2xl px-6 py-4 flex items-start gap-3 ${saveResults.failed.length === 0 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
              {saveResults.failed.length === 0 ? (
                <>
                  <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-green-700 text-sm">Assessment results saved!</p>
                    <p className="text-xs text-green-600 mt-0.5">{saveResults.success} records saved & submitted in ERPNext.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-700 text-sm">{saveResults.success} saved · {saveResults.failed.length} failed</p>
                    <ul className="text-xs text-amber-600 mt-1 space-y-0.5">
                      {saveResults.failed.slice(0, 5).map((f, idx) => <li key={idx}>• {f}</li>)}
                      {saveResults.failed.length > 5 && <li>…and {saveResults.failed.length - 5} more</li>}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {activeStudents.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all">
                <RotateCcw size={14} /> Reset
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className={`flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${saving ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 text-white shadow-green-100"}`}>
                <Save size={15} />
                {saving ? `Saving… (${activeStudents.length})` : `Save Results (${activeStudents.length} students)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AssessmentPage;