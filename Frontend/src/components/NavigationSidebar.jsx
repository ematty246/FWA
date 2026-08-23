import React from 'react';
import DashboardIcon from '@mui/icons-material/DashboardRounded';
import DescriptionIcon from '@mui/icons-material/DescriptionRounded';
import AssessmentIcon from '@mui/icons-material/AssessmentRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import LogoutIcon from '@mui/icons-material/LogoutRounded';
import healthImage from '../assets/images/health.png';
import { PersonStanding, PersonStandingIcon } from 'lucide-react';

// Reads role from localStorage as the source of truth, falling back to the
// currentUser prop if localStorage hasn't been populated yet.
const getEffectiveRole = (currentUser) => {
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed?.role) return parsed.role;
    }
  } catch (e) {
    // ignore malformed storage, fall through to prop
  }

  const storedRole = localStorage.getItem('role');
  if (storedRole) return storedRole;

  return currentUser?.role;
};

export const NavigationSidebar = ({
  activeScreen,
  onSelectScreen,
  openInvestigationsCount = 24,
  unreviewedQueueCount = 8,
  currentUser,
  selectedProviderId = 'PRV54297',
  onSelectProvider,
  onSignOut,
}) => {
  const effectiveRole = getEffectiveRole(currentUser);

  // All menu items require INVESTIGATOR role
  const allMenuItems = [
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      icon: <DashboardIcon sx={{ fontSize: 18 }} />,
      requiredRole: 'INVESTIGATOR',
    },
    {
      id: 'queue',
      label: 'Investigation Queue',
      icon: <DescriptionIcon sx={{ fontSize: 18 }} />,
      requiredRole: 'INVESTIGATOR',
    },
    {
      id: 'risk_profile',
      label: 'Risk Profile',
      icon: <AssessmentIcon sx={{ fontSize: 18 }} />,
      requiredRole: 'INVESTIGATOR',
    },
    {
      id: 'peer_comparison',
      label: 'Peer Comparison',
      icon: <AssessmentIcon sx={{ fontSize: 18 }} />,
      requiredRole: 'INVESTIGATOR',
    },
    {
      id: 'investigation_report',
      label: 'Investigation Report',
      icon: <ArticleRoundedIcon sx={{ fontSize: 18 }} />,
      requiredRole: 'INVESTIGATOR',
    },
    {
      id: 'human_review',
      label: 'Human Review',
      icon: <PersonStandingIcon sx={{ fontSize: 18 }} />,
      requiredRole: 'INVESTIGATOR',
    },
       {
  id: 'analytics',
  label: 'Analytics',
  icon: <AssessmentIcon sx={{ fontSize: 18 }} />,
  requiredRole: 'INVESTIGATOR',
},
  ];

  // Filter: only show items if role matches
  const menuItems = allMenuItems.filter((item) => {
    return effectiveRole === item.requiredRole;
  });

  // If we truly have no user info anywhere, show nothing
  if (!currentUser && !effectiveRole) return null;

  // If resolved role is not INVESTIGATOR, show a placeholder with no navigation
  if (effectiveRole !== 'INVESTIGATOR') {
    return (
      <aside className="w-68 bg-white/95 backdrop-blur-md border-r border-[#E2E8F0] text-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 shadow-xs select-none">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header (always visible) */}
          <div className="p-5 border-b border-[#F1F5F9] flex items-center gap-3 bg-linear-to-b from-white to-slate-50/50">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <img src={healthImage} alt="health" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="font-extrabold text-[#0F172A] tracking-tight text-[15px] leading-tight flex items-center gap-1.5">
                ClaimGuard <span className="text-[#0284C7] bg-sky-50 px-1.5 py-0.5 rounded-md text-xs font-black">AI</span>
              </h1>
              <p className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider mt-0.5">
                Healthcare FWA Intelligence
              </p>
            </div>
          </div>

          {/* No access message */}
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-sm text-[#64748B] text-center">
              You do not have access to investigator tools.
            </p>
          </div>

          {/* Sign Out at bottom */}
          <div className="p-3.5 border-t border-[#F1F5F9] bg-[#F8FAFC]/80">
            <div className="p-2.5 bg-white rounded-xl border border-[#E2E8F0] flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className="w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                  style={{ backgroundColor: currentUser?.avatarColor || '#0284C7' }}
                >
                  {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-[#0F172A] truncate leading-tight">
                    {currentUser?.full_name || currentUser?.name || 'User'}
                  </p>
                  <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider truncate mt-0.5">
                    {effectiveRole || 'UNKNOWN'}
                  </p>
                </div>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="p-1 hover:bg-rose-50 text-[#EF4444] rounded-lg transition cursor-pointer shrink-0"
                  title="Sign Out"
                >
                  <LogoutIcon sx={{ fontSize: 16 }} />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // ----- Investigator view: full navigation -----
  const displayName = currentUser?.full_name || currentUser?.name || '';
  const firstName = displayName ? displayName.split(' ')[0] : '';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
    <aside className="w-68 bg-white/95 backdrop-blur-md border-r border-[#E2E8F0] text-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 shadow-xs select-none">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#F1F5F9] flex items-center gap-3 bg-linear-to-b from-white to-slate-50/50">
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <img src={healthImage} alt="health" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="font-extrabold text-[#0F172A] tracking-tight text-[15px] leading-tight flex items-center gap-1.5">
              ClaimGuard <span className="text-[#0284C7] bg-sky-50 px-1.5 py-0.5 rounded-md text-xs font-black">AI</span>
            </h1>
            <p className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider mt-0.5">
              Healthcare FWA Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="p-3.5 space-y-1.5 overflow-y-auto flex-1 mt-1.5">
          <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#94A3B8]">
            Workspaces
          </div>
          {menuItems.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectScreen(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#0284C7] text-white shadow-md shadow-sky-600/25 font-bold'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-[#0284C7]'}>
                    {item.icon}
                  </span>
                  <span className="truncate tracking-tight">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-full font-bold text-white shadow-xs ${
                      isActive ? 'bg-white/25 text-white' : item.badgeColor || 'bg-sky-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Card & Sign Out */}
        <div className="p-3.5 border-t border-[#F1F5F9] bg-[#F8FAFC]/80">
          <div className="p-2.5 bg-white rounded-xl border border-[#E2E8F0] flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className="w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                style={{ backgroundColor: currentUser?.avatarColor || '#0284C7' }}
              >
                {initial}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-[#0F172A] truncate leading-tight">{firstName}</p>
                <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider truncate mt-0.5">
                  {effectiveRole}
                </p>
              </div>
            </div>

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="p-1 hover:bg-rose-50 text-[#EF4444] rounded-lg transition cursor-pointer shrink-0"
                title="Sign Out"
              >
                <LogoutIcon sx={{ fontSize: 16 }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default NavigationSidebar;