import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import healthImage from '../../assets/images/health.png';

/**
 * InvestigationReportPDF
 * ------------------------------------------------------------------
 * Renders the 6-section Medicare Investigation Report exactly per
 * spec. This component ONLY formats data it is given via props — it
 * never invents, estimates, or recalculates any value. Every field
 * falls back to "N/A" when missing.
 * ------------------------------------------------------------------
 */

// ---------------------------------------------------------------
// Formatting helpers — presentation only, never alters meaning
// ---------------------------------------------------------------
const NA = 'N/A';

const fmtText = (v) => (v === null || v === undefined || v === '' ? NA : String(v));

const fmtNumber = (v, digits = 2) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return NA;
  return Number(v).toFixed(digits);
};

const fmtCurrencyINR = (v) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return NA;
  return `Rs. ${Number(v).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const fmtInt = (v) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return NA;
  return Number(v).toLocaleString('en-IN');
};

// Risk tier is displayed exactly as supplied — never derived from a score.
const fmtRiskTier = (v) => fmtText(v);

// ---------------------------------------------------------------
// Theme — matches ClaimGuard AI's existing blue/white palette
// ---------------------------------------------------------------
const COLORS = {
  navy: '#0A2A4A',
  blue: '#0284C7',
  blueDark: '#0369A1',
  cyan: '#67e8f9',
  border: '#D5E7F3',
  panel: '#F4F9FD',
  text: '#0A2A4A',
  textMuted: '#627D98',
  rose: '#E11D48',
  amber: '#D97706',
  emerald: '#059669',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 90,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },

  // ---- Fixed header ----
  headerFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoImg: { width: 30, height: 30, borderRadius: 4 },
  headerTitleWrap: { justifyContent: 'center' },
  headerTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 7.5,
    color: COLORS.cyan,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  headerRight: { alignItems: 'flex-end' },
  headerReportLabel: {
    fontSize: 7,
    color: '#bae6fd',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerReportId: {
    fontSize: 9,
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
  },

  // ---- Fixed footer ----
  footerFixed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7.5, color: COLORS.textMuted },
  footerPageNum: { fontSize: 7.5, color: COLORS.textMuted },

  // ---- Section styling ----
  section: { marginBottom: 16 },
  sectionHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.panel,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.blue,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  sectionNumber: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    backgroundColor: COLORS.blue,
    width: 16,
    height: 16,
    borderRadius: 8,
    textAlign: 'center',
    lineHeight: 1.15,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ---- Key/value grid (Investigation Info, Provider Risk Summary) ----
  kvGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
  },
  kvCell: {
    width: '50%',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  kvCellNoBorderRight: {
    borderRightWidth: 0,
  },
  kvLabel: {
    fontSize: 7.5,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  kvValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.navy,
  },

  // ---- Risk distribution sub-grid (sits inside a kvGrid cell) ----
  riskDistribution: {
    width: '50%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  riskItem: {
    width: '50%',
    paddingVertical: 7,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  riskLabel: {
    fontSize: 7.5,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  riskValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.navy,
  },
  riskValueVeryHigh: { color: '#B91C1C' },
  riskValueHigh: { color: '#B91C1C' },
  riskValueMedium: { color: '#B45309' },
  riskValueLow: { color: '#047857' },

  // ---- Tables ----
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.navy,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tableRowAlt: {
    backgroundColor: '#FAFCFE',
  },
  th: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    paddingVertical: 6,
    paddingHorizontal: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  td: {
    fontSize: 8.5,
    color: COLORS.text,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },

  // Column widths — Claim Risk Analysis table (6 cols)
  colClaimId: { width: '19%' },
  colClaimType: { width: '15%' },
  colReimb: { width: '18%' },
  colRiskScore: { width: '14%' },
  colRiskTier: { width: '17%' },
  colAnomaly: { width: '17%' },

  // Column widths — Peer Comparison table (5 cols)
  colMetric: { width: '32%' },
  colProvider: { width: '17%' },
  colPeerMean: { width: '17%' },
  colDiff: { width: '17%' },
  colZ: { width: '17%' },

  badge: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeHigh: { backgroundColor: '#FEE2E2', color: '#B91C1C' },
  badgeMedium: { backgroundColor: '#FEF3C7', color: '#B45309' },
  badgeLow: { backgroundColor: '#D1FAE5', color: '#047857' },
  badgeNeutral: { backgroundColor: '#E5E7EB', color: '#374151' },

  // ---- AI text panels ----
  aiPanel: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.panel,
    borderRadius: 4,
    padding: 12,
  },
  aiPanelLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.blueDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  aiParagraph: {
    fontSize: 9,
    color: COLORS.text,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  aiBullet: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  aiBulletDot: {
    fontSize: 9,
    color: COLORS.blue,
    marginRight: 5,
  },
  aiBulletText: {
    fontSize: 9,
    color: COLORS.text,
    lineHeight: 1.5,
    flex: 1,
  },
  aiUnavailable: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: 'Helvetica-Oblique',
  },

  disclaimer: {
    marginTop: 4,
    fontSize: 7,
    color: COLORS.textMuted,
    fontFamily: 'Helvetica-Oblique',
  },
});

// ---------------------------------------------------------------
// Risk tier -> badge style (display only; tier value is never
// derived here, only colour-coded for readability)
// ---------------------------------------------------------------
const riskBadgeStyle = (tier) => {
  const t = (tier || '').toLowerCase();
  if (t === 'very high' || t === 'very high risk' || t === 'high' || t === 'high risk') {
    return styles.badgeHigh;
  }
  if (t === 'medium' || t === 'medium risk') return styles.badgeMedium;
  if (t === 'low' || t === 'low risk') return styles.badgeLow;
  return styles.badgeNeutral;
};

// ---------------------------------------------------------------
// Renders AI-generated free text as paragraphs/bullets, preserving
// content and meaning exactly as supplied — no new text generated.
// ---------------------------------------------------------------
const AiText = ({ text, fallback }) => {
  if (!text || !text.trim()) {
    return <Text style={styles.aiUnavailable}>{fallback}</Text>;
  }

  const lines = text.split('\n');

  return (
    <View>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const cleaned = trimmed.replace(/\*\*/g, '');
        const isBullet = /^[-•*]\s/.test(cleaned);

        if (isBullet) {
          const content = cleaned.replace(/^[-•*]\s/, '');
          return (
            <View key={idx} style={styles.aiBullet} wrap={false}>
              <Text style={styles.aiBulletDot}>•</Text>
              <Text style={styles.aiBulletText}>{content}</Text>
            </View>
          );
        }

        return (
          <Text key={idx} style={styles.aiParagraph}>
            {cleaned}
          </Text>
        );
      })}
    </View>
  );
};

// ---------------------------------------------------------------
// Header / Footer (rendered on every page via `fixed`)
// ---------------------------------------------------------------
const ReportHeader = ({ investigationId }) => (
  <View style={styles.headerFixed} fixed>
    <View style={styles.headerLeft}>
      <Image src={healthImage} style={styles.logoImg} />
      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle}>ClaimGuard AI</Text>
        <Text style={styles.headerSubtitle}>Medicare Investigation Report</Text>
      </View>
    </View>
    <View style={styles.headerRight}>
      <Text style={styles.headerReportLabel}>Investigation ID</Text>
      <Text style={styles.headerReportId}>{fmtText(investigationId)}</Text>
    </View>
  </View>
);

const ReportFooter = () => (
  <View style={styles.footerFixed} fixed>
    <Text style={styles.footerText}>
      ClaimGuard AI — Confidential Investigation Document
    </Text>
    <Text
      style={styles.footerPageNum}
      render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
    />
  </View>
);

const SectionHeader = ({ number, title }) => (
  <View style={styles.sectionHeaderBar}>
    <Text style={styles.sectionNumber}>{number}</Text>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ---------------------------------------------------------------
// Main document
// ---------------------------------------------------------------
export const InvestigationReportPDF = ({ reportData }) => {
  const {
    investigation = {},
    providerRisk = {},
    claims = [],
    aiClaimAnalysis,
    peerComparison = {},
    aiPeerSummary,
  } = reportData || {};

  const claimList = Array.isArray(claims) ? claims : claims ? [claims] : [];
  const metrics = Array.isArray(peerComparison?.metrics) ? peerComparison.metrics : [];

  return (
    <Document
      title={`ClaimGuard AI Investigation Report - ${fmtText(investigation.investigationId)}`}
      author="ClaimGuard AI"
    >
      <Page size="A4" style={styles.page} wrap>
        <ReportHeader investigationId={investigation.investigationId} />
        <ReportFooter />

        {/* ============================================================
            1. INVESTIGATION INFORMATION
        ============================================================ */}
        <View style={styles.section} wrap={false}>
          <SectionHeader number="1" title="Investigation Information" />
          <View style={styles.kvGrid}>
            <View style={styles.kvCell}>
              <Text style={styles.kvLabel}>Investigation ID</Text>
              <Text style={styles.kvValue}>{fmtText(investigation.investigationId)}</Text>
            </View>
            <View style={[styles.kvCell, styles.kvCellNoBorderRight]}>
              <Text style={styles.kvLabel}>Provider ID</Text>
              <Text style={styles.kvValue}>{fmtText(investigation.providerId)}</Text>
            </View>
            <View style={styles.kvCell}>
              <Text style={styles.kvLabel}>Investigation Priority</Text>
              <Text style={styles.kvValue}>{fmtText(investigation.priority)}</Text>
            </View>
            <View style={[styles.kvCell, styles.kvCellNoBorderRight]}>
              <Text style={styles.kvLabel}>Investigation Status</Text>
              <Text style={styles.kvValue}>{fmtText(investigation.status)}</Text>
            </View>
            <View style={[styles.kvCell, { borderBottomWidth: 0 }]}>
              <Text style={styles.kvLabel}>Investigation Date</Text>
              <Text style={styles.kvValue}>{fmtText(investigation.date)}</Text>
            </View>
            <View style={[styles.kvCell, styles.kvCellNoBorderRight, { borderBottomWidth: 0 }]}>
              <Text style={styles.kvLabel}> </Text>
              <Text style={styles.kvValue}> </Text>
            </View>
          </View>
        </View>

        {/* ============================================================
            2. PROVIDER RISK SUMMARY
        ============================================================ */}
        <View style={styles.section} wrap={false}>
          <SectionHeader number="2" title="Provider Risk Summary" />
          <View style={styles.kvGrid}>
            <View style={styles.kvCell}>
              <Text style={styles.kvLabel}>Overall FWA Risk Score</Text>
              <Text style={styles.kvValue}>{fmtNumber(providerRisk.overallFwaScore)}</Text>
            </View>
            <View style={styles.riskDistribution}>
              <View style={styles.riskItem}>
                <Text style={styles.riskLabel}>Very High Risk</Text>
                <Text style={[styles.riskValue, styles.riskValueVeryHigh]}>
                  {fmtInt(providerRisk.veryHighRiskClaims ?? 0)}
                </Text>
              </View>

              <View style={styles.riskItem}>
                <Text style={styles.riskLabel}>High Risk</Text>
                <Text style={[styles.riskValue, styles.riskValueHigh]}>
                  {fmtInt(providerRisk.highRiskClaims ?? 0)}
                </Text>
              </View>

              <View style={styles.riskItem}>
                <Text style={styles.riskLabel}>Medium Risk</Text>
                <Text style={[styles.riskValue, styles.riskValueMedium]}>
                  {fmtInt(providerRisk.mediumRiskClaims ?? 0)}
                </Text>
              </View>

              <View style={styles.riskItem}>
                <Text style={styles.riskLabel}>Low Risk</Text>
                <Text style={[styles.riskValue, styles.riskValueLow]}>
                  {fmtInt(providerRisk.lowRiskClaims ?? 0)}
                </Text>
              </View>
            </View>
            <View style={styles.kvCell}>
              <Text style={styles.kvLabel}>Total Claims</Text>
              <Text style={styles.kvValue}>{fmtInt(providerRisk.totalClaims)}</Text>
            </View>
            <View style={[styles.kvCell, styles.kvCellNoBorderRight]}>
              <Text style={styles.kvLabel}>Total Beneficiaries</Text>
              <Text style={styles.kvValue}>{fmtInt(providerRisk.totalBeneficiaries)}</Text>
            </View>
            <View style={[styles.kvCell, { borderBottomWidth: 0, width: '100%' }]}>
              <Text style={styles.kvLabel}>Total Reimbursement</Text>
              <Text style={styles.kvValue}>{fmtCurrencyINR(providerRisk.totalReimbursement)}</Text>
            </View>
          </View>
        </View>

        {/* ============================================================
            3. CLAIM RISK ANALYSIS
        ============================================================ */}
        <View style={styles.section}>
          <SectionHeader number="3" title="Claim Risk Analysis" />
          {claimList.length === 0 ? (
            <Text style={styles.aiUnavailable}>No claim data supplied.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeaderRow} fixed>
                <Text style={[styles.th, styles.colClaimId]}>Claim ID</Text>
                <Text style={[styles.th, styles.colClaimType]}>Type</Text>
                <Text style={[styles.th, styles.colReimb]}>Reimbursement</Text>
                <Text style={[styles.th, styles.colRiskScore]}>Risk Score</Text>
                <Text style={[styles.th, styles.colRiskTier]}>Risk Tier</Text>
                <Text style={[styles.th, styles.colAnomaly]}>Anomaly Score</Text>
              </View>
              {claimList.map((c, idx) => (
                <View
                  key={c.claimId || idx}
                  style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
                  wrap={false}
                >
                  <Text style={[styles.td, styles.colClaimId]}>{fmtText(c.claimId)}</Text>
                  <Text style={[styles.td, styles.colClaimType]}>{fmtText(c.claimType)}</Text>
                  <Text style={[styles.td, styles.colReimb]}>{fmtCurrencyINR(c.reimbursement)}</Text>
                  <Text style={[styles.td, styles.colRiskScore]}>{fmtNumber(c.riskScore)}</Text>
                  <View style={[styles.td, styles.colRiskTier]}>
                    <Text style={[styles.badge, riskBadgeStyle(c.riskTier)]}>
                      {fmtRiskTier(c.riskTier)}
                    </Text>
                  </View>
                  <Text style={[styles.td, styles.colAnomaly]}>{fmtNumber(c.anomalyScore)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ============================================================
            4. AI CLAIM ANALYSIS
        ============================================================ */}
        <View style={styles.section}>
          <SectionHeader number="4" title="AI Claim Analysis" />
          <View style={styles.aiPanel}>
            <Text style={styles.aiPanelLabel}>AI-Generated Explanation</Text>
            <AiText text={aiClaimAnalysis} fallback="AI claim analysis not available." />
          </View>
        </View>

        {/* ============================================================
            5. PEER COMPARISON
        ============================================================ */}
        <View style={styles.section}>
          <SectionHeader number="5" title="Peer Comparison" />
          <View style={{ marginBottom: 8 }} wrap={false}>
            <Text style={styles.kvLabel}>Peer Group</Text>
            <Text style={styles.kvValue}>{fmtText(peerComparison.peerGroup)}</Text>
          </View>
          {metrics.length === 0 ? (
            <Text style={styles.aiUnavailable}>No peer comparison data supplied.</Text>
          ) : (
            <View style={styles.table} minPresenceAhead={40}>
              <View style={styles.tableHeaderRow} fixed>
                <Text style={[styles.th, styles.colMetric]}>Metric</Text>
                <Text style={[styles.th, styles.colProvider]}>Provider</Text>
                <Text style={[styles.th, styles.colPeerMean]}>Peer Mean</Text>
                <Text style={[styles.th, styles.colDiff]}>Difference</Text>
                <Text style={[styles.th, styles.colZ]}>Z-Score</Text>
              </View>
              {metrics.map((m, idx) => (
                <View
                  key={m.metric || idx}
                  style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
                  wrap={false}
                >
                  <Text style={[styles.td, styles.colMetric]}>{fmtText(m.metric)}</Text>
                  <Text style={[styles.td, styles.colProvider]}>{fmtNumber(m.provider)}</Text>
                  <Text style={[styles.td, styles.colPeerMean]}>{fmtNumber(m.peerMean)}</Text>
                  <Text style={[styles.td, styles.colDiff]}>{fmtNumber(m.difference)}</Text>
                  <Text style={[styles.td, styles.colZ]}>{fmtNumber(m.zScore)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ============================================================
            6. AI PEER COMPARISON SUMMARY
        ============================================================ */}
        <View style={styles.section}>
          <SectionHeader number="6" title="AI Peer Comparison Summary" />
          <View style={styles.aiPanel}>
            <Text style={styles.aiPanelLabel}>AI-Generated Summary</Text>
            <AiText text={aiPeerSummary} fallback="AI peer comparison summary not available." />
          </View>
          <Text style={styles.disclaimer}>
            Risk scores and anomaly indicators presented in this report identify claims and
            provider patterns that require investigation. They do not constitute a finding or
            confirmation of fraud, waste, or abuse.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvestigationReportPDF;