import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, X, Trash2, ArrowLeft,
  RefreshCw, AlertCircle, CheckCircle2, Circle, ChevronDown,
} from "lucide-react";
import { useTodo } from "../hooks/useTodo";
import { TodoRecord } from "../services/api";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function isOverdue(d?: string): boolean {
  if (!d) return false;
  const dt = new Date(d + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return dt < today;
}

// ── Add Task Modal ────────────────────────────────────────────────────────────
function AddTaskModal({
  onClose, onSave, saving,
}: {
  onClose: () => void;
  onSave: (p: { description: string; priority: string; date?: string }) => Promise<any>;
  saving: boolean;
}) {
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!description.trim()) { setError("Description is mandatory"); return; }
    const res = await onSave({ description: description.trim(), priority, date: date || undefined });
    if (res?.ok !== false) onClose();
    else setError("Not saved, try again!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.18s ease-out" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-black text-gray-800 text-base">Create Task</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Task Name *</label>
            <textarea autoFocus rows={3} value={description}
              onChange={(e) => { setDescription(e.target.value); setError(""); }}
              placeholder="What needs to be done..."
              className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-green-100 transition-colors ${
                error ? "border-red-300" : "border-gray-200 focus:border-green-400"
              }`} />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-none focus:border-green-400 bg-gray-50">
                <option value="Low">🟢 Low</option>
                <option value="Medium">🟡 Medium</option>
                <option value="High">🔴 High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Due Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-green-400 bg-gray-50" />
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-all">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
            {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><Plus size={15} /> Add Task</>}
          </button>
        </div>
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.93) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export const TodoPage: React.FC = () => {
  const navigate = useNavigate();
  const { todos, loading, error, saving, fetchTodos, createTodo, toggleStatus, deleteTodo } = useTodo();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "Open" | "Closed">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "High" | "Medium" | "Low">("all");
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [showPriorityDrop, setShowPriorityDrop] = useState(false);

  const filtered = useMemo(() => {
    return todos.filter((t) => {
      const desc = stripHtml(t.description || "").toLowerCase();
      const matchSearch = !search || desc.includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [todos, search, statusFilter, priorityFilter]);

  const stats = {
    total: todos.length,
    open: todos.filter((t) => t.status === "Open").length,
    closed: todos.filter((t) => t.status === "Closed").length,
  };

  const statusLabel = statusFilter === "all" ? "All Status" : statusFilter === "Closed" ? "Completed" : "Open";
  const priorityLabel = priorityFilter === "all" ? "All Priority" : priorityFilter;

  return (
    <div className="space-y-5 animate-fade-in"
      onClick={() => { setShowStatusDrop(false); setShowPriorityDrop(false); }}>

      {/* Back */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate("/ess")}
          className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 hover:text-green-700 text-gray-600 rounded-xl text-sm font-bold transition-all group">
          <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Todo</h1>
          <p className="text-sm text-gray-400 mt-0.5">{stats.open} open · {stats.closed} completed · {stats.total} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={fetchTodos}
            className="p-2.5 rounded-xl border-2 border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-300 hover:bg-green-50 transition-all">
            <RefreshCw size={16} />
          </button>
          <button type="button" onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-green-100">
            <Plus size={16} /> + Create Task
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Search task..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 transition-all" />
          {search && (
            <button type="button" onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button type="button"
            onClick={() => { setShowStatusDrop((v) => !v); setShowPriorityDrop(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              statusFilter !== "all" ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}>
            {statusLabel}
            <ChevronDown size={14} className={`transition-transform ${showStatusDrop ? "rotate-180" : ""}`} />
          </button>
          {showStatusDrop && (
            <div className="absolute top-full mt-1 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden min-w-[140px]">
              {[{ value: "all", label: "All Status" }, { value: "Open", label: "Open" }, { value: "Closed", label: "Completed" }].map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => { setStatusFilter(opt.value as any); setShowStatusDrop(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${statusFilter === opt.value ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button type="button"
            onClick={() => { setShowPriorityDrop((v) => !v); setShowStatusDrop(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              priorityFilter !== "all" ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}>
            {priorityLabel}
            <ChevronDown size={14} className={`transition-transform ${showPriorityDrop ? "rotate-180" : ""}`} />
          </button>
          {showPriorityDrop && (
            <div className="absolute top-full mt-1 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden min-w-[140px]">
              {[{ value: "all", label: "All Priority" }, { value: "High", label: "🔴 High" }, { value: "Medium", label: "🟡 Medium" }, { value: "Low", label: "🟢 Low" }].map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => { setPriorityFilter(opt.value as any); setShowPriorityDrop(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${priorityFilter === opt.value ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} of {todos.length} tasks</span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Header row */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_48px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
          {["Task Name", "Created By", "Due Date", "Assigned By", "Status", ""].map((h) => (
            <div key={h} className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{h}</div>
          ))}
        </div>

        {/* Loading skeletons */}
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_48px] gap-4 px-5 py-4 border-b border-gray-50 items-center">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 bg-gray-100 animate-pulse rounded-lg" />
            ))}
            <div />
          </div>
        ))}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <CheckCircle2 size={26} className="text-gray-200" />
            </div>
            <p className="text-sm font-bold text-gray-400 mb-4">No tasks yet</p>
            {todos.length === 0 && (
              <button type="button" onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors">
                <Plus size={14} /> Create Your First Task
              </button>
            )}
          </div>
        )}

        {/* Rows */}
        {!loading && filtered.map((todo) => {
          const isClosed = todo.status === "Closed";
          const desc = stripHtml(todo.description || "");
          const overdue = isOverdue(todo.date) && !isClosed;

          return (
            <div key={todo.name}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_48px] gap-4 px-5 py-4 border-b border-gray-50 hover:bg-gray-50/60 transition-colors items-center group">

              {/* Task Name */}
              <div className="flex items-center gap-3 min-w-0">
                <button type="button" onClick={() => toggleStatus(todo)} disabled={saving}
                  className="flex-shrink-0 transition-transform hover:scale-110">
                  {isClosed
                    ? <CheckCircle2 size={18} className="text-green-500" />
                    : <Circle size={18} className="text-gray-300 hover:text-green-400 transition-colors" />
                  }
                </button>
                <span className={`text-sm font-semibold truncate ${isClosed ? "line-through text-gray-400" : "text-gray-800"}`}>
                  {desc || "(No description)"}
                </span>
              </div>

              {/* Created By */}
              <div className="text-xs text-gray-500 font-medium">
                {todo.owner ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                      {todo.owner[0]?.toUpperCase() ?? "A"}
                    </span>
                    <span className="truncate">{todo.owner.split("@")[0]}</span>
                  </span>
                ) : <span className="text-gray-300">—</span>}
              </div>

              {/* Due Date */}
              <div className={`text-xs font-semibold ${overdue ? "text-red-500" : "text-gray-500"}`}>
                {todo.date
                  ? <>
                      {new Date(todo.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric", year: "numeric",
                      })}
                      {overdue && <span className="ml-1 text-[10px] text-red-400">(Overdue)</span>}
                    </>
                  : <span className="text-gray-300">—</span>
                }
              </div>

              {/* Assigned By */}
              <div className="text-xs text-gray-500 font-medium">
                {todo.assigned_by_full_name ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                      {todo.assigned_by_full_name[0].toUpperCase()}
                    </span>
                    <span className="truncate">{todo.assigned_by_full_name}</span>
                  </span>
                ) : <span className="text-gray-300">—</span>}
              </div>

              {/* Status */}
              <div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                  isClosed
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-amber-50 text-amber-700 border-amber-100"
                }`}>
                  {isClosed ? "Completed" : "In-Progress"}
                </span>
              </div>

              {/* Delete */}
              <div className="flex justify-center">
                <button type="button" onClick={() => deleteTodo(todo.name)} disabled={saving}
                  className="p-1.5 rounded-lg text-gray-200 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <AddTaskModal onClose={() => setShowModal(false)} onSave={createTodo} saving={saving} />
      )}
    </div>
  );
};