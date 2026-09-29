// hooks/UseAcadTeachers.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export interface Program { name: string; program_name?: string; }
export interface Course { name: string; course_name: string; }
export interface StudentGroup { name: string; student_group_name: string; program: string; }
export interface Instructor { name: string; employee_name: string; }
export interface Assignment { course: string; student_group: string; instructor: string; instructor_name: string; }
export interface ProgramCourse { course: string; course_name: string; required: number; }
export interface CourseScheduleRecord {
  course: string;
  student_group: string;
  instructor?: string;
  instructor_name?: string;
  from_time?: string;   
  to_time?: string;     
}

// ✅ NEW: Map of course -> programs where it's taught
export interface CourseProgramMap {
  [courseName: string]: string[]; // Array of program names
}

// ─── Small concurrency helper ──────────────────────────────
async function fetchWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return results;
}

export function useAcadTeachers() {
  const [loading, setLoading] = useState(true);
  const [switchingGrade, setSwitchingGrade] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [programCourses, setProgramCourses] = useState<ProgramCourse[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courseScheduleRecords, setCourseScheduleRecords] = useState<CourseScheduleRecord[]>([]);
  const [courseProgramMap, setCourseProgramMap] = useState<CourseProgramMap>({}); // ✅ NEW
  const [conflicts, setConflicts] = useState<Map<string, boolean>>(new Map());
  const [selectedProgram, setSelectedProgram] = useState<string>('');

  const hasLoadedOnceRef = useRef(false);
  const conflictsLoadedRef = useRef(false);
  const coursesLoadedRef = useRef(false);

  // ─── Fetch master data ─────────────────────────────────────────────────
  const fetchMasterData = useCallback(async () => {
    try {
      const [progRes, courseRes, instrRes] = await Promise.all([
        api.getPrograms(),
        api.getCourses(),
        api.getInstructors(),
      ]);

      let hasError = false;
      if (progRes.ok) {
        setPrograms(progRes.data);
      } else { 
        hasError = true; 
        toast.error('Failed to load programs'); 
      }

      if (courseRes.ok) {
        setCourses(courseRes.data);
        coursesLoadedRef.current = true;
      } else { 
        hasError = true; 
        toast.error('Failed to load courses'); 
      }

      if (instrRes.ok && instrRes.data.length > 0) {
        setInstructors(instrRes.data);
      } else {
        const userRes = await api.getTeachersFromUsers();
        if (userRes.ok && userRes.data.length > 0) {
          setInstructors(userRes.data);
        } else {
          hasError = true;
          setError('Cannot load teachers list. Please check permissions.');
          toast.error('Teachers not available – contact admin.');
        }
      }

      if (hasError) {
        setError('Some data could not be loaded, but page is functional.');
      }
    } catch (err) {
      console.error('Master data error', err);
      setError('Network error fetching master data.');
    }
  }, []);

  // ─── Build course-program map from all programs' curriculum ───────────
  const buildCourseProgramMap = useCallback(async () => {
    if (programs.length === 0 || courses.length === 0) return;
    
    const map: CourseProgramMap = {};
    
    // Fetch courses for each program to build the map
    await fetchWithConcurrency(programs, 5, async (program) => {
      const res = await api.getProgramCourses(program.name);
      if (res.ok && res.data && res.data.length > 0) {
        res.data.forEach((pc: ProgramCourse) => {
          if (!map[pc.course]) {
            map[pc.course] = [];
          }
          if (!map[pc.course].includes(program.name)) {
            map[pc.course].push(program.name);
          }
        });
      }
      return null;
    });
    
    setCourseProgramMap(map);
  }, [programs, courses]);

  // ─── Fetch program courses (curriculum) ───────────────────────────────
  const fetchProgramCourses = useCallback(async (program: string) => {
    if (!program) {
      setProgramCourses([]);
      return;
    }

    try {
      const res = await api.getProgramCourses(program);
      if (res.ok && res.data && res.data.length > 0) {
        setProgramCourses(res.data);
      } else {
        setProgramCourses([]);
        console.warn(`No courses found for program: ${program}`);
      }
    } catch (error) {
      console.error('Failed to fetch program courses:', error);
      setProgramCourses([]);
    }
  }, []);

  // ─── Fetch student groups ─────────────────────────────────────────────
  const fetchStudentGroups = useCallback(async (program: string) => {
    const res = await api.getStudentGroupsByProgram(program || undefined);
    if (res.ok) setStudentGroups(res.data);
    else toast.error('Failed to load sections');
  }, []);

  // ─── Fetch assignments (ALL Course Schedule records) ──────────────────
  const fetchAssignments = useCallback(async (program?: string) => {
    const res = await api.getCourseSchedulesForAssignment(program || undefined);
    if (res.ok) {
      const allRecords: CourseScheduleRecord[] = res.data.map(s => ({
        course: s.course,
        student_group: s.student_group,
        instructor: s.instructor || '',
        instructor_name: s.instructor_name || '',
        from_time: s.from_time,   
        to_time: s.to_time,       
      }));
      
      setCourseScheduleRecords(allRecords);
      
      const assignmentList: Assignment[] = res.data
        .filter(s => s.instructor && s.instructor.trim())
        .map(s => ({
          course: s.course,
          student_group: s.student_group,
          instructor: s.instructor,
          instructor_name: s.instructor_name,
        }));
      setAssignments(assignmentList);
    } else {
      toast.error('Failed to load assignments');
    }
  }, []);

  // ─── Fetch conflicts ──────────────────────────────────────────────────
  const fetchConflicts = useCallback(async () => {
    if (instructors.length === 0) return;
    const conflictMap = new Map<string, boolean>();
    await fetchWithConcurrency(instructors, 6, async (instructor) => {
      const res = await api.getTeacherScheduleConflicts(instructor.name);
      if (res.ok && res.data.length) conflictMap.set(instructor.name, true);
      return null;
    });
    setConflicts(conflictMap);
  }, [instructors]);

  // ─── Add Section ──────────────────────────────────────────────────────
  const addSection = useCallback(async (sectionName: string): Promise<boolean> => {
    if (!selectedProgram) {
      toast.error('Please select a specific Grade/Program first');
      return false;
    }

    const res = await api.createStudentGroup(selectedProgram, sectionName);

    if (res.ok) {
      toast.success(`Section "${sectionName}" created successfully!`);
      await fetchStudentGroups(selectedProgram);
      return true;
    } else {
      toast.error(res.error || 'Failed to create section');
      return false;
    }
  }, [selectedProgram, fetchStudentGroups]);

  // ─── Refresh function (for Refresh button) ────────────────────────────
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchMasterData(),
        fetchStudentGroups(selectedProgram),
        fetchAssignments(selectedProgram),
      ]);
      
      await buildCourseProgramMap();
      await fetchConflicts();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, [selectedProgram, fetchMasterData, fetchStudentGroups, fetchAssignments, buildCourseProgramMap, fetchConflicts]);

  // ─── Initial load ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // ✅ Build course-program map when programs and courses are loaded
  useEffect(() => {
    if (programs.length > 0 && courses.length > 0) {
      buildCourseProgramMap();
    }
  }, [programs, courses, buildCourseProgramMap]);

  // ✅ When courses are loaded, fetch program courses for selected program
  useEffect(() => {
    if (courses.length > 0 && coursesLoadedRef.current) {
      fetchProgramCourses(selectedProgram);
    }
  }, [courses, selectedProgram, fetchProgramCourses]);

  // ✅ Set selected program after programs are loaded
  useEffect(() => {
    if (programs.length && !selectedProgram && programs[0]) {
      setSelectedProgram(programs[0].name);
    }
  }, [programs]);

  useEffect(() => {
    if (instructors.length > 0 && !conflictsLoadedRef.current) {
      conflictsLoadedRef.current = true;
      fetchConflicts();
    }
  }, [instructors, fetchConflicts]);

  // ─── Grade switch (also handles "All Grades") ─────────────────────────
  useEffect(() => {
    const isFirstLoad = !hasLoadedOnceRef.current;
    if (isFirstLoad) setLoading(true);
    else setSwitchingGrade(true);

    Promise.all([
      fetchStudentGroups(selectedProgram),
      fetchAssignments(selectedProgram),
      fetchProgramCourses(selectedProgram),
    ])
      .catch(() => {})
      .finally(() => {
        hasLoadedOnceRef.current = true;
        setLoading(false);
        setSwitchingGrade(false);
      });
  }, [selectedProgram, fetchStudentGroups, fetchAssignments, fetchProgramCourses]);

  // ─── Helper functions ─────────────────────────────────────────────────
  const getInstructorFor = useCallback((course: string, section: string): string => {
    const a = assignments.find(a => a.course === course && a.student_group === section);
    return a?.instructor_name || '';
  }, [assignments]);

  // ─── Get sections for a specific course ───────────────────────────────
  const getSectionsForCourse = useCallback((courseName: string): string[] => {
    if (!selectedProgram) {
      // ✅ For "All Grades": Get sections from programs where this course is taught
      const programsForCourse = courseProgramMap[courseName] || [];
      
      // Get all student groups that belong to these programs
      const relevantSections = studentGroups
        .filter(group => programsForCourse.includes(group.program))
        .map(group => group.name);
      
      return relevantSections;
    }
    
    // For specific program: Get all sections for that program
    return studentGroups.map(g => g.name);
  }, [selectedProgram, courseProgramMap, studentGroups]);

  // ─── Filtered courses based on selected program ───────────────────────
  const getFilteredCourses = useCallback((): Course[] => {
    if (!selectedProgram) {
      // ✅ For "All Grades": Show courses that exist in course-program map
      const courseNames = Object.keys(courseProgramMap);
      return courses.filter(c => courseNames.includes(c.name));
    }
    
    if (programCourses.length > 0) {
      const programCourseNames = new Set(programCourses.map(pc => pc.course));
      return courses.filter(c => programCourseNames.has(c.name));
    }
    
    return [];
  }, [courses, programCourses, selectedProgram, courseProgramMap]);

  const currentCourses = useMemo(() => getFilteredCourses(), [getFilteredCourses]);

  // ─── Stats (Fixed calculation) ───────────────────────────────────────
  const stats = useMemo(() => {
    if (!selectedProgram) {
      // ✅ For "All Grades": Calculate based on course-program map
      const assignedCount = assignments.length;
      const conflictCount = Array.from(conflicts.values()).filter(v => v).length;
      
      // Total cells = sum of relevant sections per course
      const totalCells = currentCourses.reduce((sum, course) => {
        const sectionsForCourse = getSectionsForCourse(course.name);
        return sum + sectionsForCourse.length;
      }, 0);
      
      const unassignedCount = Math.max(0, totalCells - assignedCount);
      return { totalCells, assignedCount, unassignedCount, conflictCount };
    }
    
    // For specific program: Calculate based on curriculum
    const totalCells = currentCourses.length * studentGroups.length;
    const validCourseNames = new Set(currentCourses.map(c => c.name));
    const validSectionNames = new Set(studentGroups.map(g => g.name));
    
    const validAssignments = assignments.filter(a => 
      validCourseNames.has(a.course) && 
      validSectionNames.has(a.student_group)
    );
    
    const assignedCount = validAssignments.length;
    const unassignedCount = Math.max(0, totalCells - assignedCount);
    const conflictCount = Array.from(conflicts.values()).filter(v => v).length;

    return { totalCells, assignedCount, unassignedCount, conflictCount };
  }, [currentCourses, studentGroups, assignments, conflicts, selectedProgram, getSectionsForCourse]);

  const assignTeacher = useCallback(async (course: string, section: string, instructorId: string, instructorName: string) => {
    console.log('📤 Assigning teacher:', { course, section, instructorId, instructorName, selectedProgram });

    const res = await api.assignTeacherToCourseGroup(course, section, instructorId, instructorName, selectedProgram);
    console.log('📥 Assignment response:', res);

    if (res.ok) {
      toast.success(`Assigned ${instructorName} to ${course} - ${section}`);
      await fetchAssignments(selectedProgram);
      await fetchConflicts();
      return true;
    } else {
      toast.error(res.error || 'Assignment failed');
      return false;
    }
  }, [selectedProgram, fetchAssignments, fetchConflicts]);

  const removeTeacher = useCallback(async (course: string, section: string) => {
    const res = await api.removeTeacherFromCourseGroup(course, section);
    if (res.ok) {
      toast.success(`Removed teacher from ${course} - ${section}`);
      await fetchAssignments(selectedProgram);
      await fetchConflicts();
      return true;
    } else {
      toast.error(res.error || 'Removal failed');
      return false;
    }
  }, [selectedProgram, fetchAssignments, fetchConflicts]);

  const exportCSV = useCallback(() => {
    const filteredCourses = getFilteredCourses();
    
    // Get all unique sections
    const allSections = studentGroups.map(g => g.name);
    let csv = `Subject,${allSections.join(',')}\n`;
    
    for (const course of filteredCourses) {
      const row = [course.course_name || course.name];
      const relevantSections = getSectionsForCourse(course.name);
      
      for (const sec of allSections) {
        if (!selectedProgram && !relevantSections.includes(sec)) {
          row.push(''); // Empty for non-relevant sections
        } else {
          const teacher = getInstructorFor(course.name, sec);
          row.push(teacher || 'Unassigned');
        }
      }
      csv += row.join(',') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedProgram || 'all_grades'}_teacher_assignments.csv`;
    link.click();
    toast.success('CSV exported');
  }, [courses, studentGroups, getInstructorFor, selectedProgram, getSectionsForCourse, getFilteredCourses]);

  return {
    loading,
    switchingGrade,
    refreshing,
    error,
    programs,
    courses: currentCourses,
    instructors,
    studentGroups,
    selectedProgram,
    setSelectedProgram,
    assignments,
    courseScheduleRecords, 
    conflicts,
    getInstructorFor,
    getSectionsForCourse,
    assignTeacher,
    removeTeacher,
    addSection,
    exportCSV,
    refresh,
    stats,
  };
}