import { useState, useEffect, useCallback, useMemo } from "react";
import { api, CourseSchedule } from "../services/api";
import {
  extractGradeNumber,
  getScreenTimeLimit,
  timeStrToMinutes,
  ScreenTimeLimit,
} from "../components/Shared";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SectionScheduleSummary {
  section: string;              // student_group, e.g. "Grade-6-A" — ONE section
  program: string;
  instructorNames: string[];
  classCount: number;           // how many periods this section had that day
  usedMinutes: number;          // total scheduled time for that section, that day
  limit: ScreenTimeLimit | null;
  entries: CourseSchedule[];    // individual periods, sorted by time
}

export interface GradeScheduleSummary {
  gradeNumber: number | null;
  gradeLabel: string;           // "Grade 6" or "Other / KG"
  totalClasses: number;         // sum of classCount across all its sections
  totalMinutes: number;         // sum of usedMinutes across all its sections
  sections: SectionScheduleSummary[];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useCeoSchedule(initialDate?: string) {
  const [date, setDate] = useState<string>(initialDate || todayStr());
  const [rows, setRows] = useState<CourseSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    const res = await api.getCourseSchedulesByDateRange({ from_date: d, to_date: d });
    if (res.ok) {
      setRows(res.data || []);
    } else {
      setError(res.error || "Failed to load schedule");
      setRows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(date);
  }, [date, load]);

  // Group every period into its section, for THIS date only, skipping holidays.
  const grades = useMemo<GradeScheduleSummary[]>(() => {
    const bySection: Record<string, CourseSchedule[]> = {};
    rows.forEach((r) => {
      if (r.custom_is_holiday) return;
      const key = (r.student_group || "Unknown").trim();
      if (!bySection[key]) bySection[key] = [];
      bySection[key].push(r);
    });

    const sectionSummaries: SectionScheduleSummary[] = Object.entries(bySection).map(
      ([section, entries]) => {
        let usedMinutes = 0;
        entries.forEach((e) => {
          const from = timeStrToMinutes(e.from_time);
          const to = timeStrToMinutes(e.to_time);
          if (from !== null && to !== null && to > from) usedMinutes += to - from;
        });

        const gradeNumber =
          extractGradeNumber(section) ?? extractGradeNumber(entries[0]?.program);

        const instructorNames = Array.from(
          new Set(entries.map((e) => e.instructor_name).filter(Boolean))
        );

        return {
          section,
          program: entries[0]?.program || "",
          instructorNames,
          classCount: entries.length,
          usedMinutes,
          limit: getScreenTimeLimit(gradeNumber),
          entries: [...entries].sort((a, b) => a.from_time.localeCompare(b.from_time)),
        };
      }
    );

    // Roll sections up into their grade.
    const byGrade: Record<string, SectionScheduleSummary[]> = {};
    sectionSummaries.forEach((s) => {
      const gradeNumber =
        extractGradeNumber(s.section) ?? extractGradeNumber(s.program);
      const gradeKey = gradeNumber !== null ? `Grade ${gradeNumber}` : (s.program || "Other / KG");
      if (!byGrade[gradeKey]) byGrade[gradeKey] = [];
      byGrade[gradeKey].push(s);
    });

    const result: GradeScheduleSummary[] = Object.entries(byGrade).map(
      ([gradeLabel, sections]) => {
        const gradeNumber = extractGradeNumber(gradeLabel);
        return {
          gradeNumber,
          gradeLabel,
          totalClasses: sections.reduce((sum, s) => sum + s.classCount, 0),
          totalMinutes: sections.reduce((sum, s) => sum + s.usedMinutes, 0),
          sections: sections.sort((a, b) => a.section.localeCompare(b.section)),
        };
      }
    );

    result.sort((a, b) => {
      if (a.gradeNumber === null && b.gradeNumber === null) return a.gradeLabel.localeCompare(b.gradeLabel);
      if (a.gradeNumber === null) return 1;
      if (b.gradeNumber === null) return -1;
      return a.gradeNumber - b.gradeNumber;
    });

    return result;
  }, [rows]);

  const totals = useMemo(() => {
    return {
      totalClasses: grades.reduce((sum, g) => sum + g.totalClasses, 0),
      totalSections: grades.reduce((sum, g) => sum + g.sections.length, 0),
      totalMinutes: grades.reduce((sum, g) => sum + g.totalMinutes, 0),
    };
  }, [grades]);

  return {
    date,
    setDate,
    grades,
    totals,
    loading,
    error,
    refresh: () => load(date),
  };
}