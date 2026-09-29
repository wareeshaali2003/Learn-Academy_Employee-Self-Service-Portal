// hooks/useAssessment.ts

import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

export interface AssessmentPlan {
  name: string;
  student_group: string;
  program?: string;
  course?: string;
  academic_year?: string;
  academic_term?: string;
  assessment_group?: string;
  grading_scale?: string;
  maximum_assessment_score?: number;
}

export interface AssessmentCriteria {
  assessment_criteria: string;
  maximum_score: number;
}

export interface AssessmentPlanDetail extends AssessmentPlan {
  assessment_criteria: AssessmentCriteria[];
}

export interface AssessmentResult {
  name: string;
  student: string;
  student_name: string;
  assessment_plan: string;
  student_group: string;
  program?: string;
  course?: string;
  total_score?: number;
  maximum_score?: number;
  grade?: string;
  comment?: string;
}

// ─── useAssessmentPlans ───────────────────────────────────────────────────────

export function useAssessmentPlans() {
  const [plans, setPlans]     = useState<AssessmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Instructor ke student groups lo — api.ts khud Instructor ID
      // (TA-XXXXX) resolve karega Employee profile se, naam ki zaroorat nahi.
      const groupsRes = await api.getStudentGroups();
      if (!groupsRes.ok) throw new Error(groupsRes.error);

      const instructorGroups = new Set<string>(
        (groupsRes.data as any[]).map((g: any) => g.name).filter(Boolean)
      );

      if (instructorGroups.size === 0) { setPlans([]); return; }

      // Step 2: Saare plans fetch karo aur instructor groups se match karo
      const res = await api.getAssessmentPlans();
      if (!res.ok) throw new Error(res.error);

      const filtered = (res.data as AssessmentPlan[]).filter(
        (p) => instructorGroups.has(p.student_group)
      );

      setPlans(filtered);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load assessment plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  return { plans, loading, error };
}

// ─── useAssessmentPlanDetail ──────────────────────────────────────────────────

export function useAssessmentPlanDetail(planName: string | null) {
  const [plan, setPlan]       = useState<AssessmentPlanDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!planName) { setPlan(null); return; }
    setLoading(true);
    setError(null);
    api.getAssessmentPlanDetail(planName)
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setPlan(res.data as AssessmentPlanDetail);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load plan details");
      })
      .finally(() => setLoading(false));
  }, [planName]);

  return { plan, loading, error };
}

// ─── useAssessmentResults ─────────────────────────────────────────────────────

export function useAssessmentResults(planName?: string, groupName?: string) {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    if (!planName && !groupName) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAssessmentResults(planName, groupName);
      if (!res.ok) throw new Error(res.error);
      setResults(res.data as AssessmentResult[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [planName, groupName]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  return { results, loading, error, refetch: fetchResults };
}