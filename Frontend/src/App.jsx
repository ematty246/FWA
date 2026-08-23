import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import Admin from './admin/Admin';
import AdminDashboard from './admin/AdminDashboard';
import AuthScreen from './auth/AuthScreen';

import AppLayout from './AppLayout';

import ExecutiveDashboard from './components/screens/ExecutiveDashboard';
import InvestigationQueue from './components/screens/InvestigationQueue';
import RiskProfileView from './components/screens/RiskProfile';
import PeerComparisonView from './components/screens/PeerComparisonView';
import SubmissionClaim from './components/screens/SubmissionClaim';
import InvestigationReportPage from './components/screens/InvestigationReportPage';
import HumanReview from './components/screens/HumanReview';

/* ============================================================
   PROVIDER ANALYTICS
   ============================================================ */

import ProviderAnalytics from './components/screens/ProviderAnalytics';

import HelpOverview from './components/HelpOverview';

import { ReportDataProvider } from './context/ReportDataContext';

import ChatbotWidget from './components/ChatbotWidget';


function App() {

  /* ==========================================================
     ADMIN LOGIN
     ========================================================== */

  const handleAdminLogin = () => {
    window.location.href = '/admin/dashboard';
  };


  /* ==========================================================
     LOGIN SUCCESS
     ========================================================== */

  const handleLoginSuccess = (user) => {
    console.log(
      'Login successful:',
      user
    );
  };


  return (

    <BrowserRouter>

      <ReportDataProvider>

        <Routes>

          {/* ==================================================
              AUTH
          ================================================== */}

          <Route
            path="/auth"
            element={
              <AuthScreen
                onLoginSuccess={
                  handleLoginSuccess
                }
              />
            }
          />


          {/* ==================================================
              ADMIN
          ================================================== */}

          <Route
            path="/admin"
            element={
              <Admin
                onLoginSuccess={
                  handleAdminLogin
                }
              />
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <AdminDashboard />
            }
          />


          {/* ==================================================
              PROVIDER CLAIM SUBMISSION

              Standalone route.
              NOT under AppLayout.
          ================================================== */}

          <Route
            path="/submit-claims"
            element={
              <SubmissionClaim />
            }
          />


          {/* ==================================================
              INVESTIGATOR APPLICATION LAYOUT
          ================================================== */}

          <Route
            element={
              <AppLayout />
            }
          >

            {/* ================================================
                DEFAULT
            ================================================= */}

            <Route
              path="/"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />


            {/* ================================================
                EXECUTIVE DASHBOARD
            ================================================= */}

            <Route
              path="/dashboard"
              element={
                <ExecutiveDashboard />
              }
            />


            {/* ================================================
                INVESTIGATION QUEUE
            ================================================= */}

            <Route
              path="/queue"
              element={
                <InvestigationQueue />
              }
            />


            {/* ================================================
                RISK PROFILE
            ================================================= */}

            <Route
              path="/risk_profile/:providerId"
              element={
                <RiskProfileView />
              }
            />

            <Route
              path="/risk_profile"
              element={
                <RiskProfileView />
              }
            />


            {/* ================================================
                PEER COMPARISON
            ================================================= */}

            <Route
              path="/peer_comparison"
              element={
                <PeerComparisonView />
              }
            />

            <Route
              path="/peer_comparison/:providerId"
              element={
                <PeerComparisonView />
              }
            />


            {/* ================================================
                INVESTIGATION REPORT
            ================================================= */}

            <Route
              path="/investigation_report"
              element={
                <InvestigationReportPage />
              }
            />


            {/* ================================================
                HUMAN REVIEW
            ================================================= */}

            <Route
              path="/human_review"
              element={
                <HumanReview />
              }
            />


            {/* ================================================
                PROVIDER ANALYTICS
            ================================================= */}

            <Route
              path="/analytics"
              element={
                <ProviderAnalytics />
              }
            />


            {/* ================================================
                HELP
            ================================================= */}

            <Route
              path="/help"
              element={
                <HelpOverview />
              }
            />

          </Route>


        </Routes>


        {/* ====================================================
            GLOBAL CHATBOT
        ==================================================== */}

        <ChatbotWidget />

      </ReportDataProvider>

    </BrowserRouter>
  );
}


export default App;