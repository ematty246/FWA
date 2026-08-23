import React, { useEffect, useRef, useState, useCallback } from 'react';
import './ChatbotWidget.css';
import chatbotGif from '../assets/chatbot.gif';
import { useReportData } from '../context/ReportDataContext';
import {
  lookupEntitiesInQuestion,
  lookupAggregatesInQuestion,
  buildDbLookupText,
  buildAggregateLookupText,
} from '../services/chatbotlookupService';

const PUTER_SCRIPT_SRC = 'https://js.puter.com/v2/';
const VISION_MODEL = 'gpt-5.6-luna';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

// ---------------------------------------------------------------
// Load Puter.js SDK once
// ---------------------------------------------------------------
let puterLoadPromise = null;

function loadPuter() {
  if (typeof window !== 'undefined' && window.puter) {
    return Promise.resolve(window.puter);
  }

  if (!puterLoadPromise) {
    puterLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(
        `script[src="${PUTER_SCRIPT_SRC}"]`
      );

      const onLoad = () => {
        if (window.puter) {
          resolve(window.puter);
        } else {
          reject(
            new Error('Puter.js loaded but window.puter is unavailable.')
          );
        }
      };

      if (existing) {
        existing.addEventListener('load', onLoad, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');

      script.src = PUTER_SCRIPT_SRC;
      script.async = true;

      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener(
        'error',
        () => reject(new Error('Failed to load Puter.js.')),
        { once: true }
      );

      document.head.appendChild(script);
    });
  }

  return puterLoadPromise;
}

// ---------------------------------------------------------------
// Extract plain text from Puter AI response
// ---------------------------------------------------------------
function extractAnswerText(response) {
  if (!response) return '';

  if (typeof response === 'string') {
    return response;
  }

  if (
    typeof response.toString === 'function' &&
    response.toString !== Object.prototype.toString
  ) {
    const s = response.toString();

    if (s && s !== '[object Object]') {
      return s;
    }
  }

  const content =
    response?.message?.content ??
    response?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((block) =>
        typeof block === 'string'
          ? block
          : block?.text
      )
      .filter(Boolean)
      .join('\n');
  }

  if (typeof response.text === 'string') {
    return response.text;
  }

  return '';
}

// ---------------------------------------------------------------
// Clean markdown formatting from AI response
// ---------------------------------------------------------------
function cleanLine(line) {
  return line
    .replace(/^#{1,6}\s*/, '')           // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')     // **bold**
    .replace(/\*(.+?)\*/g, '$1')         // *italic*
    .replace(/__(.+?)__/g, '$1')         // __bold__
    .replace(/`([^`]+)`/g, '$1')         // `code`
    .replace(/^[-•*]\s+/, '')            // bullet marker
    .replace(/\s{2,}/g, ' ')             // extra spaces
    .trim();
}

// ---------------------------------------------------------------
// Render formatted AI response
// ---------------------------------------------------------------
function renderFormatted(text) {
  const lines = text.split('\n');

  const blocks = [];

  let bulletBuffer = [];

  const flushBullets = (key) => {
    if (bulletBuffer.length) {
      blocks.push(
        <ul key={`ul-${key}`}>
          {bulletBuffer.map((item, i) => (
            <li key={i}>
              {item}
            </li>
          ))}
        </ul>
      );

      bulletBuffer = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushBullets(idx);
      return;
    }

    const isHeading =
      /^#{1,6}\s*/.test(trimmed);

    const isBullet =
      /^[-•*]\s+/.test(trimmed) ||
      /^\d+[.)]\s+/.test(trimmed);

    const cleaned = cleanLine(
      trimmed.replace(/^\d+[.)]\s+/, '')
    );

    if (!cleaned) {
      flushBullets(idx);
      return;
    }

    if (isHeading) {
      flushBullets(idx);

      blocks.push(
        <p
          key={idx}
          style={{
            fontWeight: 700,
            marginBottom: '6px',
          }}
        >
          {cleaned}
        </p>
      );

      return;
    }

    if (isBullet) {
      bulletBuffer.push(cleaned);
      return;
    }

    if (bulletBuffer.length) {
      bulletBuffer[bulletBuffer.length - 1] +=
        ` — ${cleaned}`;

      return;
    }

    flushBullets(idx);

    blocks.push(
      <p key={idx}>
        {cleaned}
      </p>
    );
  });

  flushBullets('end');

  return blocks;
}

// ---------------------------------------------------------------
// Build a flat, labelled "field: value" context block from
// ReportDataContext so the model can ground its answers in the
// actual data the investigator has touched across all six pages:
// Executive Dashboard, Investigation Queue, Risk Profile,
// Peer Comparison, Investigation Report, and Human Review.
// Purely presentational — never mutates report, never fetches.
// ---------------------------------------------------------------
function buildAppContextText(report) {
  if (!report) return '';

  const lines = [];

  const pushSection = (title) => {
    lines.push(`\n${title}`);
    lines.push('-'.repeat(title.length));
  };

  const pushField = (label, value) => {
    if (value === null || value === undefined || value === '') return;
    lines.push(`${label}: ${value}`);
  };

  const {
    investigation,
    providerRisk,
    claim,
    aiClaimAnalysis,
    peerComparison,
    aiPeerSummary,
    dashboardSummary,
    investigationRecord,
    reportSaveInfo,
  } = report;

  if (investigation) {
    pushSection('INVESTIGATION (from Investigation Queue)');
    pushField('investigation_id', investigation.investigationId ?? investigation.investigation_id);
    pushField('provider_id', investigation.providerId ?? investigation.provider_id);
    pushField('priority', investigation.priority ?? investigation.investigation_priority);
    pushField('status', investigation.status);
    pushField('date', investigation.date ?? investigation.investigation_date);
  }

  if (providerRisk) {
    pushSection('PROVIDER RISK PROFILE (from Risk Profile)');
    pushField('overall_fwa_score', providerRisk.overallFwaScore ?? providerRisk.overall_fwa_score);
    pushField('risk_tier', providerRisk.riskTier ?? providerRisk.risk_tier);
    pushField('total_claims', providerRisk.totalClaims ?? providerRisk.total_claims);
    pushField('total_beneficiaries', providerRisk.totalBeneficiaries ?? providerRisk.total_beneficiaries);
    pushField('total_reimbursement', providerRisk.totalReimbursement ?? providerRisk.total_reimbursement);
    pushField('very_high_risk_claims', providerRisk.veryHighRiskClaims ?? providerRisk.very_high_risk_claims);
    pushField('high_risk_claims', providerRisk.highRiskClaims ?? providerRisk.high_risk_claims);
    pushField('medium_risk_claims', providerRisk.mediumRiskClaims ?? providerRisk.medium_risk_claims);
    pushField('low_risk_claims', providerRisk.lowRiskClaims ?? providerRisk.low_risk_claims);
  }

  if (claim) {
    pushSection('SELECTED CLAIM (from Risk Profile)');
    pushField('claim_id', claim.claimId ?? claim.claim_id);
    pushField('claim_type', claim.claimType ?? claim.claim_type);
    pushField('reimbursement', claim.reimbursement ?? claim.total_claim_cost);
    pushField('risk_score', claim.riskScore ?? claim.claim_risk_score);
    pushField('risk_tier', claim.riskTier ?? claim.claim_risk_tier ?? claim.status);
    pushField('anomaly_score', claim.anomalyScore ?? claim.claim_anomaly_score);
  }

  if (aiClaimAnalysis) {
    pushSection('AI CLAIM ANALYSIS (already generated, from Risk Profile)');
    lines.push(aiClaimAnalysis);
  }

  if (peerComparison && (peerComparison.peerGroup || peerComparison.metrics?.length)) {
    pushSection('PEER COMPARISON (from Peer Comparison page)');
    pushField('peer_group', peerComparison.peerGroup ?? peerComparison.peer_group);

    const metrics = peerComparison.metrics ?? peerComparison.comparison ?? [];
    metrics.forEach((m) => {
      lines.push(
        `- ${m.metric}: provider=${m.provider ?? m.current_provider ?? '—'}, ` +
        `peer_mean=${m.peerMean ?? m.peer_mean ?? '—'}, ` +
        `difference=${m.difference ?? '—'}, z_score=${m.zScore ?? m.z_score ?? '—'}`
      );
    });
  }

  if (aiPeerSummary) {
    pushSection('AI PEER COMPARISON SUMMARY (already generated, from Peer Comparison page)');
    lines.push(aiPeerSummary);
  }

  if (dashboardSummary) {
    const d = dashboardSummary;
    pushSection('EXECUTIVE DASHBOARD (portfolio-wide, from Executive Dashboard)');
    pushField('total_claims', d.total_claims);
    pushField('high_risk_claims', d.high_risk_claims);
    pushField('total_reimbursement', d.total_reimbursement);
    pushField('average_fwa_risk', d.average_fwa_risk);
    pushField('open_investigations', d.open_investigations);

    if (d.provider_risk_distribution?.length) {
      lines.push('provider_risk_distribution:');
      d.provider_risk_distribution.forEach((r) => {
        lines.push(`  - ${r.risk_level}: ${r.provider_count} providers`);
      });
    }

    if (d.claim_risk_distribution?.length) {
      lines.push('claim_risk_distribution:');
      d.claim_risk_distribution.forEach((r) => {
        lines.push(`  - ${r.claim_risk_tier}: ${r.claim_count} claims`);
      });
    }

    if (d.claim_trend?.length) {
      lines.push('claim_trend (by month):');
      d.claim_trend.forEach((t) => {
        lines.push(`  - ${t.month}: ${t.total_claim_count} claims, reimbursement=${t.total_reimbursement}`);
      });
    }
  }

  if (investigationRecord) {
    const r = investigationRecord;
    pushSection('HUMAN REVIEW — SELECTED RECORD (from Human Review page)');
    pushField('investigation_id', r.investigation_id);
    pushField('provider_id', r.provider_id);
    pushField('overall_fwa_risk', r.overall_fwa_risk);
    pushField('decision', r.decision);
    pushField('reason', r.reason);
    pushField('decision_by', r.decision_by);
    pushField('decision_at', r.decision_at);
    pushField('created_at', r.created_at);
    pushField('updated_at', r.updated_at);
  }

  if (reportSaveInfo) {
    pushSection('INVESTIGATION REPORT — SAVE STATUS');
    pushField('saved', reportSaveInfo.saved ?? true);
    pushField('saved_at', reportSaveInfo.savedAt);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------
// Icons
// ---------------------------------------------------------------
const IconScan = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 7V4.5A1.5 1.5 0 0 1 4.5 3H7" />
    <path d="M17 3h2.5A1.5 1.5 0 0 1 21 4.5V7" />
    <path d="M21 17v2.5a1.5 1.5 0 0 1-1.5 1.5H17" />
    <path d="M7 21H4.5A1.5 1.5 0 0 1 3 19.5V17" />
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3.5v2M12 18.5v2" opacity="0" />
  </svg>
);

const IconClose = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const IconImage = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect
      x="3"
      y="4"
      width="18"
      height="16"
      rx="2.5"
    />
    <circle
      cx="8.5"
      cy="9.5"
      r="1.5"
    />
    <path d="M21 16l-5.5-5.5a1.5 1.5 0 0 0-2.1 0L4 19" />
  </svg>
);

const IconSend = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 20l16-8L4 4l2 8-2 8Z" />
  </svg>
);

const IconTrash = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20V7h10Z" />
  </svg>
);

// ---------------------------------------------------------------
// Chatbot Widget
// ---------------------------------------------------------------
export default function ChatbotWidget() {
  const { report } = useReportData();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // NEW — tracks whether the current send is actively querying
  // the database, so the UI can show a distinct status if desired.
  const [isLookingUp, setIsLookingUp] = useState(false);

  const fileInputRef = useRef(null);
  const bodyRef = useRef(null);
  const textareaRef = useRef(null);

  // -------------------------------------------------------------
  // Preload Puter SDK
  // -------------------------------------------------------------
  useEffect(() => {
    loadPuter().catch((err) => {
      setLoadError(err.message);
    });
  }, []);

  // -------------------------------------------------------------
  // Auto-scroll chat
  // -------------------------------------------------------------
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop =
        bodyRef.current.scrollHeight;
    }
  }, [messages, isSending, isOpen]);

  const togglePanel = () => {
    setIsOpen((v) => !v);
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  // -------------------------------------------------------------
  // Image selection
  // -------------------------------------------------------------
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];

    e.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessages((m) => [
        ...m,
        {
          role: 'system',
          text:
            'Please choose an image file (PNG, JPG, WEBP).',
        },
      ]);

      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setMessages((m) => [
        ...m,
        {
          role: 'system',
          text:
            'That image is larger than 8MB — try a smaller file.',
        },
      ]);

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setAttachment({
        name: file.name,
        dataUrl: reader.result,
      });
    };

    reader.readAsDataURL(file);
  }, []);

  const removeAttachment = () => {
    setAttachment(null);
  };

  // -------------------------------------------------------------
  // Send question to Puter AI, grounded in:
  //   1. Whatever is already open on-screen (ReportDataContext)
  //   2. A live Supabase lookup for any provider/investigation/
  //      claim IDs mentioned directly in the question
  // -------------------------------------------------------------
  const handleSend = useCallback(async () => {
    const question = inputText.trim();

    if (!question || isSending) {
      return;
    }

    const userMessage = {
      role: 'user',
      text: question,
      image: attachment?.dataUrl || null,
    };

    setMessages((m) => [
      ...m,
      userMessage,
    ]);

    setInputText('');
    setIsSending(true);

    try {
      const puter = await loadPuter();

      // ----------------------------------------------------------
      // 1. On-screen app context (existing behavior, unchanged)
      // ----------------------------------------------------------
      const appContextText = buildAppContextText(report);

      // ----------------------------------------------------------
      // 2. NEW — live database lookup for any IDs mentioned in
      //    the question itself, independent of what's on screen.
      //    Runs quietly; failures are reported to the model as
      //    plain-text errors rather than throwing.
      // ----------------------------------------------------------
      setIsLookingUp(true);

      let dbContextText = '';
      let aggregateContextText = '';

      try {
        const [dbLookup, aggregateLookup] = await Promise.all([
          lookupEntitiesInQuestion(question),
          lookupAggregatesInQuestion(question),
        ]);

        dbContextText = buildDbLookupText(dbLookup);
        aggregateContextText = buildAggregateLookupText(aggregateLookup);
      } catch (lookupErr) {
        // Non-fatal — proceed with whatever context we do have.
        console.error('Database lookup failed:', lookupErr);
      } finally {
        setIsLookingUp(false);
      }

      const combinedContextText =
        (appContextText || '') +
        (dbContextText || '') +
        (aggregateContextText || '');

      const composedQuestion = combinedContextText
        ? `You are ClaimGuard Vision, an assistant embedded in the ClaimGuard AI healthcare fraud-investigation app. ` +
          `Answer the user's question using the data below. This data has three possible sources, all real: ` +
          `(a) records currently open in the app across its pages (Executive Dashboard, Investigation Queue, ` +
          `Risk Profile, Peer Comparison, Human Review); (b) a live database lookup performed just now for ` +
          `any provider, claim, or investigation-record ID mentioned directly in the user's question; and ` +
          `(c) a live portfolio-wide aggregate lookup performed just now if the question asked about totals, ` +
          `averages, or distributions across all providers/claims rather than one specific ID. Field names shown ` +
          `are backend field names, values are real. If the answer is not present in this data — including when ` +
          `an ID was mentioned but no matching record was found in the live lookup — say so plainly rather than ` +
          `guessing or inventing values. Do not recalculate or reinterpret risk scores, tiers, or totals — report ` +
          `them exactly as given. When a lookup returns multiple related tables for the same provider (e.g. ` +
          `provider_risk and provider_claim_summary), combine them naturally in your answer rather than listing ` +
          `raw table names.\n\n` +
          `=== APP DATA (current session) ===${combinedContextText}\n=== END APP DATA ===\n\n` +
          `User question: ${question}`
        : question;

      const response = attachment?.dataUrl
        ? await puter.ai.chat(
            composedQuestion,
            attachment.dataUrl,
            {
              model: VISION_MODEL,
            }
          )
        : await puter.ai.chat(
            composedQuestion,
            {
              model: VISION_MODEL,
            }
          );

      const answer =
        extractAnswerText(response) ||
        "I couldn't read a response for that — try rephrasing the question.";

      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: answer,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text:
            `Something went wrong reaching the AI service: ${
              err?.message || 'unknown error'
            }. Please try again.`,
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
      setIsLookingUp(false);
    }
  }, [
    inputText,
    isSending,
    attachment,
    report,
  ]);

  // -------------------------------------------------------------
  // Enter to send
  // -------------------------------------------------------------
  const handleKeyDown = (e) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey
    ) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasImageEver =
    attachment !== null ||
    messages.some((m) => m.image);

  const hasAppContext = Boolean(
    report?.investigation ||
    report?.providerRisk ||
    report?.claim ||
    report?.peerComparison ||
    report?.dashboardSummary ||
    report?.investigationRecord
  );

  // -------------------------------------------------------------
  // UI
  // -------------------------------------------------------------
  return (
    <div className="cgv-root">

      {isOpen && (
        <div
          className="cgv-panel"
          role="dialog"
          aria-label="ClaimGuard Vision image assistant"
        >

          {/* Header */}
          <div className="cgv-header">

            <div className="cgv-header-icon">
              <img
                className="cgv-header-gif"
                src={chatbotGif}
                alt=""
              />
            </div>

            <div className="cgv-header-text">
              <div className="cgv-header-title">
                ClaimGuard Vision
              </div>
            </div>

            <button
              className="cgv-header-close"
              onClick={togglePanel}
              aria-label="Close chat"
            >
              <IconClose />
            </button>

            {(isSending || isLookingUp) && (
              <div className="cgv-scanline" />
            )}

          </div>

          {/* Chat Body */}
          <div
            className="cgv-body"
            ref={bodyRef}
          >

            {messages.length === 0 && (
              <div className="cgv-empty">

                <div className="cgv-empty-icon">
                  <IconImage />
                </div>

                <div className="cgv-empty-title">
                  {hasAppContext
                    ? 'Ask me about this case'
                    : 'Ask about any provider, claim, or investigation'}
                </div>

                <div className="cgv-empty-text">
                  {hasAppContext
                    ? `I can answer questions about the investigation, provider risk, claim, peer comparison, ` +
                      `executive dashboard, and human review data currently open in the app. I can also look up ` +
                      `any other provider (e.g. "PRV51001"), investigation (e.g. "INV1002"), or claim (e.g. ` +
                      `"CLM3004") directly from the database, even if it isn't open on screen. You can also ` +
                      `attach an image if needed.`
                    : `Ask about any provider ID, investigation ID, or claim ID (e.g. "what's the overall FWA ` +
                      `score for PRV51001?") and I'll look it up in the database directly. Once you open a case ` +
                      `from the Investigation Queue or visit the Executive Dashboard, I can also answer questions ` +
                      `about that on-screen data. You can also attach a claim document or screenshot to ask about it.`}
                </div>

              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`cgv-row cgv-row--${msg.role}`}
              >

                {msg.role === 'system' ? (
                  <div className="cgv-bubble cgv-bubble--system">
                    {msg.text}
                  </div>
                ) : (
                  <div
                    className={`cgv-bubble cgv-bubble--${msg.role}${
                      msg.isError
                        ? ' cgv-bubble--error'
                        : ''
                    }`}
                  >

                    {msg.role === 'assistant' &&
                      !msg.isError && (
                        <div className="cgv-bubble-label">
                          ClaimGuard Vision
                        </div>
                      )}

                    {msg.image && (
                      <img
                        className="cgv-bubble-img"
                        src={msg.image}
                        alt="Attached"
                      />
                    )}

                    {msg.role === 'assistant'
                      ? renderFormatted(msg.text)
                      : <p>{msg.text}</p>}

                  </div>
                )}

              </div>
            ))}

            {/* Typing / lookup indicator */}
            {isSending && (
              <div className="cgv-row cgv-row--assistant">

                <div className="cgv-bubble cgv-bubble--assistant">

                  <div className="cgv-bubble-label">
                    ClaimGuard Vision
                  </div>

                  {isLookingUp && (
                    <div
                      style={{
                        fontSize: '10.5px',
                        color: '#627D98',
                        marginBottom: '4px',
                      }}
                    >
                      Checking the database…
                    </div>
                  )}

                  <div className="cgv-typing">
                    <span />
                    <span />
                    <span />
                  </div>

                </div>

              </div>
            )}

          </div>

          {/* Composer */}
          <div className="cgv-composer">

            {attachment && (
              <div className="cgv-attachment-chip">

                <img
                  className="cgv-attachment-thumb"
                  src={attachment.dataUrl}
                  alt="Selected"
                />

                <div className="cgv-attachment-name">
                  {attachment.name}

                  <div className="cgv-attachment-sub">
                    Ready to analyze
                  </div>
                </div>

                <button
                  className="cgv-attachment-remove"
                  onClick={removeAttachment}
                  aria-label="Remove image"
                >
                  <IconTrash />
                </button>

              </div>
            )}

            <div className="cgv-input-row">

              <button
                className="cgv-icon-btn"
                onClick={handlePickFile}
                aria-label="Attach image"
                title="Attach image"
              >
                <IconImage />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{
                  display: 'none',
                }}
              />

              <textarea
                ref={textareaRef}
                className="cgv-textarea"
                rows={1}
                placeholder={
                  hasAppContext
                    ? 'Ask about this case, or any provider/claim/investigation ID…'
                    : hasImageEver
                    ? 'Ask about this image, or any provider/claim/investigation ID…'
                    : 'Ask about a provider, claim, investigation ID, or attach an image…'
                }
                value={inputText}
                onChange={(e) =>
                  setInputText(e.target.value)
                }
                onKeyDown={handleKeyDown}
              />

              <button
                className="cgv-send"
                onClick={handleSend}
                disabled={
                  !inputText.trim() ||
                  isSending
                }
                aria-label="Send"
              >
                <IconSend />
              </button>

            </div>

          </div>

        </div>
      )}

      {/* Launcher */}
      <div className="cgv-launcher-wrap">

        {!isOpen && (
          <>
            <span className="cgv-ring" />
            <span className="cgv-ring cgv-ring--delay" />
          </>
        )}

        <button
          className="cgv-fab"
          onClick={togglePanel}
          aria-label={
            isOpen
              ? 'Close AI image assistant'
              : 'Open AI image assistant'
          }
        >
          {isOpen ? (
            <IconClose />
          ) : (
            <img
              className="cgv-fab-gif"
              src={chatbotGif}
              alt=""
            />
          )}

          {!isOpen && (
            <span className="cgv-fab-badge" />
          )}

        </button>

      </div>

    </div>
  );
}