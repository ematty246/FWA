import React, { useState, useEffect } from 'react';
import {
  Outlet,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import NavigationSidebar from './components/NavigationSidebar';
import TopHeader from './components/TopHeader';

/* ============================================================
   SIDEBAR SCREEN → ROUTE MAPPING
   ============================================================ */

const SCREEN_ROUTES = {
  dashboard: '/dashboard',
  queue: '/queue',
  risk_profile: '/risk_profile',
  peer_comparison: '/peer_comparison',
  investigation_report: '/investigation_report',
  human_review: '/human_review',
  analytics: '/analytics',
};

/* ============================================================
   READ STORED USER
   ============================================================ */

const readStoredUser = () => {
  try {
    const stored = localStorage.getItem('user');

    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/* ============================================================
   APP LAYOUT
   ============================================================ */

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(
    readStoredUser
  );

  const [searchQuery, setSearchQuery] = useState('');

  /* ==========================================================
     AUTHENTICATION CHECK
     ========================================================== */

  useEffect(() => {
    const user = readStoredUser();

    setCurrentUser(user);

    if (!user || user.role !== 'INVESTIGATOR') {
      navigate('/auth', {
        replace: true,
      });
    }
  }, [navigate]);

  /* ==========================================================
     ACTIVE SIDEBAR ITEM
     ========================================================== */

  const activeScreen =
    Object.keys(SCREEN_ROUTES).find((key) => {
      const route = SCREEN_ROUTES[key];

      if (
        key === 'risk_profile' ||
        key === 'peer_comparison'
      ) {
        return location.pathname.startsWith(route);
      }

      return location.pathname === route;
    }) || 'dashboard';

  /* ==========================================================
     SIDEBAR NAVIGATION
     ========================================================== */

  const handleSelectScreen = (screenId) => {
    console.log('Sidebar clicked:', screenId);

    /* --------------------------------------------------------
       PEER COMPARISON
       -------------------------------------------------------- */

    if (screenId === 'peer_comparison') {
      const storedProviderId =
        localStorage.getItem(
          'selectedProviderIdForPeerComparison'
        );

      if (storedProviderId) {
        navigate(
          `/peer_comparison/${storedProviderId}`
        );
        return;
      }

      const pathSegments =
        location.pathname.split('/');

      if (
        pathSegments[1] === 'risk_profile' &&
        pathSegments[2]
      ) {
        navigate(
          `/peer_comparison/${pathSegments[2]}`
        );
        return;
      }

      navigate('/peer_comparison');
      return;
    }

    /* --------------------------------------------------------
       HUMAN REVIEW
       -------------------------------------------------------- */

    if (screenId === 'human_review') {
      navigate('/human_review');
      return;
    }

    /* --------------------------------------------------------
       OTHER ROUTES
       -------------------------------------------------------- */

    const path = SCREEN_ROUTES[screenId];

    if (path) {
      navigate(path);
    } else {
      console.warn(
        `No route configured for sidebar screen: ${screenId}`
      );
    }
  };

  /* ==========================================================
     SIGN OUT
     ========================================================== */

  const handleSignOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');

    navigate('/auth', {
      replace: true,
    });
  };

  /* ==========================================================
     SEARCH PROVIDER
     ========================================================== */

  const handleSearchProvider = (query) => {
    setSearchQuery(query);
  };

  /* ==========================================================
     AUTH GUARD
     ========================================================== */

  if (
    !currentUser ||
    currentUser.role !== 'INVESTIGATOR'
  ) {
    return null;
  }

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div className="flex min-h-screen bg-[#EAF4FA]">

      <NavigationSidebar
        activeScreen={activeScreen}
        onSelectScreen={handleSelectScreen}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex flex-col min-w-0">

        <TopHeader
          currentUser={currentUser}
          onSearchProvider={handleSearchProvider}
          onSignOut={handleSignOut}
        />

        <main className="flex-1 overflow-y-auto">
          <Outlet
            context={{
              currentUser,
              searchQuery,
            }}
          />
        </main>

      </div>

    </div>
  );
};

export default AppLayout;