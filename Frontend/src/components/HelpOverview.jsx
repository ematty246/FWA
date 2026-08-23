import React, { useEffect, useRef, useState } from 'react';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded';
import FindInPageRoundedIcon from '@mui/icons-material/FindInPageRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import PersonSearchRoundedIcon from '@mui/icons-material/PersonSearchRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { AppLogo } from './AppLogo';

const OVERVIEW_CARDS = [
  {
    step: '01',
    title: 'Identify Risk',
    hint: 'Detect potentially suspicious provider and claim patterns.',
    Icon: ShieldRoundedIcon,
  },
  {
    step: '02',
    title: 'Assess FWA',
    hint: 'Evaluate Fraud, Waste and Abuse risk at provider level.',
    Icon: MonitorHeartRoundedIcon,
  },
  {
    step: '03',
    title: 'Build Evidence',
    hint: 'Combine risk profiles, claims, anomalies and peer comparisons.',
    Icon: FindInPageRoundedIcon,
  },
  {
    step: '04',
    title: 'Assist Investigators',
    hint: 'Generate investigation summaries and answer case-related questions.',
    Icon: AutoAwesomeRoundedIcon,
  },
  {
    step: '05',
    title: 'Support Decisions',
    hint: 'Help investigators review evidence and record the final action.',
    Icon: GavelRoundedIcon,
  },
];

const CAPABILITY_CARDS = [
  {
    title: 'Provider Risk Profile',
    hint: 'Fraud, Waste & Abuse risk with key contributing factors.',
    Icon: ShieldRoundedIcon,
  },
  {
    title: 'Claim Intelligence',
    hint: 'Historical claims, suspicious claims and anomaly explanations.',
    Icon: ReceiptLongRoundedIcon,
  },
  {
    title: 'Peer Comparison',
    hint: 'Compare provider billing patterns against relevant peers.',
    Icon: GroupsRoundedIcon,
  },
  {
    title: 'Investigation Assistant',
    hint: 'AI summaries, case Q&A and investigation reports.',
    Icon: SmartToyRoundedIcon,
  },
];

const WORKFLOW_STEPS = [
  'Priority Queue',
  'Provider Profile',
  'Claims & Anomalies',
  'Peer Comparison',
  'AI Summary',
  'Human Decision',
];

// ------------------------------------------------------------------
// useRevealOnScroll
// Adds a class once a ref'd section enters the viewport, so each
// section's stagger animation plays the first time it's seen rather
// than all firing at once on mount.
// ------------------------------------------------------------------
const useRevealOnScroll = () => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
};

export const HelpOverview = ({ onClose }) => {
  const [heroVisible, setHeroVisible] = useState(false);
  const [overviewRef, overviewVisible] = useRevealOnScroll();
  const [capabilityRef, capabilityVisible] = useRevealOnScroll();
  const [workflowRef, workflowVisible] = useRevealOnScroll();
  const [footerRef, footerVisible] = useRevealOnScroll();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#edf6ff] overflow-y-auto font-sans antialiased text-[#0A2A4A]">
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className={`fixed top-5 right-5 sm:top-6 sm:right-6 z-50 w-10 h-10 rounded-full bg-white border border-[#D5E7F3] shadow-[0_4px_16px_rgba(18,55,88,0.12)] flex items-center justify-center text-[#627D98] hover:text-[#0A2A4A] hover:border-[#93C5FD] hover:rotate-90 transition-all duration-300 cursor-pointer ${
          heroVisible ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Close help"
      >
        <CloseRoundedIcon sx={{ fontSize: 18 }} />
      </button>

      <div className="max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
        {/* HEADER */}
        <div
          className="text-center space-y-5 mb-16 sm:mb-20"
          style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
          }}
        >
          <div
            className="flex items-center justify-center gap-3"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'scale(1)' : 'scale(0.8)',
              transition: 'opacity 0.6s ease-out 0.1s, transform 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s',
            }}
          >
            <AppLogo size="lg" className="shadow-lg shadow-sky-600/30" />
          </div>
          <div
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.6s ease-out 0.22s, transform 0.6s ease-out 0.22s',
            }}
          >
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#102f4d] uppercase leading-none flex items-center justify-center gap-2">
              CLAIMGUARD <span className="text-[#0284C7]">AI</span>
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#087aca] tracking-widest uppercase mt-3">
              Payment Integrity Investigation Platform
            </p>
          </div>
          <p
            className="text-sm sm:text-base text-[#506b83] leading-relaxed max-w-xl mx-auto font-medium"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.6s ease-out 0.34s, transform 0.6s ease-out 0.34s',
            }}
          >
            From suspicious billing signals to explainable investigation decisions.
          </p>
          <div
            className="h-1 bg-[#0284C7] rounded-full mx-auto"
            style={{
              width: heroVisible ? '3.5rem' : '0rem',
              transition: 'width 0.7s ease-out 0.46s',
            }}
          />
        </div>

        {/* PLATFORM OVERVIEW */}
        <section ref={overviewRef} className="mb-16 sm:mb-20">
          <div
            className="text-center mb-10"
            style={{
              opacity: overviewVisible ? 1 : 0,
              transform: overviewVisible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
            }}
          >
            <span className="text-[11px] font-extrabold text-[#087aca] uppercase tracking-widest block">
              How It Works
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#102f4d] tracking-tight mt-1">
              Platform Overview
            </h2>
          </div>

          <div className="relative">
            {/* Connecting line (desktop only) — draws in left to right */}
            <div
              className="hidden lg:block absolute top-11 left-[8%] h-0.5 bg-gradient-to-r from-[#bcdcf2] via-[#93c5fd] to-[#bcdcf2] origin-left"
              style={{
                width: overviewVisible ? '84%' : '0%',
                transition: 'width 1.1s cubic-bezier(0.65,0,0.35,1) 0.3s',
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-4 relative">
              {OVERVIEW_CARDS.map(({ step, title, hint, Icon }, idx) => (
                <div
                  key={step}
                  className="group relative bg-white rounded-2xl border border-[#d8e7f2] p-5 flex flex-col items-center text-center gap-3 shadow-[0_4px_16px_rgba(18,55,88,0.06)] hover:shadow-[0_10px_28px_rgba(18,55,88,0.14)] hover:-translate-y-1 hover:border-[#93C5FD] transition-shadow duration-300"
                  style={{
                    opacity: overviewVisible ? 1 : 0,
                    transform: overviewVisible
                      ? 'translateY(0) scale(1)'
                      : 'translateY(24px) scale(0.94)',
                    transition: `opacity 0.55s cubic-bezier(0.34,1.2,0.64,1) ${0.25 + idx * 0.14}s, transform 0.55s cubic-bezier(0.34,1.2,0.64,1) ${0.25 + idx * 0.14}s, box-shadow 0.3s ease-out, border-color 0.3s ease-out`,
                  }}
                >
                  <span className="absolute top-3 right-4 text-[10px] font-black text-[#c9dff0] tracking-widest">
                    {step}
                  </span>
                  <div
                    className="w-14 h-14 rounded-full bg-[#d9efff] text-[#087aca] flex items-center justify-center shrink-0 group-hover:bg-[#0284C7] group-hover:text-white transition-colors duration-300 relative z-10"
                    style={{
                      transform: overviewVisible ? 'rotate(0deg) scale(1)' : 'rotate(-40deg) scale(0.6)',
                      transition: `transform 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.35 + idx * 0.14}s`,
                    }}
                  >
                    <Icon sx={{ fontSize: 24 }} />
                  </div>
                  <h3 className="text-sm font-bold text-[#173957]">{title}</h3>
                  <p className="text-[11px] text-[#5b7185] leading-snug">{hint}</p>

                  {idx < OVERVIEW_CARDS.length - 1 && (
                    <ArrowForwardRoundedIcon
                      sx={{ fontSize: 16 }}
                      className="hidden lg:block absolute top-9 -right-3 text-[#93c5fd] z-20"
                      style={{
                        opacity: overviewVisible ? 1 : 0,
                        transition: `opacity 0.4s ease-out ${0.55 + idx * 0.14}s`,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CORE CAPABILITIES */}
        <section ref={capabilityRef} className="mb-16 sm:mb-20">
          <div
            className="text-center mb-10"
            style={{
              opacity: capabilityVisible ? 1 : 0,
              transform: capabilityVisible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
            }}
          >
            <span className="text-[11px] font-extrabold text-[#087aca] uppercase tracking-widest block">
              What You Get
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#102f4d] tracking-tight mt-1">
              Core Platform Capabilities
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CAPABILITY_CARDS.map(({ title, hint, Icon }, idx) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-[#d8e7f2] p-6 flex flex-col gap-3 shadow-[0_4px_16px_rgba(18,55,88,0.06)] hover:shadow-[0_10px_28px_rgba(18,55,88,0.14)] hover:-translate-y-1 hover:border-[#93C5FD] transition-shadow duration-300"
                style={{
                  opacity: capabilityVisible ? 1 : 0,
                  transform: capabilityVisible ? 'translateY(0)' : 'translateY(22px)',
                  transition: `opacity 0.55s cubic-bezier(0.34,1.2,0.64,1) ${0.15 + idx * 0.12}s, transform 0.55s cubic-bezier(0.34,1.2,0.64,1) ${0.15 + idx * 0.12}s, box-shadow 0.3s ease-out, border-color 0.3s ease-out`,
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl bg-[#d9efff] text-[#087aca] flex items-center justify-center shrink-0"
                  style={{
                    transform: capabilityVisible ? 'scale(1)' : 'scale(0.5)',
                    transition: `transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.25 + idx * 0.12}s`,
                  }}
                >
                  <Icon sx={{ fontSize: 20 }} />
                </div>
                <h3 className="text-sm font-bold text-[#173957]">{title}</h3>
                <p className="text-xs text-[#5b7185] leading-relaxed">{hint}</p>
              </div>
            ))}
          </div>
        </section>

        {/* INVESTIGATION WORKFLOW */}
        <section ref={workflowRef}>
          <div
            className="text-center mb-10"
            style={{
              opacity: workflowVisible ? 1 : 0,
              transform: workflowVisible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
            }}
          >
            <span className="text-[11px] font-extrabold text-[#087aca] uppercase tracking-widest block">
              End To End
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#102f4d] tracking-tight mt-1">
              Investigation Workflow
            </h2>
          </div>

          <div
            className="bg-white rounded-2xl border border-[#d8e7f2] p-6 sm:p-8 shadow-[0_4px_16px_rgba(18,55,88,0.06)]"
            style={{
              opacity: workflowVisible ? 1 : 0,
              transform: workflowVisible ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.98)',
              transition: 'opacity 0.6s ease-out 0.15s, transform 0.6s ease-out 0.15s',
            }}
          >
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-4">
              {WORKFLOW_STEPS.map((step, idx) => (
                <React.Fragment key={step}>
                  <div
                    className="flex items-center gap-2 bg-[#F4F9FD] border border-[#D5E7F3] rounded-full px-4 py-2 hover:bg-[#d9efff] hover:border-[#93C5FD] transition-colors duration-300"
                    style={{
                      opacity: workflowVisible ? 1 : 0,
                      transform: workflowVisible ? 'translateX(0)' : 'translateX(-14px)',
                      transition: `opacity 0.45s ease-out ${0.3 + idx * 0.1}s, transform 0.45s ease-out ${0.3 + idx * 0.1}s`,
                    }}
                  >
                    <span className="w-5 h-5 rounded-full bg-[#0284C7] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#173957] whitespace-nowrap">{step}</span>
                  </div>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <ArrowForwardRoundedIcon
                      sx={{ fontSize: 16 }}
                      className="text-[#93c5fd] shrink-0"
                      style={{
                        opacity: workflowVisible ? 1 : 0,
                        transition: `opacity 0.35s ease-out ${0.38 + idx * 0.1}s`,
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            <p
              className="text-center text-xs sm:text-sm text-[#5b7185] font-medium mt-7 max-w-lg mx-auto leading-relaxed"
              style={{
                opacity: workflowVisible ? 1 : 0,
                transition: `opacity 0.5s ease-out ${0.3 + WORKFLOW_STEPS.length * 0.1 + 0.1}s`,
              }}
            >
              Investigators move from prioritized cases to evidence-backed decisions.
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <div
          ref={footerRef}
          className="pt-14 mt-4 border-t border-[#cbdfea] flex items-center justify-center gap-2 text-[11px] font-bold text-[#60788c]"
          style={{
            opacity: footerVisible ? 1 : 0,
            transform: footerVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
          }}
        >
          <ShieldRoundedIcon sx={{ fontSize: 14, color: '#69859a' }} />
          <span>Secure&nbsp; • &nbsp;Reliable&nbsp; • &nbsp;Built for Investigators</span>
        </div>
      </div>
    </div>
  );
};

export default HelpOverview;