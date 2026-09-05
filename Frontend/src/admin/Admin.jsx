import React, { useState } from 'react';
import LockIcon from '@mui/icons-material/LockRounded';
import MailIcon from '@mui/icons-material/MailRounded';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import ErrorIcon from '@mui/icons-material/ErrorOutlineRounded';
import { AppLogo } from '../components/AppLogo';
import { loginAdmin, setAuthData } from '../services/authservice';

export const Admin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');          // empty by default
  const [password, setPassword] = useState('');    // empty by default
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setErrorMsg('Please enter your admin email.');
      return;
    }
    if (!trimmedPassword || trimmedPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await loginAdmin(trimmedEmail, trimmedPassword);
      setAuthData(
  data.access_token,
  data.refresh_token,
  data.user
);
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      // Extract error message from response
      let message = 'Invalid email or password.';
      if (err.response && err.response.data) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          // Pydantic validation errors: array of { loc, msg, type }
          message = detail.map((e) => e.msg).join('; ');
        } else if (typeof detail === 'string') {
          message = detail;
        } else if (typeof detail === 'object' && detail.message) {
          message = detail.message;
        }
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#edf6ff] flex items-center justify-center p-0 sm:p-4 lg:p-6 font-sans antialiased text-[#0A2A4A]">
      <div className="w-full max-w-[1280px] min-h-[700px] bg-white rounded-none sm:rounded-[26px] shadow-[0_12px_40px_rgba(18,55,88,0.16)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-[#d8e7f2]">

        {/* Left Panel – Branding */}
        <div className="lg:col-span-6 bg-gradient-to-br from-[#f4faff] via-[#edf7ff] to-[#e1f1ff] p-8 sm:p-12 lg:p-16 text-[#102f4d] flex flex-col justify-between relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(#b8d9f2 1px, transparent 1px)`,
              backgroundSize: '26px 26px',
            }}
          />
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/80 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#bfddf5]/60 blur-3xl pointer-events-none" />

          <div className="space-y-8 relative z-10">
            <div className="flex items-center gap-3.5">
              <AppLogo size="lg" className="shadow-lg shadow-sky-600/30" />
              <div>
                <h1 className="text-xl font-black tracking-tight text-[#102f4d] uppercase leading-none flex items-center gap-1.5">
                  CLAIMGUARD <span className="text-[#38BDF8]">AI</span>
                </h1>
                <p className="text-[10px] font-bold text-[#93C5FD] tracking-widest uppercase mt-1">
                  ADMIN CONTROL CENTER
                </p>
              </div>
            </div>

            <div className="space-y-1 pt-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.08] text-[#102f4d]">
                Secure admin access.
              </h2>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.08] text-[#087aca]">
                Complete oversight.
              </h2>
              <div className="w-14 h-1 bg-[#1688d2] mt-5 rounded-full" />
            </div>

            <p className="text-sm text-[#506b83] leading-relaxed max-w-lg font-normal">
              Manage providers, investigators, and system settings from a single, secure dashboard.
            </p>

            <div className="grid grid-cols-1 gap-4 pt-2">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-[#d9efff] text-[#087aca] flex items-center justify-center shrink-0">
                  <LockIcon sx={{ fontSize: 18 }} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#173957]">Role‑Based Access</h4>
                  <p className="text-xs text-[#5b7185] mt-0.5 leading-snug max-w-sm">
                    Granular permissions for administrators, investigators, and providers.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-[#d9efff] text-[#087aca] flex items-center justify-center shrink-0">
                  <LockIcon sx={{ fontSize: 18 }} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#173957]">Audit & Compliance</h4>
                  <p className="text-xs text-[#5b7185] mt-0.5 leading-snug max-w-sm">
                    Full visibility into user activity and system changes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-8 border-t border-[#cbdfea] flex items-center gap-2 text-[11px] font-bold text-[#60788c] relative z-10">
            <LockIcon sx={{ fontSize: 15, color: '#69859a' }} />
            <span>Secure&nbsp; • &nbsp;Reliable&nbsp; • &nbsp;Admin‑only</span>
          </div>
        </div>

        {/* Right Panel – Login Form */}
        <div className="lg:col-span-6 bg-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
          <div className="w-full max-w-[475px] mx-auto space-y-6">
            <div>
              <span className="text-[11px] font-extrabold text-[#087aca] uppercase tracking-widest block">
                ADMIN AUTHENTICATION
              </span>
              <h3 className="text-4xl font-extrabold text-[#102f4d] tracking-tight mt-1">
                Administrator Sign In
              </h3>
              <p className="text-xs text-[#627D98] mt-1.5 font-medium">
                Enter your credentials to access the admin dashboard.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700">
                <ErrorIcon sx={{ fontSize: 16, color: '#f43f5e' }} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0A2A4A] mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <MailIcon sx={{ fontSize: 16, color: '#627D98' }} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@claimguard.ai"
                    className="w-full bg-[#F4F9FD] border border-[#D5E7F3] text-[#0A2A4A] font-medium text-xs rounded-xl pl-10 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7] transition"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0A2A4A] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <LockIcon sx={{ fontSize: 16, color: '#627D98' }} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#F4F9FD] border border-[#D5E7F3] text-[#0A2A4A] font-medium text-xs rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7] transition"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#627D98] hover:text-[#0A2A4A] cursor-pointer"
                    disabled={isLoading}
                  >
                    {showPassword ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-6 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shadow-sky-600/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : (
                  <>
                    <span>Sign In</span>
                    <ArrowForwardIcon sx={{ fontSize: 16 }} />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2 text-[11px] text-[#627D98]">
              Protected by JWT authentication.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;