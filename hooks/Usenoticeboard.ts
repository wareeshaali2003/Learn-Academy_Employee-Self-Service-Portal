import { useState, useEffect, useCallback } from "react";
import {
  api,
  NoticeBoardDetail,
  CreateNoticeBoardPayload,
  UpdateNoticeBoardPayload,
} from "../services/api";

// ── useNoticeBoard ──────────────────────────────────────────────────────────
// Admin → Notice Board module hook.
// Mirrors the project's existing admin hooks: fetch-on-mount, `loading`,
// `error`, `refresh()`, plus create/update/delete wrappers that refresh
// the list on success so the UI always reflects server state.

export interface UseNoticeBoardResult {
  notices: NoticeBoardDetail[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createNotice: (payload: CreateNoticeBoardPayload) => Promise<{ success: boolean; error?: string }>;
  updateNotice: (name: string, payload: UpdateNoticeBoardPayload) => Promise<{ success: boolean; error?: string }>;
  deleteNotice: (name: string) => Promise<{ success: boolean; error?: string }>;
}

export function useNoticeBoard(): UseNoticeBoardResult {
  const [notices, setNotices] = useState<NoticeBoardDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await api.getAllNoticeBoard();

    if (res.ok) {
      // Newest first (in case the backend ignores order_by on some setups)
      const sorted = [...res.data].sort((a, b) =>
        (b.creation || "").localeCompare(a.creation || "")
      );
      setNotices(sorted);
    } else {
      setError(res.error || "Failed to load notices");
      setNotices([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const refresh = useCallback(async () => {
    await fetchNotices();
  }, [fetchNotices]);

  const createNotice = useCallback(
    async (payload: CreateNoticeBoardPayload) => {
      const res = await api.createNoticeBoard(payload);
      if (res.ok) {
        await fetchNotices();
        return { success: true };
      }
      return { success: false, error: res.error };
    },
    [fetchNotices]
  );

  const updateNotice = useCallback(
    async (name: string, payload: UpdateNoticeBoardPayload) => {
      const res = await api.updateNoticeBoard(name, payload);
      if (res.ok) {
        await fetchNotices();
        return { success: true };
      }
      return { success: false, error: res.error };
    },
    [fetchNotices]
  );

  const deleteNotice = useCallback(
    async (name: string) => {
      const res = await api.deleteNoticeBoard(name);
      if (res.ok) {
        // Optimistic local removal too, so the row disappears instantly
        // even before refresh() resolves.
        setNotices((prev) => prev.filter((n) => n.name !== name));
        await fetchNotices();
        return { success: true };
      }
      return { success: false, error: res.error };
    },
    [fetchNotices]
  );

  return { notices, loading, error, refresh, createNotice, updateNotice, deleteNotice };
}

export default useNoticeBoard;