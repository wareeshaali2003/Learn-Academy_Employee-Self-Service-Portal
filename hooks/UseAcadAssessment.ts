// hooks/UseAcadAssessment.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { AssessmentResult, AssessmentResultFilters, AssessmentResultDetail } from '../services/api';

export type { AssessmentResult, AssessmentResultFilters, AssessmentResultDetail };

export interface AssessmentPlan {
  name: string;
  student_group: string;
  program: string;
  course: string;
  academic_year: string;
  academic_term: string;
  assessment_group: string;
  grading_scale: string;
  maximum_assessment_score: number;
  assessment_criteria?: Array<{
    name: string;
    assessment_criteria: string;
    maximum_score: number;
  }>;
}

export interface StudentResultRow {
  student: string;
  student_name: string;
  resultName: string | null;
  totalScore: number | null;
  maxScore: number;
  grade: string | null;
  percentage: number | null;
  flag: 'top' | 'risk' | 'pass' | null;
  docstatus: number;
  details: Array<{
    assessment_criteria: string;
    maximum_score: number;
    score: number;
    grade: string;
  }>;
}

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCached(key: string, ttl: number = CACHE_DURATION): any {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  return null;
}

function setCached(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function useAcadAssessment() {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [plans, setPlans] = useState<AssessmentPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to prevent unnecessary re-renders
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fetch Assessment Plans with caching
  const fetchPlans = useCallback(async (filters?: {
    program?: string;
    course?: string;
    student_group?: string;
    academic_year?: string;
  }) => {
    const cacheKey = `plans_${JSON.stringify(filters)}`;
    const cached = getCached(cacheKey);

    if (cached) {
      setPlans(cached);
      return cached;
    }

    setPlansLoading(true);
    try {
      const res = await api.getAcadAssessmentPlans(filters);
      if (res.ok && isMountedRef.current) {
        setPlans(res.data as AssessmentPlan[]);
        setCached(cacheKey, res.data);
        return res.data;
      } else if (!res.ok) {
        throw new Error(res.error || 'Failed to fetch plans');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch plans';
      if (isMountedRef.current) toast.error(msg);
      return [];
    } finally {
      if (isMountedRef.current) setPlansLoading(false);
    }
  }, []);

  // Fetch single Assessment Plan detail (with criteria) - cached
  const fetchPlanDetail = useCallback(async (planName: string): Promise<AssessmentPlan | null> => {
    if (!planName) return null;

    const cacheKey = `plan_detail_${planName}`;
    const cached = getCached(cacheKey);
    if (cached) return cached as AssessmentPlan;

    try {
      const res = await api.getAssessmentPlanDetailFull(planName);
      if (res.ok && res.data) {
        const data = res.data as AssessmentPlan;
        setCached(cacheKey, data);
        return data;
      }
      return null;
    } catch (err) {
      console.warn('[fetchPlanDetail] failed:', err);
      return null;
    }
  }, []);

  // Optimized fetch results - single API call with full data
  const fetchResults = useCallback(async (filters?: AssessmentResultFilters) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Single API call - details fetched internally with limited concurrency
      const res = await api.getAcadAssessmentResults(filters);

      if (!isMountedRef.current) return [];

      if (!res.ok) {
        throw new Error(res.error || 'Failed to fetch assessment results');
      }

      const data = res.data || [];
      setResults(data);
      return data;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return [];
      }
      const msg = err instanceof Error ? err.message : 'Failed to fetch results';
      if (isMountedRef.current) {
        setError(msg);
        toast.error(msg);
      }
      return [];
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  // Bulk Save Grades - parallel processing with Promise.all (batched)
  const bulkSaveGrades = useCallback(async (
    entries: Array<{
      assessment_plan: string;
      student: string;
      student_name: string;
      student_group: string;
      program?: string;
      course?: string;
      academic_year?: string;
      academic_term?: string;
      assessment_group?: string;
      grading_scale?: string;
      maximum_score: number;
      total_score: number;
      grade: string;
      details: Array<{
        assessment_criteria: string;
        maximum_score: number;
        score: number;
        grade: string;
      }>;
    }>
  ): Promise<{ saved: number; failed: number }> => {
    setSaving(true);

    // Process in batches of 5 to avoid overwhelming the server
    const BATCH_SIZE = 5;
    let saved = 0;
    let failed = 0;

    try {
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (entry) => {
          const res = await api.saveAssessmentResult({
            assessment_plan: entry.assessment_plan,
            student: entry.student,
            student_name: entry.student_name,
            student_group: entry.student_group,
            program: entry.program,
            course: entry.course,
            academic_year: entry.academic_year,
            academic_term: entry.academic_term,
            assessment_group: entry.assessment_group,
            grading_scale: entry.grading_scale,
            maximum_score: entry.maximum_score,
            grade: entry.grade,
            details: entry.details,
          });
          return { success: res.success, studentName: entry.student_name, error: res.error };
        });

        const batchResults = await Promise.all(promises);
        for (const result of batchResults) {
          if (result.success) saved++;
          else {
            failed++;
            console.error(`Failed for ${result.studentName}:`, result.error);
          }
        }
      }

      if (saved > 0 && isMountedRef.current) toast.success(`${saved} grade(s) saved successfully`);
      if (failed > 0 && isMountedRef.current) toast.error(`${failed} grade(s) failed to save`);

      // Clear cache after save
      cache.clear();

      return { saved, failed };
    } catch (err) {
      if (isMountedRef.current) toast.error('Bulk save failed');
      return { saved, failed };
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  }, []);

  const submitResult = useCallback(async (resultId: string, studentName: string): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await api.submitAcadAssessmentResult(resultId);
      if (!res.ok) throw new Error(res.error || 'Submit failed');
      setResults(prev => prev.map(r => r.name === resultId ? { ...r, docstatus: 1 } : r));
      toast.success(`${studentName}'s result submitted`);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const cancelResult = useCallback(async (resultId: string, studentName: string): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await api.cancelAcadAssessmentResult(resultId);
      if (!res.ok) throw new Error(res.error || 'Cancel failed');
      setResults(prev => prev.map(r => r.name === resultId ? { ...r, docstatus: 2 } : r));
      toast.success(`${studentName}'s result cancelled`);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteResult = useCallback(async (resultId: string, studentName: string): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await api.deleteAcadAssessmentResult(resultId);
      if (!res.ok) throw new Error(res.error || 'Delete failed');
      setResults(prev => prev.filter(r => r.name !== resultId));
      toast.success(`${studentName}'s result deleted`);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const buildStudentRows = useCallback((
    groupStudents: Array<{ student: string; student_name: string }>,
    assessmentResults: AssessmentResult[],
    planMaxScore: number
  ): StudentResultRow[] => {
    // Create a map for O(1) lookup
    const resultsMap = new Map(assessmentResults.map(r => [r.student, r]));

    return groupStudents.map(s => {
      const result = resultsMap.get(s.student);
      if (!result) {
        return {
          student: s.student,
          student_name: s.student_name,
          resultName: null,
          totalScore: null,
          maxScore: planMaxScore,
          grade: null,
          percentage: null,
          flag: null,
          docstatus: 0,
          details: [],
        };
      }
      const pct = result.maximum_score > 0
        ? Math.round((result.total_score / result.maximum_score) * 100)
        : 0;
      return {
        student: result.student,
        student_name: result.student_name,
        resultName: result.name,
        totalScore: result.total_score,
        maxScore: result.maximum_score,
        grade: result.grade,
        percentage: pct,
        flag: pct >= 80 ? 'top' : pct < 60 ? 'risk' : 'pass',
        docstatus: result.docstatus ?? 0,
        details: (result.details || []).map((d: AssessmentResultDetail) => ({
          assessment_criteria: d.assessment_criteria,
          maximum_score: d.maximum_score,
          score: d.score,
          grade: d.grade || '',
        })),
      };
    });
  }, []);

  const calcGrade = useCallback((pct: number): string => {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  }, []);

  const getLocalStats = useCallback((data?: AssessmentResult[]) => {
    const list = data ?? results;
    if (!list.length) return { avg: 0, passRate: 0, atRisk: 0, top: 0, pending: 0, gradeCount: {} };

    const pcts = list
      .filter(r => r.maximum_score > 0)
      .map(r => Math.round((r.total_score / r.maximum_score) * 100));

    const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
    const passRate = pcts.length ? Math.round(pcts.filter(p => p >= 60).length / pcts.length * 100) : 0;
    const atRisk = pcts.filter(p => p < 60).length;
    const top = pcts.filter(p => p >= 80).length;
    const pending = list.filter(r => (r.docstatus ?? 0) === 0).length;

    const gradeCount: Record<string, number> = {};
    list.forEach(r => {
      gradeCount[r.grade] = (gradeCount[r.grade] ?? 0) + 1;
    });

    return { avg, passRate, atRisk, top, pending, gradeCount };
  }, [results]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    results,
    plans,
    loading,
    plansLoading,
    saving,
    error,
    fetchResults,
    fetchPlans,
    fetchPlanDetail,
    bulkSaveGrades,
    submitResult,
    cancelResult,
    deleteResult,
    buildStudentRows,
    calcGrade,
    getLocalStats,
  };
}