import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Eye, EyeOff, X, Mail, ArrowRight, CheckCircle2 } from "lucide-react";

type Props = {
  onLoggedIn?: () => void;
};

export const LoginPage: React.FC<Props> = ({ onLoggedIn }) => {
  const nav = useNavigate();
  const [usr, setUsr] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotErr, setForgotErr] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  const onSubmit = async () => {
    setErr(null);
    if (!usr.trim() || !pwd) { setErr("Please enter your email and password"); return; }
    setBusy(true);
    try {
      const res = await api.loginAsEmployee(usr.trim(), pwd);
      if (!res.ok) { setErr(res.error || "Login failed"); return; }
      const profile = await api.getProfile();
      if (!profile.ok) { setErr("Session could not be established. Please try again."); return; }
      onLoggedIn?.();
      nav("/", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const onForgotSubmit = async () => {
    setForgotErr(null);
    if (!forgotEmail.trim()) { setForgotErr("Please enter your email address."); return; }
    if (!/\S+@\S+\.\S+/.test(forgotEmail)) { setForgotErr("Please enter a valid email address."); return; }
    setForgotBusy(true);
    try {
      // Call ERPNext forgot password endpoint
      const res = await fetch("/api/method/frappe.core.doctype.user.user.reset_password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: forgotEmail.trim() }),
      });
      // ERPNext returns 200 even for unknown users (security)
      setForgotSuccess(true);
    } catch {
      setForgotErr("Network error. Please try again.");
    } finally {
      setForgotBusy(false);
    }
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotEmail("");
    setForgotErr(null);
    setForgotSuccess(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: "#0a0f0a", fontFamily: "'Georgia', 'Times New Roman', serif",
      overflow: "hidden", position: "relative",
    }}>
      {/* ── Animated background ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.04 }}>
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#4ade80" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div style={{
          position: "absolute", top: "-20%", left: "-10%", width: 600, height: 600,
          background: "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)",
          borderRadius: "50%", animation: "float1 8s ease-in-out infinite",
        }}/>
        <div style={{
          position: "absolute", bottom: "-20%", right: "-10%", width: 500, height: 500,
          background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
          borderRadius: "50%", animation: "float2 10s ease-in-out infinite",
        }}/>
        <div style={{
          position: "absolute", top: 0, left: "45%", width: 1, height: "100%",
          background: "linear-gradient(to bottom, transparent, rgba(74,222,128,0.15), transparent)",
        }}/>
      </div>

      {/* ── Left branding panel ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "60px",
        position: "relative", zIndex: 1,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateX(0)" : "translateX(-30px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{
            width: 56, height: 56,
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            borderRadius: 16, display: "flex", alignItems: "center",
            justifyContent: "center", marginBottom: 32,
            boxShadow: "0 0 40px rgba(34,197,94,0.3)",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{
            fontSize: 11, letterSpacing: "0.3em", color: "#4ade80",
            fontFamily: "'Courier New', monospace", marginBottom: 16, textTransform: "uppercase",
          }}>Learn School</div>
          <h1 style={{
            fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 400, color: "#f0fdf4",
            lineHeight: 1.1, margin: 0, letterSpacing: "-0.02em",
          }}>
            Employee<br/>
            <span style={{ color: "#4ade80" }}>Self Service</span><br/>
            Portal
          </h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { icon: "◈", text: "Attendance & Biometrics" },
            { icon: "◉", text: "Leave Management" },
            { icon: "◎", text: "Payroll & Salary Slips" },
          ].map((item) => (
            <div key={item.text} style={{
              display: "flex", alignItems: "center", gap: 12,
              color: "#86efac", fontSize: 14,
              fontFamily: "'Courier New', monospace",
            }}>
              <span style={{ color: "#4ade80", fontSize: 16 }}>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
        <div style={{
          marginTop: "auto", paddingTop: 48,
          fontSize: 11, color: "#166534",
          fontFamily: "'Courier New', monospace", letterSpacing: "0.2em",
        }}>
          INTERNATIONAL ACADEMY — EST. 2024
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div style={{
        width: "42%", minWidth: 380,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px", position: "relative", zIndex: 1,
      }}>
        <div style={{
          width: "100%", maxWidth: 420,
          background: "rgba(15, 23, 15, 0.8)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(74,222,128,0.15)",
          borderRadius: 24, padding: "48px 40px",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
          boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,222,128,0.05)",
        }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{
              fontSize: 11, letterSpacing: "0.25em", color: "#4ade80", marginBottom: 10,
              fontFamily: "'Courier New', monospace", textTransform: "uppercase",
            }}>Secure Access</div>
            <h2 style={{
              fontSize: 28, fontWeight: 400, color: "#f0fdf4", margin: 0, letterSpacing: "-0.01em",
            }}>Sign In</h2>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); void onSubmit(); }}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Email */}
            <div>
              <label style={{
                display: "block", fontSize: 10, letterSpacing: "0.2em", color: "#6b7280",
                fontFamily: "'Courier New', monospace", marginBottom: 8, textTransform: "uppercase",
              }}>Email Address</label>
              <div style={{
                border: `1px solid ${focused === "usr" ? "#4ade80" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 12, transition: "border-color 0.2s",
                background: "rgba(255,255,255,0.03)",
              }}>
                <input
                  value={usr}
                  onChange={(e) => setUsr(e.target.value)}
                  onFocus={() => setFocused("usr")}
                  onBlur={() => setFocused(null)}
                  placeholder="your.email@learnschool.com"
                  autoComplete="username"
                  style={{
                    width: "100%", padding: "14px 16px",
                    background: "transparent", border: "none",
                    color: "#f0fdf4", fontSize: 14, outline: "none",
                    boxSizing: "border-box", fontFamily: "'Courier New', monospace",
                  }}
                />
              </div>
            </div>

            {/* Password with show/hide */}
            <div>
              <label style={{
                display: "block", fontSize: 10, letterSpacing: "0.2em", color: "#6b7280",
                fontFamily: "'Courier New', monospace", marginBottom: 8, textTransform: "uppercase",
              }}>Password</label>
              <div style={{
                position: "relative",
                border: `1px solid ${focused === "pwd" ? "#4ade80" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 12, transition: "border-color 0.2s",
                background: "rgba(255,255,255,0.03)",
                display: "flex", alignItems: "center",
              }}>
                <input
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  onFocus={() => setFocused("pwd")}
                  onBlur={() => setFocused(null)}
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  style={{
                    flex: 1, padding: "14px 16px",
                    background: "transparent", border: "none",
                    color: "#f0fdf4", fontSize: 14, outline: "none",
                    boxSizing: "border-box", fontFamily: "'Courier New', monospace",
                    letterSpacing: showPwd ? "0.05em" : "0.15em",
                  }}
                />
                {/* Show/Hide toggle */}
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "0 14px", color: "#4b5563",
                    display: "flex", alignItems: "center",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#4ade80")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#4b5563")}
                  title={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Forgot password link */}
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 11, color: "#4ade80", opacity: 0.7,
                    fontFamily: "'Courier New', monospace",
                    letterSpacing: "0.1em", transition: "opacity 0.2s",
                    textDecoration: "underline", textUnderlineOffset: 3,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Error */}
            {err && (
              <div style={{
                padding: "12px 16px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 10, color: "#fca5a5", fontSize: 13,
                fontFamily: "'Courier New', monospace",
              }}>⚠ {err}</div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              style={{
                marginTop: 8, padding: "15px 24px",
                background: busy ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg, #22c55e, #16a34a)",
                border: "none", borderRadius: 12,
                color: "white", fontSize: 14,
                fontFamily: "'Courier New', monospace", letterSpacing: "0.1em",
                cursor: busy ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {busy ? (
                <>
                  <span style={{
                    width: 14, height: 14,
                    border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white",
                    borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block",
                  }}/>
                  Authenticating...
                </>
              ) : "Access Portal →"}
            </button>
          </form>

          <div style={{
            marginTop: 32, paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            textAlign: "center", fontSize: 11, color: "#374151",
            fontFamily: "'Courier New', monospace", letterSpacing: "0.1em",
          }}>
            PROTECTED BY FRAPPE ERPNEXT
          </div>
        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgot && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeForgot(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{
            width: "100%", maxWidth: 420,
            background: "#0f170f",
            border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: 20, padding: "36px 32px",
            position: "relative",
            boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
            animation: "slideUp 0.25s cubic-bezier(0.16,1,0.3,1)",
          }}>
            {/* Close */}
            <button
              type="button"
              onClick={closeForgot}
              style={{
                position: "absolute", top: 16, right: 16,
                background: "rgba(255,255,255,0.05)", border: "none",
                borderRadius: 8, width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#6b7280", transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#f87171"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#6b7280"; }}
            >
              <X size={15} />
            </button>

            {forgotSuccess ? (
              // ── Success state ──
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px",
                }}>
                  <CheckCircle2 size={26} color="#4ade80" />
                </div>
                <div style={{
                  fontSize: 11, letterSpacing: "0.2em", color: "#4ade80",
                  fontFamily: "'Courier New', monospace", marginBottom: 10,
                  textTransform: "uppercase",
                }}>Email Sent</div>
                <p style={{ color: "#86efac", fontSize: 14, margin: "0 0 8px", fontWeight: 500 }}>
                  Check your inbox
                </p>
                <p style={{ color: "#4b5563", fontSize: 12, fontFamily: "'Courier New', monospace", lineHeight: 1.6 }}>
                  If <span style={{ color: "#6b7280" }}>{forgotEmail}</span> is registered, a password reset link has been sent.
                </p>
                <button
                  type="button"
                  onClick={closeForgot}
                  style={{
                    marginTop: 24, width: "100%", padding: "13px",
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    border: "none", borderRadius: 10,
                    color: "white", fontSize: 13, cursor: "pointer",
                    fontFamily: "'Courier New', monospace", letterSpacing: "0.1em",
                  }}
                >
                  Back to Login
                </button>
              </div>
            ) : (
              // ── Form state ──
              <>
                <div style={{ marginBottom: 28 }}>
                  <div style={{
                    fontSize: 11, letterSpacing: "0.2em", color: "#4ade80",
                    fontFamily: "'Courier New', monospace", marginBottom: 8,
                    textTransform: "uppercase",
                  }}>Account Recovery</div>
                  <h3 style={{ fontSize: 22, fontWeight: 400, color: "#f0fdf4", margin: 0 }}>
                    Reset Password
                  </h3>
                  <p style={{
                    fontSize: 12, color: "#4b5563", marginTop: 8,
                    fontFamily: "'Courier New', monospace", lineHeight: 1.6,
                  }}>
                    Enter your registered email address and we'll send you a reset link.
                  </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: "block", fontSize: 10, letterSpacing: "0.2em",
                    color: "#6b7280", fontFamily: "'Courier New', monospace",
                    marginBottom: 8, textTransform: "uppercase",
                  }}>Email Address</label>
                  <div style={{
                    display: "flex", alignItems: "center",
                    border: `1px solid ${focused === "forgot" ? "#4ade80" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 12, background: "rgba(255,255,255,0.03)",
                    transition: "border-color 0.2s",
                  }}>
                    <span style={{ paddingLeft: 14, color: "#4b5563", display: "flex", alignItems: "center" }}>
                      <Mail size={14} />
                    </span>
                    <input
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      onFocus={() => setFocused("forgot")}
                      onBlur={() => setFocused(null)}
                      onKeyDown={(e) => e.key === "Enter" && onForgotSubmit()}
                      placeholder="your.email@learnschool.com"
                      autoComplete="email"
                      style={{
                        flex: 1, padding: "13px 14px",
                        background: "transparent", border: "none",
                        color: "#f0fdf4", fontSize: 13, outline: "none",
                        fontFamily: "'Courier New', monospace", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {forgotErr && (
                  <div style={{
                    padding: "10px 14px", marginBottom: 14,
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 10, color: "#fca5a5",
                    fontSize: 12, fontFamily: "'Courier New', monospace",
                  }}>⚠ {forgotErr}</div>
                )}

                <button
                  type="button"
                  onClick={onForgotSubmit}
                  disabled={forgotBusy}
                  style={{
                    width: "100%", padding: "14px",
                    background: forgotBusy ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg, #22c55e, #16a34a)",
                    border: "none", borderRadius: 12,
                    color: "white", fontSize: 13, cursor: forgotBusy ? "not-allowed" : "pointer",
                    fontFamily: "'Courier New', monospace", letterSpacing: "0.1em",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.2s",
                  }}
                >
                  {forgotBusy ? (
                    <>
                      <span style={{
                        width: 13, height: 13,
                        border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white",
                        borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block",
                      }}/>
                      Sending...
                    </>
                  ) : (
                    <> Send Reset Link <ArrowRight size={14} /> </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -40px) scale(1.05); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 30px) scale(0.95); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;