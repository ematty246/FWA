import React, { useState } from 'react';
import SearchIcon from '@mui/icons-material/SearchRounded';
import CloseIcon from '@mui/icons-material/CloseRounded';

export const TopHeader = ({ onSearchProvider, currentUser }) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearchProvider) {
      onSearchProvider(searchValue.trim());
    }
  };

  const handleClear = () => {
    setSearchValue('');
    if (onSearchProvider) {
      onSearchProvider(''); // clears the search query in parent
    }
  };

  const handleHelpClick = () => {
    window.location.href = '/help';
  };

  if (!currentUser) return null;

  const displayName = currentUser.full_name || currentUser.name || '';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
    <header className="w-full h-16 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-4">
        {/* Search Input Field */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-56 sm:w-64 lg:w-72">
          <div className="relative flex-1">
            <SearchIcon sx={{ fontSize: 16, color: '#94A3B8' }} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search Provider ID"
              className="w-full pl-9 pr-8 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-hidden focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7] focus:bg-white transition-all shadow-2xs"
            />
            {searchValue && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] p-0.5 cursor-pointer"
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-sky-600/20 shrink-0"
          >
            Search
          </button>
        </form>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Help button moved here – near the avatar */}
        <button
          onClick={handleHelpClick}
          className="px-3.5 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-[#E2E8F0] shadow-sm"
        >
          Help?
        </button>

        <div className="text-right leading-tight">
          <p className="text-xs font-bold text-[#0F172A]">{displayName}</p>
          <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider mt-0.5">
            {currentUser.role}
          </p>
        </div>
        <div
          className="w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-xs ring-2 ring-sky-500/20"
          style={{ backgroundColor: currentUser.avatarColor || '#0284C7' }}
        >
          {initial}
        </div>
      </div>
    </header>
  );
};

export default TopHeader;