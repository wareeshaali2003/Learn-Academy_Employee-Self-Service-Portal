import { useState, useEffect, useCallback } from "react";
import { api, CalendarEvent } from "../services/api";

export function useCalendar(employeeName?: string) {  // ← added param
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getEvents(undefined, undefined, employeeName); // ← pass name
    if (res.ok) setEvents(res.data);
    else setError(res.error);
    setLoading(false);
  }, [employeeName]); // ← added dependency

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (payload: {
    subject: string;
    starts_on: string;
    ends_on?: string;
    color?: string;
    event_type?: string;
    description?: string;
    all_day?: number;
  }) => {
    setSaving(true);
    const res = await api.createEvent({ event_type: "Public", ...payload });
    if (res.ok) await fetchEvents();
    setSaving(false);
    return res;
  };

  const deleteEvent = async (name: string) => {
    setSaving(true);
    const res = await api.deleteEvent(name);
    if (res.ok) await fetchEvents();
    setSaving(false);
    return res;
  };

  return { events, loading, error, saving, fetchEvents, createEvent, deleteEvent };
}