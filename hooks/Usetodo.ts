import { useState, useEffect, useCallback } from "react";
import { api, TodoRecord } from "../services/api";

export function useTodo() {
  const [todos, setTodos] = useState<TodoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getTodos();
    if (res.ok) setTodos(res.data);
    else setError(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const createTodo = async (payload: {
    description: string;
    priority?: string;
    date?: string;
  }) => {
    setSaving(true);
    const res = await api.createTodo({ ...payload, status: "Open" });
    if (res.ok) await fetchTodos();
    setSaving(false);
    return res;
  };

  const updateTodo = async (
    name: string,
    payload: { status?: string; priority?: string; description?: string; date?: string }
  ) => {
    setSaving(true);
    const res = await api.updateTodo(name, payload);
    if (res.ok) await fetchTodos();
    setSaving(false);
    return res;
  };

  const deleteTodo = async (name: string) => {
    setSaving(true);
    const res = await api.deleteTodo(name);
    if (res.ok) await fetchTodos();
    setSaving(false);
    return res;
  };

  const toggleStatus = async (todo: TodoRecord) => {
    const newStatus = todo.status === "Open" ? "Closed" : "Open";
    return updateTodo(todo.name, { status: newStatus });
  };

  // Stats
  const stats = {
    total: todos.length,
    open: todos.filter((t) => t.status === "Open").length,
    closed: todos.filter((t) => t.status === "Closed").length,
    high: todos.filter((t) => t.priority === "High" && t.status === "Open").length,
  };

  return {
    todos,
    loading,
    error,
    saving,
    stats,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleStatus,
  };
}