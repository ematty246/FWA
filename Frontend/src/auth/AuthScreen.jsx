import React, { useState, useEffect, useRef } from 'react';
import ShieldIcon from '../components/SecurityRoundedIcon';
import LockIcon from '@mui/icons-material/LockRounded';
import MailIcon from '@mui/icons-material/MailRounded';
import PersonIcon from '@mui/icons-material/PersonRounded';
import PhoneIcon from '@mui/icons-material/PhoneRounded';
import LocationOnIcon from '@mui/icons-material/LocationOnRounded';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TimelineIcon from '@mui/icons-material/TimelineRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorIcon from '@mui/icons-material/ErrorOutlineRounded';
import { AppLogo } from '../components/AppLogo';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import {
  registerInvestigator,
  loginInvestigator,
  loginProvider,
  registerProvider,
} from '../services/investigatorService';
import { useNavigate } from 'react-router-dom';

// ================================================================
// Helper: safely extract error message from any response
// ================================================================
const getErrorMessage = (err) => {
  if (!err) return 'An unexpected error occurred.';
  const detail = err.response?.data?.detail;
  if (!detail) return err.message || 'An unexpected error occurred.';
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'object') {
    if (detail.message) return detail.message;
    if (detail.error) return detail.error;
    try {
      return JSON.stringify(detail);
    } catch {
      return 'An error occurred.';
    }
  }
  return 'An unexpected error occurred.';
};

export const AuthScreen = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState('PROVIDER');
  const [authMode, setAuthMode] = useState('LOGIN');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // ----- Investigator fields -----
  const [invLoginEmail, setInvLoginEmail] = useState('');
  const [invLoginPassword, setInvLoginPassword] = useState('');
  const [invRegName, setInvRegName] = useState('');
  const [invRegEmail, setInvRegEmail] = useState('');
  const [invRegPhone, setInvRegPhone] = useState('');

  // ----- Provider fields -----
  const [prvLoginId, setPrvLoginId] = useState('');
  const [prvLoginPassword, setPrvLoginPassword] = useState('');
  const [prvRegId, setPrvRegId] = useState('');
  const [prvRegName, setPrvRegName] = useState('');
  const [prvRegEmail, setPrvRegEmail] = useState('');
  const [prvRegAddress, setPrvRegAddress] = useState('');

  const OPENCAGE_API_KEY = import.meta.env.VITE_OPENCAGE_API_KEY;

  // ----- Address autocomplete states -----
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressRef = useRef(null);
  const suggestionTimeout = useRef(null);

  // ----- Geocode fetch with debounce -----
  useEffect(() => {
    if (suggestionTimeout.current) {
      clearTimeout(suggestionTimeout.current);
    }

    const trimmed = prvRegAddress.trim();
    if (trimmed.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    suggestionTimeout.current = setTimeout(async () => {
      if (!OPENCAGE_API_KEY) {
        console.error('OpenCage API key is missing.');
        setAddressLoading(false);
        return;
      }
      setAddressLoading(true);
      try {
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
          trimmed
        )}&key=${OPENCAGE_API_KEY}&no_annotations=1&limit=5`;
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.results) {
          setAddressSuggestions(data.results);
          setShowSuggestions(true);
        } else {
          setAddressSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.error('OpenCage error:', err);
        setAddressSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setAddressLoading(false);
      }
    }, 500);

    return () => {
      if (suggestionTimeout.current) {
        clearTimeout(suggestionTimeout.current);
      }
    };
  }, [prvRegAddress]);

  // ----- Close suggestions on click outside -----
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addressRef.current && !addressRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ----- Handle suggestion click -----
  const handleSuggestionClick = (suggestion) => {
    setPrvRegAddress(suggestion.formatted);
    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  // ----- Investigator handlers -----
const handleInvestigatorLogin = async (e) => {
  e.preventDefault();
  setErrorMsg(null);
  setSuccessMsg(null);

  const email = invLoginEmail.trim();
  const password = invLoginPassword.trim();

  if (!email) {
    setErrorMsg('Please enter your email address.');
    return;
  }
  if (!password || password.length < 6) {
    setErrorMsg('Password must be at least 6 characters.');
    return;
  }

  setIsLoading(true);
  try {
   const data = await loginInvestigator(
  email,
  password
);

// ========================================================
// SAVE AUTH TOKENS
// ========================================================

localStorage.setItem(
  'access_token',
  data.access_token
);

localStorage.setItem(
  'refresh_token',
  data.refresh_token
);

// ========================================================
// SAVE USER
// ========================================================

localStorage.setItem(
  'user',
  JSON.stringify({
    ...data.user,
    role: 'INVESTIGATOR',
  })
);

// Keep full name if your application uses it
localStorage.setItem(
  'full_name',
  data.user.full_name ||
  data.user.name ||
  ''
);
    setSuccessMsg('Login Successful');
    if (onLoginSuccess) onLoginSuccess(data.user);
    setTimeout(() => {
      navigate('/dashboard');
    }, 500);
  } catch (err) {
    console.error('Investigator login failed:', err);
    setErrorMsg(getErrorMessage(err));
  } finally {
    setIsLoading(false);
  }
};
  const handleInvestigatorRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const name = invRegName.trim();
    const email = invRegEmail.trim();
    const phone = invRegPhone.trim();

    if (!name) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await registerInvestigator(name, email, phone);
      setSuccessMsg(data.message || 'Registration submitted! Awaiting admin approval.');
      setInvRegName('');
      setInvRegEmail('');
      setInvRegPhone('');
      setTimeout(() => {
        setAuthMode('LOGIN');
        setSuccessMsg(null);
      }, 3000);
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // ----- Provider handlers -----
  const handleProviderLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const providerId = prvLoginId.trim();
    const password = prvLoginPassword.trim();

    if (!providerId) {
      setErrorMsg('Please enter your Provider ID.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
    const data =
  await loginProvider(
    providerId,
    password
  );


// ========================================================
// SAVE ACCESS TOKEN
// ========================================================

localStorage.setItem(
  'access_token',
  data.access_token
);


// ========================================================
// SAVE REFRESH TOKEN
// ========================================================

localStorage.setItem(
  'refresh_token',
  data.refresh_token
);


// ========================================================
// SAVE USER
// ========================================================

localStorage.setItem(
  'user',
  JSON.stringify({
    ...data.user,
    role: 'PROVIDER',
  })
);
      setSuccessMsg('Login Successful');
      if (onLoginSuccess) onLoginSuccess(data.user);
      setTimeout(() => {
        window.location.href = '/submit-claims';
      }, 500);
    } catch (err) {
      console.error('Provider login failed:', err);
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const id = prvRegId.trim();
    const name = prvRegName.trim();
    const email = prvRegEmail.trim();
    const address = prvRegAddress.trim();

    if (!id) {
      setErrorMsg('Please enter a Provider ID.');
      return;
    }
    if (!name) {
      setErrorMsg('Please enter the provider name.');
      return;
    }
    if (!email) {
      setErrorMsg('Please enter the official email.');
      return;
    }
    if (!address) {
      setErrorMsg('Please enter the hospital address.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await registerProvider(id, name, email, address);
      setSuccessMsg(data.message || 'Provider registration submitted! Awaiting admin approval.');
      setPrvRegId('');
      setPrvRegName('');
      setPrvRegEmail('');
      setPrvRegAddress('');
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setTimeout(() => {
        setAuthMode('LOGIN');
        setSuccessMsg(null);
      }, 3000);
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#edf6ff] flex items-center justify-center p-0 sm:p-4 lg:p-6 font-sans antialiased text-[#0A2A4A]">
      <div className="w-full max-w-[1280px] min-h-[700px] bg-white rounded-none sm:rounded-[26px] shadow-[0_12px_40px_rgba(18,55,88,0.16)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-[#d8e7f2]">
        {/* LEFT PANEL */}
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
                  CLAIMS FRAUD INVESTIGATION SYSTEM
                </p>
              </div>
            </div>
            <div className="space-y-1 pt-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.08] text-[#102f4d]">
                Smarter investigations.
              </h2>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.08] text-[#087aca]">
                Stronger healthcare.
              </h2>
              <div className="w-14 h-1 bg-[#1688d2] mt-5 rounded-full" />
            </div>
            <p className="text-sm text-[#506b83] leading-relaxed max-w-lg font-normal">
              ClaimGuard AI helps investigators prioritize high-risk providers, review evidence with AI assistance, and make confident, data-driven decisions.
            </p>
            <div className="grid grid-cols-1 gap-4 pt-2">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-[#d9efff] text-[#087aca] flex items-center justify-center shrink-0">
                  <TimelineIcon sx={{ fontSize: 18 }} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#173957]">Prioritize High-Risk Providers</h4>
                  <p className="text-xs text-[#5b7185] mt-0.5 leading-snug max-w-sm">
                    AI models continuously analyze claims and provider behavior to surface the riskiest providers first.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-[#d9efff] text-[#087aca] flex items-center justify-center shrink-0">
                  <TimelineIcon sx={{ fontSize: 18 }} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#173957]">Investigate with Confidence</h4>
                  <p className="text-xs text-[#5b7185] mt-0.5 leading-snug max-w-sm">
                    Access historical claims, anomalies, peer comparison, and risk explanations in one place.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-[#d9efff] text-[#087aca] flex items-center justify-center shrink-0">
                  <ShieldIcon sx={{ fontSize: 18 }} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#173957]">Make Impactful Decisions</h4>
                  <p className="text-xs text-[#5b7185] mt-0.5 leading-snug max-w-sm">
                    Document your investigation and decisions to support compliance, accountability, and better outcomes.
                  </p>
                </div>
              </div>
            </div>

            {/* Illustration */}
            <div className="w-full flex justify-center -mt-10">
              <div className="w-40 h-24 sm:w-48 sm:h-28">
                <svg viewBox="0 0 240 170" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <ellipse cx="140" cy="122" rx="95" ry="42" fill="#d9ecfa" opacity="0.55" />
                  <rect x="70" y="28" width="112" height="80" rx="8" fill="#ffffff" stroke="#bcdcf2" strokeWidth="2.5" />
                  <rect x="70" y="28" width="112" height="20" rx="8" fill="#eaf4fa" stroke="#bcdcf2" strokeWidth="2.5" />
                  <circle cx="79" cy="38" r="2.2" fill="#93c5fd" />
                  <circle cx="87" cy="38" r="2.2" fill="#93c5fd" />
                  <circle cx="99" cy="80" r="16" fill="#eaf4fa" stroke="#bcdcf2" strokeWidth="1.5" />
                  <path d="M99 64 A16 16 0 0 1 113 88 L99 80 Z" fill="#0284C7" />
                  <path d="M99 80 L113 88 A16 16 0 0 1 87 90 Z" fill="#38bdf8" />
                  <rect x="127" y="86" width="8" height="16" rx="1.5" fill="#93c5fd" />
                  <rect x="139" y="76" width="8" height="26" rx="1.5" fill="#38bdf8" />
                  <rect x="151" y="66" width="8" height="36" rx="1.5" fill="#0284C7" />
                  <rect x="163" y="80" width="8" height="22" rx="1.5" fill="#93c5fd" />
                  <rect x="119" y="108" width="14" height="10" fill="#bcdcf2" />
                  <rect x="101" y="118" width="50" height="6" rx="3" fill="#bcdcf2" />
                  <circle cx="45" cy="112" r="18" fill="#ffffff" stroke="#0284C7" strokeWidth="4.5" />
                  <line x1="58" y1="125" x2="72" y2="139" stroke="#0284C7" strokeWidth="5" strokeLinecap="round" />
                  <rect x="184" y="86" width="42" height="58" rx="6" fill="#ffffff" stroke="#bcdcf2" strokeWidth="2.5" />
                  <g stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M191 98 l3 3 l6 -6" fill="none" />
                    <path d="M191 113 l3 3 l6 -6" fill="none" />
                    <path d="M191 128 l3 3 l6 -6" fill="none" />
                  </g>
                  <line x1="205" y1="99" x2="218" y2="99" stroke="#d9ecfa" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="205" y1="114" x2="218" y2="114" stroke="#d9ecfa" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="205" y1="129" x2="218" y2="129" stroke="#d9ecfa" strokeWidth="2.5" strokeLinecap="round" />
                  <g stroke="#93c5fd" strokeWidth="2" strokeLinecap="round">
                    <path d="M26 68 v8 M22 72 h8" />
                    <path d="M202 58 v7 M198.5 61.5 h7" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
          <div className="pt-3 mt-1 border-t border-[#cbdfea] flex items-center gap-2 text-[11px] font-bold text-[#60788c] relative z-10">
            <LockIcon sx={{ fontSize: 15, color: '#69859a' }} />
            <span>Secure&nbsp; • &nbsp;Reliable&nbsp; • &nbsp;Built for Investigators</span>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-6 bg-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
          <div className="w-full max-w-[475px] mx-auto space-y-6">
            <div className="flex items-center">
              <AppLogo size="lg" className="shadow-sm" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-[#087aca] uppercase tracking-widest block">
                AUTHENTICATED ACCESS
              </span>
              <h3 className="text-4xl font-extrabold text-[#102f4d] tracking-tight mt-1">
                {authMode === 'LOGIN' ? 'Welcome back' : 'Create your account'}
              </h3>
              <p className="text-xs text-[#627D98] mt-1.5 font-medium">
                {authMode === 'LOGIN'
                  ? 'Choose your role and sign in to ClaimGuard AI.'
                  : 'Complete your registration details to access the system.'}
              </p>
            </div>

            {/* Role Switcher */}
            <div className="p-1.5 bg-[#F4F9FD] rounded-2xl flex items-center gap-1.5 border border-[#D5E7F3]">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('PROVIDER');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                  selectedRole === 'PROVIDER'
                    ? 'bg-white text-[#0284C7] shadow-xs border border-[#D5E7F3]'
                    : 'text-[#627D98] hover:text-[#0A2A4A]'
                }`}
              >
                Provider
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('INVESTIGATOR');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                  selectedRole === 'INVESTIGATOR'
                    ? 'bg-white text-[#0284C7] shadow-xs border border-[#D5E7F3]'
                    : 'text-[#627D98] hover:text-[#0A2A4A]'
                }`}
              >
                Investigator
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex items-center justify-between border-b border-[#EAF4FA] pb-2">
              <div className="flex gap-5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('LOGIN');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`text-xs font-bold pb-2 transition relative cursor-pointer ${
                    authMode === 'LOGIN'
                      ? 'text-[#0284C7]'
                      : 'text-[#627D98] hover:text-[#0A2A4A]'
                  }`}
                >
                  Sign In
                  {authMode === 'LOGIN' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0284C7] rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('REGISTER');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`text-xs font-bold pb-2 transition relative cursor-pointer ${
                    authMode === 'REGISTER'
                      ? 'text-[#0284C7]'
                      : 'text-[#627D98] hover:text-[#0A2A4A]'
                  }`}
                >
                  Register
                  {authMode === 'REGISTER' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0284C7] rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Error / Success Messages */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700">
                <ErrorIcon sx={{ fontSize: 16, color: '#f43f5e' }} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <CheckCircleIcon sx={{ fontSize: 16, color: '#059669' }} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ---------- PROVIDER LOGIN ---------- */}
            {selectedRole === 'PROVIDER' && authMode === 'LOGIN' && (
              <form onSubmit={handleProviderLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0A2A4A] mb-1.5">
                    Provider ID
                  </label>
                  <div className="relative">
                    <PersonIcon sx={{ fontSize: 16, color: '#627D98' }} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={prvLoginId}
                      onChange={(e) => setPrvLoginId(e.target.value)}
                      placeholder="e.g. PRV51001"
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
                      value={prvLoginPassword}
                      onChange={(e) => setPrvLoginPassword(e.target.value)}
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
            )}

            {/* ---------- PROVIDER REGISTER ---------- */}
            {selectedRole === 'PROVIDER' && authMode === 'REGISTER' && (
              <form onSubmit={handleProviderRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0A2A4A] mb-1">
                    Provider ID
                  </label>
                  <div className="relative">
                    <PersonIcon sx={{ fontSize: 16, color: '#627D98' }} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={prvRegId}
                      onChange={(e) => setPrvRegId(e.target.value)}
                      placeholder="e.g. PRV51001"
                      className="w-full bg-[#F4F9FD] border border-[#D5E7F3] text-[#0A2A4A] font-medium text-xs rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7] transition"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0A2A4A] mb-1">
                    Provider Name
                  </label>
                  <div className="relative">
                    <PersonIcon sx={{ fontSize: 16, color: '#627D98' }} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={prvRegName}
                      onChange={(e) => setPrvRegName(e.target.value)}
                      placeholder="e.g. Mercy General Hospital"
                      className="w-full bg-[#F4F9FD] border border-[#D5E7F3] text-[#0A2A4A] font-medium text-xs rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7] transition"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0A2A4A] mb-1">
                    Official Email
                  </label>
                  <div className="relative">
                    <MailIcon sx={{ fontSize: 16, color: '#627D98' }} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={prvRegEmail}
                      onChange={(e) => setPrvRegEmail(e.target.value)}
                      placeholder="billing@mercyhealth.org"
                      className="w-full bg-[#F4F9FD] border border-[#D5E7F3] text-[#0A2A4A] font-medium text-xs rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7] transition"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <div ref={addressRef}>
                  <label className="block text-xs font-bold text-[#0A2A4A] mb-1">
                    Hospital Address
                  </label>
                  <div className="relative">
                    <div className="relative">
                      <LocationOnIcon sx={{ fontSize: 16, color: '#627D98' }} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={prvRegAddress}
                        onChange={(e) => setPrvRegAddress(e.target.value)}
                        placeholder="Start typing an address..."
                        className="w-full bg-[#F4F9FD] border border-[#D5E7F3] text-[#0A2A4A] font-medium text-xs rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7] transition"
                        disabled={isLoading}
                        required
                      />
                      {addressLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <span className="text-xs text-[#627D98]">...</span>
                        </div>
                      )}
                    </div>

                    {showSuggestions && addressSuggestions.length > 0 && (
                      <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#D5E7F3] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {addressSuggestions.map((suggestion, index) => (
                          <li
                            key={index}
                            className="px-4 py-2 text-xs text-[#0A2A4A] hover:bg-[#EAF4FA] cursor-pointer border-b last:border-0 transition"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion.formatted}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-6 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shadow-sky-600/30 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Submitting...' : (
                    <>
                      <span>Register Provider</span>
                      <ArrowForwardIcon sx={{ fontSize: 16 }} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ---------- INVESTIGATOR LOGIN ---------- */}
            {selectedRole === 'INVESTIGATOR' && authMode === 'LOGIN' && (
              <form onSubmit={handleInvestigatorLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0A2A4A] mb-1.5">
                    Work Email
                  </label>
                  <div className="relative">
                    <MailIcon sx={{ fontSize: 16, color: '#627D98' }} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={invLoginEmail}
                      onChange={(e) => setInvLoginEmail(e.target.value)}
                      placeholder="sarah.jenkins@claimguard.ai"
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
                      value={invLoginPassword}
                      onChange={(e) => setInvLoginPassword(e.target.value)}
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
            )}

            {/* ---------- INVESTIGATOR REGISTER ---------- */}
            {selectedRole === 'INVESTIGATOR' && authMode === 'REGISTER' && (
              <form onSubmit={handleInvestigatorRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0A2A4A] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <PersonIcon sx={{ fontSize: 16, color: '#627D98' }} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={invRegName}
                      onChange={(e) => setInvRegName(e.target.value)}
                      placeholder="Sarah Jenkins, CFE"
                      className="w-full bg-[#F4F9FD] border border-[#D5E7F3] text-[#0A2A4A] font-medium text-xs rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7] transition"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A2A4A] mb-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <MailIcon sx={{ fontSize: 16, color: '#627D98' }} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={invRegEmail}
                      onChange={(e) => setInvRegEmail(e.target.value)}
                      placeholder="s.jenkins@healthplan.com"
                      className="w-full bg-[#F4F9FD] border border-[#D5E7F3] text-[#0A2A4A] font-medium text-xs rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7] transition"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A2A4A] mb-1">
                    Phone Number <span className="font-normal text-[#627D98]">(optional)</span>
                  </label>
                  <div className="claimguard-phone-input-wrapper relative">
                    <PhoneInput
                      country={'us'}
                      value={invRegPhone}
                      onChange={(value) => setInvRegPhone(value)}
                      containerClass="claimguard-phone-input w-full"
                      inputClass="claimguard-phone-input-field"
                      buttonClass="claimguard-phone-input-button"
                      dropdownClass="claimguard-phone-input-dropdown"
                      enableSearch={true}
                      searchPlaceholder="Search country..."
                      disabled={isLoading}
                    />
                    <SearchRoundedIcon
                      sx={{ fontSize: 18, color: '#627D98' }}
                      className="claimguard-phone-search-icon"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-6 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shadow-sky-600/30 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Submitting...' : (
                    <>
                      <span>Register Investigator</span>
                      <ArrowForwardIcon sx={{ fontSize: 16 }} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer Switch */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs font-bold text-[#0284C7] hover:underline cursor-pointer"
              >
                {authMode === 'LOGIN'
                  ? "Don't have an account? Create one"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;