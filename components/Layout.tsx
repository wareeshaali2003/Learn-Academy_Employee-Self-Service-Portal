// components/Layout.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, Bell, GraduationCap, ChevronDown, Shield } from "lucide-react";

import { useEmployee } from "../hooks/useEmployee";
import { api } from "../services/api";
import { sidebarConfig, getIcon, isNavItemVisible, NavItem } from "../config/layout.config";
import { NotificationDropdown } from "./NotificationDropdown";
import { getInitials } from "../utils/helpers";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LayoutProps {
  children: React.ReactNode;
}

// ─── Sidebar link ────────────────────────────────────────────────────────────

const SidebarLink: React.FC<{
  to: string;
  iconName: string;
  label: string;
  active: boolean;
  onClick?: () => void;
  isChild?: boolean;
}> = ({ to, iconName, label, active, onClick, isChild = false }) => {
  const Icon = getIcon(iconName);
  return (
    <li>
      <Link
        to={to}
        onClick={onClick}
        className={`flex items-center rounded-xl font-medium transition-all ${
          isChild ? "px-4 py-2 mx-4 text-sm" : "px-5 py-3 mx-2"
        } ${
          active
            ? "bg-white text-green-700 font-bold shadow-sm"
            : "text-green-100 hover:bg-green-600 hover:text-white"
        }`}
      >
        <span className={`mr-2.5 ${active ? "text-green-600" : "text-green-300"}`}>
          <Icon size={isChild ? 16 : 20} />
        </span>
        {label}
      </Link>
    </li>
  );
};

// ─── Sidebar item with children ───────────────────────────────────────────────

const SidebarItemWithChildren: React.FC<{
  item: NavItem;
  location: ReturnType<typeof useLocation>;
  employeeRole: string;
  onLinkClick: () => void;
}> = ({ item, location, onLinkClick }) => {
  const Icon = getIcon(item.iconName);

  const isChildActive = item.children?.some((c) => location.pathname === c.to) ?? false;
  const isParentActive = location.pathname === item.to;

  const [open, setOpen] = useState(isChildActive || isParentActive);

  useEffect(() => {
    if (isChildActive || isParentActive) setOpen(true);
  }, [isChildActive, isParentActive]);

  return (
    <li>
      <div
        className={`flex items-center mx-2 rounded-xl transition-all ${
          isParentActive || isChildActive
            ? "bg-white/10 text-white"
            : "text-green-100 hover:bg-green-600 hover:text-white"
        }`}
      >
        <Link
          to={item.to}
          onClick={() => {
            onLinkClick();
            setOpen(true);
          }}
          className="flex items-center flex-1 px-3 py-3 font-medium min-w-0"
        >
          <span
            className={`mr-3 flex-shrink-0 ${
              isParentActive || isChildActive ? "text-green-200" : "text-green-300"
            }`}
          >
            <Icon size={20} />
          </span>
          <span className="truncate">{item.label}</span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="p-3 flex-shrink-0 text-green-300 hover:text-white transition-colors"
          aria-label="Toggle submenu"
        >
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && (
        <ul className="mt-0.5 mb-1 space-y-0.5">
          {item.children?.map((child) => (
            <SidebarLink
              key={child.to}
              to={child.to}
              label={child.label}
              iconName={child.iconName}
              active={location.pathname === child.to}
              onClick={onLinkClick}
              isChild
            />
          ))}
        </ul>
      )}
    </li>
  );
};

// ─── Admin sidebar badge ──────────────────────────────────────────────────────

const AdminModeBanner: React.FC = () => (
  <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg bg-green-600/30 border border-green-400/30 px-3 py-2">
    <Shield size={14} className="text-green-300 flex-shrink-0" />
    <span className="text-green-200 text-xs font-semibold tracking-wide">Admin view</span>
  </div>
);

// ─── Layout ───────────────────────────────────────────────────────────────────

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Unread notification count (default 0 => no badge)
  const [unreadCount, setUnreadCount] = useState(0);

  const { employee, loading } = useEmployee();

  // isAdminView purely from designation — no manual switcher
  const isAdminView =
    (employee?.designation || "").toLowerCase() === "administrator";

  // Fetch real notification count from API (replace with actual endpoint)
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        // Example: const res = await api.get("/notifications/unread");
        // setUnreadCount(res.data.count);
        // For now, keep it 0 (no badge) – replace with real data later
        setUnreadCount(0);
      } catch (error) {
        console.error("Failed to fetch notification count", error);
        setUnreadCount(0);
      }
    };
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!notifRef.current?.contains(e.target as Node)) setNotificationsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isNotificationsOpen]);

  const employeeName =
    employee?.employee_name ||
    employee?.full_name ||
    employee?.first_name ||
    (loading ? "Loading..." : "Guest");

  const employeeRole     = employee?.designation || "";
  const employeeAvatar   = employee?.avatar || employee?.user_image || employee?.image || "";
  const employeeInitials = getInitials(employeeName);

  // Frappe Roles list (e.g. custom "Academics" role) — used alongside designation
  const employeeRoles: string[] = useMemo(() => {
    const raw = (employee as any)?.roles;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((r: any) =>
        typeof r === "string" ? r : r?.role ?? ""
      ).filter(Boolean);
    }
    return [];
  }, [employee]);

  const visibleSidebarItems = useMemo(() => {
    return sidebarConfig.filter(
      (item) =>
        !item.dashboardOnly &&
        isNavItemVisible(item, employeeRole, employeeRoles)
    );
  }, [employeeRole, employeeRoles]);

  const pageTitle = useMemo(() => {
    for (const item of sidebarConfig) {
      if (item.to === location.pathname) return item.label;
      if (item.children) {
        const child = item.children.find((c) => c.to === location.pathname);
        if (child) return child.label;
      }
    }
    return "Portal";
  }, [location.pathname]);

  const toggleSidebar = () => setSidebarOpen((v) => !v);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      window.location.href = "/login?redirect-to=/ess";
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-green-700 text-white
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="bg-green-800 px-6 py-5 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="text-white" size={22} />
            </div>
            <div>
              <div className="font-black text-white text-base leading-tight">Learn School</div>
              <div className="text-green-300 text-xs font-medium">International Academy</div>
            </div>
          </div>

          {/* Admin banner — only for Administrator */}
          {isAdminView && (
            <div className="pt-3 px-1">
              <AdminModeBanner />
            </div>
          )}

          {/* Nav */}
          <nav className="mt-3 flex-grow overflow-y-auto">
            <ul className="space-y-0.5 py-2">
              {visibleSidebarItems.map((item) =>
                item.children && item.children.length > 0 ? (
                  <SidebarItemWithChildren
                    key={item.to}
                    item={item}
                    location={location}
                    employeeRole={employeeRole}
                    onLinkClick={() => setSidebarOpen(false)}
                  />
                ) : (
                  <SidebarLink
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    iconName={item.iconName}
                    active={location.pathname === item.to}
                    onClick={() => setSidebarOpen(false)}
                  />
                )
              )}
            </ul>
          </nav>

          {/* Footer */}
          <div className="bg-green-800 px-4 py-3 mt-auto">
            <p className="text-[10px] text-green-400 uppercase tracking-widest font-bold mb-2">
              Session
            </p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {employeeAvatar ? (
                  <img
                    src={employeeAvatar}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover border-2 border-green-500 flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-green-600 border-2 border-green-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                    {employeeInitials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{employeeName}</p>
                  {employeeRole && (
                    <p className="text-green-300 text-[10px] uppercase tracking-wide truncate">
                      {employeeRole}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-green-300 hover:text-white transition-colors p-1.5 hover:bg-green-700 rounded-lg flex-shrink-0"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* ──── UNIFORM HEADER ──── */}
        <header
          className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-4 md:px-8 py-3 flex items-center justify-between"
          style={{
            boxShadow: "0 1px 0 0 rgba(15,23,42,0.06), 0 8px 20px -12px rgba(15,23,42,0.10)",
            borderBottom: "1px solid transparent",
            borderImage: "linear-gradient(90deg, #16a34a, #0d9488, transparent 70%) 1",
          }}
        >
          <div className="flex items-center min-w-0">
            <button
              type="button"
              className="p-2 mr-3 md:hidden text-gray-600 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
              onClick={toggleSidebar}
            >
              <Menu size={22} />
            </button>

            <span
              className="hidden sm:block w-1 h-6 rounded-full mr-3 flex-shrink-0"
              style={{ background: "linear-gradient(180deg, #16a34a, #0d9488)" }}
            />
            <h1 className="text-base md:text-xl font-bold text-gray-800 truncate tracking-tight">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen((v) => !v)}
                className={`p-2 rounded-xl transition-all duration-200 relative ${
                  isNotificationsOpen
                    ? "bg-green-50 text-green-700 ring-2 ring-green-200 scale-105"
                    : "text-gray-500 hover:text-green-700 hover:bg-green-50 hover:scale-105"
                }`}
                aria-label="Notifications"
              >
                <Bell size={21} />

                {/* Show badge only if there are unread notifications */}
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[10px] items-center justify-center font-bold border-2 border-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </span>
                )}
              </button>
              <NotificationDropdown
                isOpen={isNotificationsOpen}
                onClose={() => setNotificationsOpen(false)}
              />
            </div>

            <div className="h-8 w-px bg-gray-200 hidden sm:block" />

            {/* Profile button */}
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex items-center space-x-3 group px-2 py-1.5 rounded-xl hover:bg-green-50 transition-all duration-200"
              title="Profile"
            >
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-gray-800 group-hover:text-green-700 transition-colors line-clamp-1">
                  {employeeName}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">
                  {employeeRole}
                </div>
              </div>
              {employeeAvatar ? (
                <img
                  src={employeeAvatar}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-green-400 shadow-sm object-cover group-hover:scale-105 group-hover:shadow-md transition-all duration-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 text-white border-2 border-green-400 flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all duration-200">
                  {employeeInitials}
                </div>
              )}
            </button>
          </div>
        </header>

        {/* Admin context bar — only for Administrator */}
        {isAdminView && (
          <div className="bg-green-50 border-b border-green-100 px-4 md:px-8 py-2 flex items-center gap-2">
            <Shield size={14} className="text-green-500" />
            <span className="text-xs text-green-600 font-semibold">
              Admin view — you can see all employees and their data
            </span>
          </div>
        )}

        <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};