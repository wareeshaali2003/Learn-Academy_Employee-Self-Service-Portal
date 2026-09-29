import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Plus, X, ArrowLeft,
  RefreshCw, AlertCircle, Calendar, List,
} from "lucide-react";
import { useCalendar } from "../hooks/Usecalendar";
import { CalendarEvent } from "../services/api";

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const EVENT_COLORS = [
  "#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6",
  "#EC4899","#06B6D4","#84CC16",
];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function eventOnDay(ev: CalendarEvent, dateStr: string): boolean {
  const start = ev.starts_on?.slice(0, 10) ?? "";
  const end   = (ev.ends_on ?? ev.starts_on)?.slice(0, 10) ?? start;
  return dateStr >= start && dateStr <= end;
}

function formatTime(dt?: string): string {
  if (!dt) return "";
  const t = dt.split(" ")[1];
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${String(m).padStart(2,"0")}${ampm}`;
}

// ── Add Event Modal ───────────────────────────────────────────────────────────
function AddEventModal({
  onClose, onSave, saving, defaultDate,
}: {
  onClose: () => void;
  onSave: (p: any) => Promise<any>;
  saving: boolean;
  defaultDate?: string;
}) {
  const today = defaultDate || toDateStr(new Date());
  const [subject, setSubject] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(today);
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [allDay, setAllDay] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!subject.trim()) { setError("Title is required"); return; }
    const starts_on = allDay ? `${startDate} 00:00:00` : `${startDate} ${startTime}:00`;
    const ends_on   = allDay ? `${endDate} 23:59:59`   : `${endDate} ${endTime}:00`;
    const res = await onSave({ subject: subject.trim(), starts_on, ends_on, color, all_day: allDay ? 1 : 0 });
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
          <h3 className="font-black text-gray-800 text-base">New Event</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Event Title *</label>
            <input type="text" value={subject} autoFocus
              onChange={(e) => { setSubject(e.target.value); setError(""); }}
              placeholder="Meeting, deadline, etc..."
              className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-100 transition-colors ${
                error ? "border-red-300" : "border-gray-200 focus:border-green-400"
              }`} />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* All Day */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 rounded accent-green-500" />
            <span className="text-sm font-semibold text-gray-600">All Day</span>
          </label>

          {/* Start */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-green-400 bg-gray-50" />
            </div>
            {!allDay && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Start Time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-green-400 bg-gray-50" />
              </div>
            )}
          </div>

          {/* End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-green-400 bg-gray-50" />
            </div>
            {!allDay && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">End Time</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-green-400 bg-gray-50" />
              </div>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {EVENT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-all">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-gray-200 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
            {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : <><Plus size={15} />Add Event</>}
          </button>
        </div>
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.93) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  );
}

// ── Main Calendar Page ────────────────────────────────────────────────────────
export const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { events, loading, error, saving, fetchEvents, createEvent, deleteEvent } = useCalendar();

  const [view, setView] = useState<"Month" | "Week" | "Day" | "List">("Month");
  const [current, setCurrent] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // ── Navigation ──
  const go = (dir: number) => {
    const d = new Date(current);
    if (view === "Month") d.setMonth(d.getMonth() + dir);
    else if (view === "Week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrent(d);
  };

  const goToday = () => setCurrent(new Date());

  // ── Month grid ──
  const monthDays = useMemo(() => {
    const year = current.getFullYear();
    const month = current.getMonth();
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = Array(first).fill(null);
    for (let i = 1; i <= total; i++) days.push(new Date(year, month, i));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [current]);

  // ── Week days ──
  const weekDays = useMemo(() => {
    const d = new Date(current);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(d); dd.setDate(d.getDate() + i); return dd;
    });
  }, [current]);

  const todayStr = toDateStr(new Date());
  const title = view === "Month"
    ? `${MONTHS[current.getMonth()]} ${current.getFullYear()}`
    : view === "Week"
    ? `${weekDays[0].toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${weekDays[6].toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`
    : current.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});

  // ── Event tooltip ──
  const showTooltip = (e: React.MouseEvent, ev: CalendarEvent) => {
    setHoveredEvent(ev);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="space-y-4 animate-fade-in select-none">

      {/* Back */}
      <button type="button" onClick={() => navigate("/ess")}
        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 hover:text-green-700 text-gray-600 rounded-xl text-sm font-bold transition-all group">
        <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
        Back to Dashboard
      </button>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Add button */}
        <button type="button" onClick={() => { setSelectedDate(toDateStr(current)); setShowModal(true); }}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-green-100">
          <Plus size={16} /> Add New Event
        </button>

        {/* Prev / Next / Today */}
        <button type="button" onClick={() => go(-1)}
          className="p-2.5 rounded-xl border-2 border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-all">
          <ChevronLeft size={16} />
        </button>
        <button type="button" onClick={() => go(1)}
          className="p-2.5 rounded-xl border-2 border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-all">
          <ChevronRight size={16} />
        </button>
        <button type="button" onClick={goToday}
          className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:border-gray-300 hover:bg-gray-50 transition-all">
          Today
        </button>

        {/* Title */}
        <h2 className="text-lg font-black text-gray-800 flex-1 text-center">{title}</h2>

        {/* Refresh */}
        <button type="button" onClick={fetchEvents}
          className="p-2.5 rounded-xl border-2 border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-300 hover:bg-green-50 transition-all">
          <RefreshCw size={16} />
        </button>

        {/* View switcher */}
        <div className="flex rounded-xl border-2 border-gray-200 overflow-hidden">
          {(["Month","Week","Day","List"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={`px-3 py-2 text-xs font-bold transition-colors ${
                view === v ? "bg-green-500 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── MONTH VIEW ── */}
      {view === "Month" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map((d) => (
              <div key={d} className="py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest">{d}</div>
            ))}
          </div>
          {/* Cells */}
          <div className="grid grid-cols-7">
            {monthDays.map((day, i) => {
              const ds = day ? toDateStr(day) : "";
              const dayEvents = day ? events.filter((ev) => eventOnDay(ev, ds)) : [];
              const isToday = ds === todayStr;
              const isOtherMonth = day && day.getMonth() !== current.getMonth();
              return (
                <div key={i}
                  onClick={() => { if (day) { setSelectedDate(ds); setShowModal(true); } }}
                  className={`min-h-[100px] p-1.5 border-r border-b border-gray-50 cursor-pointer transition-colors ${
                    day ? "hover:bg-green-50/30" : "bg-gray-50/30"
                  } ${isOtherMonth ? "opacity-40" : ""}`}>
                  {day && (
                    <>
                      <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-black mb-1 ${
                        isToday ? "bg-green-500 text-white" : "text-gray-600"
                      }`}>
                        {day.getDate()}
                      </span>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div key={ev.name}
                            onMouseEnter={(e) => showTooltip(e, ev)}
                            onMouseLeave={() => setHoveredEvent(null)}
                            onClick={(e) => { e.stopPropagation(); }}
                            className="px-1.5 py-0.5 rounded-md text-white text-[10px] font-bold truncate cursor-default"
                            style={{ backgroundColor: ev.color || "#3B82F6" }}>
                            {formatTime(ev.starts_on)} {ev.subject}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-gray-400 font-semibold px-1">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {view === "Week" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {weekDays.map((d) => {
              const ds = toDateStr(d);
              const isToday = ds === todayStr;
              return (
                <div key={ds} className={`py-3 text-center border-r border-gray-50 last:border-r-0 ${isToday ? "bg-green-50" : ""}`}>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{DAYS[d.getDay()]}</div>
                  <div className={`text-lg font-black mt-0.5 ${isToday ? "text-green-600" : "text-gray-700"}`}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDays.map((d) => {
              const ds = toDateStr(d);
              const dayEvents = events.filter((ev) => eventOnDay(ev, ds));
              const isToday = ds === todayStr;
              return (
                <div key={ds}
                  onClick={() => { setSelectedDate(ds); setShowModal(true); }}
                  className={`p-2 border-r border-gray-50 last:border-r-0 cursor-pointer hover:bg-green-50/20 transition-colors ${isToday ? "bg-green-50/30" : ""}`}>
                  <div className="space-y-1">
                    {dayEvents.map((ev) => (
                      <div key={ev.name}
                        onMouseEnter={(e) => showTooltip(e, ev)}
                        onMouseLeave={() => setHoveredEvent(null)}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 rounded-lg text-white text-[11px] font-bold truncate cursor-default"
                        style={{ backgroundColor: ev.color || "#3B82F6" }}>
                        {formatTime(ev.starts_on)} {ev.subject}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DAY VIEW ── */}
      {view === "Day" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className={`px-6 py-4 border-b border-gray-100 ${toDateStr(current) === todayStr ? "bg-green-50" : ""}`}>
            <h3 className="font-black text-gray-800 text-lg">
              {current.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
            </h3>
          </div>
          <div className="p-4 space-y-2 min-h-[300px]">
            {events.filter((ev) => eventOnDay(ev, toDateStr(current))).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar size={32} className="text-gray-200 mb-3" />
                <p className="text-sm font-bold text-gray-400">No events today</p>
                <button type="button" onClick={() => { setSelectedDate(toDateStr(current)); setShowModal(true); }}
                  className="mt-3 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                  <Plus size={14} /> Add Event
                </button>
              </div>
            ) : (
              events.filter((ev) => eventOnDay(ev, toDateStr(current))).map((ev) => (
                <div key={ev.name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color || "#3B82F6" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{ev.subject}</p>
                    <p className="text-xs text-gray-400 font-medium">
                      {formatTime(ev.starts_on)} – {formatTime(ev.ends_on)}
                    </p>
                  </div>
                  <button type="button" onClick={() => deleteEvent(ev.name)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-200 hover:text-red-400 hover:bg-red-50 transition-all">
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === "List" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-4">
              {["Event", "Start", "End", "Type", ""].map((h) => (
                <div key={h} className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
          </div>
          {loading && Array.from({length:3}).map((_,i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-4 px-5 py-4 border-b border-gray-50 items-center">
              {Array.from({length:4}).map((_,j) => <div key={j} className="h-4 bg-gray-100 animate-pulse rounded-lg" />)}
              <div />
            </div>
          ))}
          {!loading && events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <List size={28} className="text-gray-200 mb-3" />
              <p className="text-sm font-bold text-gray-400 mb-3">No events</p>
              <button type="button" onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                <Plus size={14} /> Add Event
              </button>
            </div>
          )}
          {!loading && events.map((ev) => (
            <div key={ev.name}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-4 px-5 py-4 border-b border-gray-50 hover:bg-gray-50/60 transition-colors items-center group">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color || "#3B82F6" }} />
                <span className="text-sm font-semibold text-gray-800 truncate">{ev.subject}</span>
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {ev.starts_on
                  ? new Date(ev.starts_on).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
                  : "—"}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {ev.ends_on
                  ? new Date(ev.ends_on).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
                  : "—"}
              </div>
              <div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                  ev.event_type === "Public"
                    ? "bg-blue-50 text-blue-700 border-blue-100"
                    : "bg-gray-50 text-gray-600 border-gray-100"
                }`}>
                  {ev.event_type || "Public"}
                </span>
              </div>
              <div className="flex justify-center">
                <button type="button" onClick={() => deleteEvent(ev.name)}
                  className="p-1.5 rounded-lg text-gray-200 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event Tooltip */}
      {hoveredEvent && (
        <div className="fixed z-50 bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xl pointer-events-none max-w-[200px]"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 40 }}>
          <p className="font-black">{hoveredEvent.subject}</p>
          <p className="text-gray-300 mt-0.5">
            {hoveredEvent.starts_on?.slice(0,10)} – {hoveredEvent.ends_on?.slice(0,10)}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddEventModal
          onClose={() => setShowModal(false)}
          onSave={createEvent}
          saving={saving}
          defaultDate={selectedDate}
        />
      )}
    </div>
  );
};