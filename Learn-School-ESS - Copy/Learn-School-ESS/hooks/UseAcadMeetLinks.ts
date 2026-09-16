// hooks/UseAcadMeetLinks.ts
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export interface CourseSchedule {
  name: string;
  student_group: string;
  instructor: string;
  instructor_name: string;
  program: string;
  course: string;
  schedule_date: string;
  room: string;
  custom_meeting_link: string;
  from_time: string;
  to_time: string;
  title: string;
  color?: string;
  class_schedule_color?: string;
  modified?: string;
  creation?: string;
}

export interface MeetLink {
  id: string;
  subject: string;
  section: string;
  grade: string;
  program: string;
  instructor: string;
  instructor_name: string;
  url: string;
  schedule_date: string;
  from_time: string;
  to_time: string;
  room: string;
  status: 'active' | 'missing' | 'updated';
  updatedAt: string;
  lastSynced?: string;
}

// Helper to extract grade from program
const extractGrade = (program: string): string => {
  const match = program.match(/KG(\d+)|Grade[-\s]?(\d+)/i);
  if (match) {
    if (match[1]) return `KG${match[1]}`;
    if (match[2]) return match[2];
  }
  if (program.toLowerCase().includes('kg1')) return 'KG1';
  if (program.toLowerCase().includes('kg2')) return 'KG2';
  if (program.toLowerCase().includes('kg3')) return 'KG3';
  return '0';
};

// Helper to extract section from student_group
const extractSection = (studentGroup: string): string => {
  const parts = studentGroup.split('-');
  return parts[parts.length - 1] || studentGroup;
};

// Validate Meet URL
export const isValidMeetUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return false;
  const meetPattern = /^https?:\/\/(meet\.google\.com|meet\.goog)\/[a-z0-9-]{3,}-[a-z0-9-]{3,}-[a-z0-9-]{3,}/i;
  return meetPattern.test(url.trim());
};

// ✅ Real ERP-based transform — no localStorage, status derived from server data
const transformToMeetLink = (schedule: CourseSchedule): MeetLink => {
  const url = schedule.custom_meeting_link || '';
  const isValid = isValidMeetUrl(url);

  let status: 'active' | 'missing' | 'updated' = 'missing';

  if (isValid) {
    status = 'active';

    // "Recently Updated" = modified today AND modified is different from creation
    if (schedule.modified && schedule.creation) {
      const modifiedDate = schedule.modified.split(' ')[0].split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      const wasEditedAfterCreation = schedule.modified !== schedule.creation;

      if (modifiedDate === today && wasEditedAfterCreation) {
        status = 'updated';
      }
    }
  }

  return {
    id: schedule.name,
    subject: schedule.course,
    section: extractSection(schedule.student_group),
    grade: extractGrade(schedule.program),
    program: schedule.program,
    instructor: schedule.instructor,
    instructor_name: schedule.instructor_name,
    url: url,
    schedule_date: schedule.schedule_date,
    from_time: schedule.from_time,
    to_time: schedule.to_time,
    room: schedule.room,
    status: status,
    updatedAt: schedule.modified
      ? new Date(schedule.modified).toLocaleTimeString()
      : '',
    lastSynced: schedule.modified,
  };
};

export function useAcadMeetLinks() {
  const [meetLinks, setMeetLinks] = useState<MeetLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchMeetLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getCourseSchedules();

      if (!result.ok) {
        throw new Error(result.error || 'Failed to fetch course schedules');
      }

      const transformedLinks = (result.data || []).map(transformToMeetLink);

      transformedLinks.sort((a, b) => {
        if (a.schedule_date !== b.schedule_date) {
          return b.schedule_date.localeCompare(a.schedule_date);
        }
        return a.from_time.localeCompare(b.from_time);
      });

      setMeetLinks(transformedLinks);
    } catch (err) {
      console.error('Error fetching meet links:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch meet links';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMeetLink = useCallback(async (scheduleName: string, url: string) => {
  if (!isValidMeetUrl(url)) {
    toast.error('Invalid Meet URL format');
    return false;
  }

  setSaving(true);
  try {
    const result = await api.updateCourseScheduleMeetLink(scheduleName, url);

    if (result.ok) {
      setMeetLinks(prev => prev.map(link =>
        link.id === scheduleName
          ? {
              ...link,
              url: url,
              status: 'updated',
              updatedAt: new Date().toLocaleTimeString(),
            }
          : link
      ));
      toast.success('Meet link updated successfully');
      return true;
    } else {
      throw new Error(result.error || 'Update failed');
    }
  } catch (err) {
    console.error('Error updating meet link:', err);
    toast.error(err instanceof Error ? err.message : 'Failed to update meet link');
    return false;
  } finally {
    setSaving(false);
  }
}, []);


  const batchUpdateMeetLinks = useCallback(async (updates: Array<{ name: string; custom_meeting_link: string }>) => {
    setSaving(true);
    let successCount = 0;

    try {
      for (const update of updates) {
        const result = await api.updateCourseScheduleMeetLink(update.name, update.custom_meeting_link);
        if (result.ok) {
          successCount++;
          setMeetLinks(prev => prev.map(link =>
            link.id === update.name
              ? {
                  ...link,
                  url: update.custom_meeting_link,
                  status: 'updated',
                  updatedAt: new Date().toLocaleTimeString(),
                }
              : link
          ));
        }
      }

      if (successCount > 0) {
        toast.success(`Updated ${successCount} meet links`);
      }
      return successCount;
    } catch (err) {
      console.error('Error batch updating meet links:', err);
      toast.error('Failed to batch update meet links');
      return 0;
    } finally {
      setSaving(false);
    }
  }, []);

  const syncMissingLinks = useCallback(async () => {
    setSyncing(true);
    try {
      const missingLinks = meetLinks.filter(link => !link.url || link.url.trim() === '');

      if (missingLinks.length === 0) {
        toast.success('All meet links are already configured');
        return 0;
      }

      const updates = missingLinks.map(link => ({
        name: link.id,
        custom_meeting_link: `https://meet.google.com/${link.subject.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 8)}-${link.section.toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`
      }));

      const successCount = await batchUpdateMeetLinks(updates);
      if (successCount > 0) {
        toast.success(`Synced ${successCount} missing links`);
        await fetchMeetLinks();
      }
      return successCount;
    } catch (err) {
      console.error('Error syncing meet links:', err);
      toast.error('Failed to sync meet links');
      return 0;
    } finally {
      setSyncing(false);
    }
  }, [meetLinks, batchUpdateMeetLinks, fetchMeetLinks]);

  const getStats = useCallback(() => {
    const total = meetLinks.length;
    const missing = meetLinks.filter(l => !l.url || l.url.trim() === '').length;
    const active = meetLinks.filter(l => l.url && l.url.trim() !== '' && isValidMeetUrl(l.url)).length;
    const updated = meetLinks.filter(l => l.status === 'updated').length;
    return { total, missing, active, updated };
  }, [meetLinks]);

  const getTodayCount = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return meetLinks.filter(l => l.schedule_date === today).length;
  }, [meetLinks]);

  const getUniqueGrades = useCallback(() => {
    const grades = [...new Set(meetLinks.map(l => l.grade).filter(g => g !== '0'))];
    return ['All', ...grades.sort()];
  }, [meetLinks]);

  const getUniqueSubjects = useCallback(() => {
    const subjects = [...new Set(meetLinks.map(l => l.subject))];
    return ['All', ...subjects.sort()];
  }, [meetLinks]);

  useEffect(() => {
    fetchMeetLinks();
  }, [fetchMeetLinks]);

  return {
    meetLinks,
    loading,
    error,
    syncing,
    saving,
    fetchMeetLinks,
    updateMeetLink,
    batchUpdateMeetLinks,
    syncMissingLinks,
    getStats,
    getTodayCount,
    getUniqueGrades,
    getUniqueSubjects,
    isValidMeetUrl,
  };
}