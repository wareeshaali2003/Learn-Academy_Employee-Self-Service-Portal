import React, { useMemo, useRef, useState } from "react";
import { useEmployee } from "../hooks/useEmployee";
import {
  Camera, Save, Mail, Phone, Briefcase,
  Calendar, Key, ShieldCheck, AlertTriangle, User, Building2, Hash,
} from "lucide-react";
import { getInitials } from "../utils/helpers";

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

// Info row used in both cards
const InfoRow: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="flex flex-col gap-1">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
      {icon && <span className="text-green-500 flex-shrink-0">{icon}</span>}
      <span>{value || "N/A"}</span>
    </div>
  </div>
);

export const ProfilePage: React.FC = () => {
  const { employee, loading, updateAvatar, changePassword, getVal } = useEmployee();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingAvatar,    setIsSavingAvatar]    = useState(false);
  const [isSavingPassword,  setIsSavingPassword]  = useState(false);
  const [pageError,  setPageError]  = useState<string | null>(null);
  const [pwError,    setPwError]    = useState<string | null>(null);
  const [pwSuccess,  setPwSuccess]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pwData, setPwData] = useState({ old: "", new: "", confirm: "" });

  const displayName = useMemo(() =>
    String((employee as any)?.employee_name || "").trim(), [employee]);

  const initials = useMemo(() => getInitials(displayName || "Employee"), [displayName]);

  const avatarUrl = useMemo(() =>
    (employee as any)?.avatar ||
    (employee as any)?.user_image ||
    (employee as any)?.image || "", [employee]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!isImageFile(file)) { setPageError("Please select a valid image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setPageError("Image too large (max 2MB)."); return; }
    setIsSavingAvatar(true);
    try {
      const res = await updateAvatar(file);
      if (!res.success) setPageError("Failed to update picture. Please try again.");
    } catch (err: any) {
      setPageError(err?.message || "Failed to update picture.");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    if (pwData.new !== pwData.confirm) { setPwError("New passwords do not match."); return; }
    if (pwData.new.length < 6)         { setPwError("Password must be at least 6 characters."); return; }
    setIsSavingPassword(true);
    try {
      const res = await changePassword(pwData.old, pwData.new);
      if (res.success) {
        setPwSuccess(true);
        setTimeout(() => { setIsChangingPassword(false); setPwData({ old: "", new: "", confirm: "" }); }, 1500);
      } else {
        setPwError("Failed to change password. Check your current password.");
      }
    } catch (err: any) {
      setPwError(err?.message || "Failed to change password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 h-64 text-gray-400 text-sm font-medium">
        <div className="w-5 h-5 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
        Loading profile…
      </div>
    );
  }

  // ── No employee ──
  if (!employee) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} className="text-amber-500" />
        </div>
        <p className="font-bold text-gray-800">Profile not available</p>
        <p className="text-sm text-gray-400 mt-2">Your session may have expired. Please refresh or login again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* ── Hero card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Green banner */}
        <div
          className="h-28 relative"
          style={{ background: "linear-gradient(135deg, #22c55e 0%, #166534 100%)" }}
        >
          {/* Decorative circles */}
          <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full" />
          <div className="absolute right-20 -bottom-4 w-16 h-16 bg-white/5 rounded-full" />
        </div>

        {/* Avatar — sits on banner edge */}
        <div className="px-7 -mt-10 mb-3">
          <div className="group relative inline-block">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg object-cover"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-2xl font-black text-white"
                style={{ background: "linear-gradient(135deg, #22c55e, #15803d)" }}
              >
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSavingAvatar}
              className="absolute inset-0 bg-black/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              title="Change profile picture"
            >
              {isSavingAvatar
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={18} />}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>

        {/* Name + button row */}
        <div className="px-7 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-gray-800 leading-tight">
                {displayName || getVal("name")}
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <Briefcase size={13} className="text-green-500" />
                <p className="text-sm font-medium text-gray-500">{getVal("designation") || "—"}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setPwError(null); setPwSuccess(false); setIsChangingPassword((v) => !v); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all self-start sm:self-auto ${
                isChangingPassword
                  ? "border-red-200 text-red-500 hover:bg-red-50"
                  : "border-green-400 text-green-600 hover:bg-green-500 hover:text-white"
              }`}
            >
              <Key size={14} />
              {isChangingPassword ? "Cancel" : "Change Password"}
            </button>
          </div>

          {/* Page error */}
          {pageError && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-500 font-medium bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">
              <AlertTriangle size={13} />
              {pageError}
            </div>
          )}
        </div>
      </div>

      {/* ── Password form or Info cards ── */}
      {isChangingPassword ? (

        // ── Password change panel ──
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <ShieldCheck size={17} className="text-green-600" />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">Update Account Password</p>
              <p className="text-[11px] text-gray-400">Choose a strong password</p>
            </div>
          </div>

          <div className="p-6">
            {pwError && (
              <div className="mb-4 flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl font-medium">
                <AlertTriangle size={13} /> {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="mb-4 flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-100 px-4 py-2.5 rounded-xl font-medium">
                ✓ Password changed successfully!
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: "Current Password", key: "old" },
                { label: "New Password",     key: "new" },
                { label: "Confirm New",      key: "confirm" },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                    {label}
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                    value={(pwData as any)[key]}
                    onChange={(e) => setPwData({ ...pwData, [key]: e.target.value })}
                  />
                </div>
              ))}

              <div className="md:col-span-3 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                >
                  {isSavingPassword
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Save size={15} />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>

      ) : (

        // ── Info cards ──
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Employee Information */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <User size={15} className="text-green-600" />
              </div>
              <p className="font-bold text-gray-800 text-sm uppercase tracking-wide">Employee Information</p>
            </div>
            <div className="p-5 space-y-5">
              <InfoRow label="Full Name"      value={getVal("employee_name")} />
              <InfoRow label="Contact Email"  value={getVal("personal_email")} icon={<Mail size={13} />} />
              <InfoRow label="Mobile No"      value={getVal("cell_number")}   icon={<Phone size={13} />} />
            </div>
          </div>

          {/* Academy Record */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Building2 size={15} className="text-green-600" />
              </div>
              <p className="font-bold text-gray-800 text-sm uppercase tracking-wide">Academy Record</p>
            </div>
            <div className="p-5 space-y-5">
              <InfoRow label="Employee ID"  value={getVal("name")}            icon={<Hash size={13} />} />
              <InfoRow label="Department"   value={getVal("department")}      icon={<Building2 size={13} />} />
              <InfoRow label="Joining Date" value={getVal("date_of_joining")} icon={<Calendar size={13} />} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};