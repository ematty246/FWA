import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PDFViewer,
  PDFDownloadLink,
  pdf,
} from '@react-pdf/renderer';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { useReportData } from '../../context/ReportDataContext';
import { InvestigationReportPDF } from './InvestigationReportPDF';
import DownloadImageButton from './DownloadImageButton';

import reportService from '../../services/reportService';
const buildReportDataProps = (report) => {
  const {
    investigation,
    providerRisk,
    claim,
    aiClaimAnalysis,
    peerComparison,
    aiPeerSummary,
  } = report;

  return {
    investigation: {
      investigationId:
        investigation?.investigationId ??
        investigation?.investigation_id,

      providerId:
        investigation?.providerId ??
        investigation?.provider_id,

      priority:
        investigation?.priority ??
        investigation?.investigation_priority,

      status: investigation?.status,

      date:
        investigation?.date ??
        investigation?.investigation_date,
    },

providerRisk: {
  overallFwaScore:
    providerRisk?.overallFwaScore ??
    providerRisk?.overall_fwa_score,

  veryHighRiskClaims:
    providerRisk?.veryHighRiskClaims ??
    providerRisk?.very_high_risk_claims ??
    0,

  highRiskClaims:
    providerRisk?.highRiskClaims ??
    providerRisk?.high_risk_claims ??
    0,

  mediumRiskClaims:
    providerRisk?.mediumRiskClaims ??
    providerRisk?.medium_risk_claims ??
    0,

  lowRiskClaims:
    providerRisk?.lowRiskClaims ??
    providerRisk?.low_risk_claims ??
    0,

  totalClaims:
    providerRisk?.totalClaims ??
    providerRisk?.total_claims,

  totalBeneficiaries:
    providerRisk?.totalBeneficiaries ??
    providerRisk?.total_beneficiaries,

  totalReimbursement:
    providerRisk?.totalReimbursement ??
    providerRisk?.total_reimbursement ??
    providerRisk?.average_claim_reimbursement,
},

    claims: claim
      ? [
          {
            claimId:
              claim.claimId ??
              claim.claim_id,

            claimType:
              claim.claimType ??
              claim.claim_type,

            reimbursement:
              claim.reimbursement ??
              claim.total_claim_cost,

            riskScore:
              claim.riskScore ??
              claim.claim_risk_score ??
              claim.claim_anomaly_score,

            riskTier:
              claim.riskTier ??
              claim.claim_risk_tier ??
              claim.status,

            anomalyScore:
              claim.anomalyScore ??
              claim.claim_anomaly_score,
          },
        ]
      : [],

    aiClaimAnalysis: aiClaimAnalysis || null,

    peerComparison: {
      peerGroup:
        peerComparison?.peerGroup ??
        peerComparison?.peer_group,

      metrics: (
        peerComparison?.metrics ??
        peerComparison?.comparison ??
        []
      ).map((m) => ({
        metric: m.metric,

        provider:
          m.provider ??
          m.current_provider,

        peerMean:
          m.peerMean ??
          m.peer_mean,

        difference:
          m.difference,

        zScore:
          m.zScore ??
          m.z_score,
      })),
    },

    aiPeerSummary: aiPeerSummary || null,
  };
};

export const InvestigationReportPage = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = React.useState(false);
const [saveSuccess, setSaveSuccess] = React.useState(false);
const [saveError, setSaveError] = React.useState('');
  const { report, isReportReady } = useReportData();

  const handleSaveReport = async () => {
  setSaving(true);
  setSaveSuccess(false);
  setSaveError('');

  try {

    // ==========================================================
    // 1. Investigator ID
    // ==========================================================

    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      throw new Error(
        'Investigator information not found. Please login again.'
      );
    }

    const user = JSON.parse(storedUser);

    const investigatorId =
      user?.investigator_id ??
      user?.investigatorId ??
      user?.user_id ??
      user?.userId ??
      user?.id;

    if (!investigatorId) {
      throw new Error(
        'Investigator ID is missing from the logged-in user.'
      );
    }

    // ==========================================================
    // 2. Investigation ID
    // ==========================================================

    const investigationId =
      reportData?.investigation?.investigationId;

    if (!investigationId) {
      throw new Error(
        'Investigation ID is missing.'
      );
    }

    // ==========================================================
    // 3. Provider ID
    // ==========================================================

    const providerId =
      reportData?.investigation?.providerId;

    if (!providerId) {
      throw new Error(
        'Provider ID is missing.'
      );
    }

    // ==========================================================
    // 4. Overall FWA Risk
    // ==========================================================

    const overallFwaRisk =
      reportData?.providerRisk?.overallFwaScore;

    if (
      overallFwaRisk === null ||
      overallFwaRisk === undefined
    ) {
      throw new Error(
        'Overall FWA risk score is missing.'
      );
    }

    // ==========================================================
    // 5. Generate PDF Blob
    // ==========================================================

    const pdfBlob = await pdf(
      <InvestigationReportPDF
        reportData={reportData}
      />
    ).toBlob();

    if (!pdfBlob || pdfBlob.size === 0) {
      throw new Error(
        'Generated PDF is empty.'
      );
    }

    // ==========================================================
    // 6. Create record + upload PDF
    // ==========================================================

    const result =
      await reportService.saveInvestigationReport({
        investigationId,
        investigatorId,
        providerId,
        overallFwaRisk,
        pdfBlob,
      });

    console.log(
      'Investigation report saved:',
      result
    );

    // ==========================================================
    // 7. Success
    // ==========================================================

    setSaveSuccess(true);

  } catch (error) {

    console.error(
      'Failed to save investigation report:',
      error
    );

    const message =
      error?.response?.data?.detail ||
      error?.message ||
      'Unable to save investigation report.';

    setSaveError(
      typeof message === 'string'
        ? message
        : 'Unable to save investigation report.'
    );

  } finally {

    setSaving(false);
  }
};
  const reportData = useMemo(
    () => buildReportDataProps(report),
    [report]
  );

  const baseFileName = `ClaimGuard_Investigation_Report_${
    reportData.investigation.investigationId || 'draft'
  }`;
  const pdfFileName = `${baseFileName}.pdf`;
  const imageFileName = `${baseFileName}.png`;

  if (!isReportReady) {
    return (
      <div className="h-full min-h-0 bg-[#EAF4FA] flex items-center justify-center p-8">
        <div className="bg-white p-8 rounded-2xl border border-amber-200 max-w-lg text-center space-y-3">
          <WarningAmberRoundedIcon
            sx={{ fontSize: 30, color: '#d97706' }}
            className="mx-auto"
          />

          <h3 className="text-sm font-bold text-amber-700">
            Report data not ready yet
          </h3>

          <p className="text-xs text-[#627D98] leading-relaxed">
            To generate an Investigation Report, first open a case from the
            Investigation Queue, view its Risk Profile, and open a claim.
            Peer Comparison and AI summaries are included automatically if
            you generate them along the way.
          </p>

          <button
            onClick={() => navigate('/queue')}
            className="mt-2 px-4 py-2 bg-[#0284C7] text-white text-xs font-bold rounded-lg hover:bg-[#0369A1] transition"
          >
            Go to Investigation Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="
        h-[calc(100vh-5rem)]
        w-full
        bg-[#EAF4FA]
        text-[#0A2A4A]
        flex
        flex-col
        overflow-hidden
      "
    >

      {/* ============================================================
          TOOLBAR
      ============================================================ */}
      <div
        className="
          flex
          items-center
          justify-between
          gap-4
          bg-gradient-to-r
          from-[#0A2A4A]
          via-[#0369A1]
          to-[#0284C7]
          text-white
          px-6
          py-4
          shrink-0
          border-b
          border-[#C6E2F5]
        "
      >

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="
            flex
            items-center
            gap-2
            text-sm
            font-bold
            text-white/90
            hover:text-white
            transition
            shrink-0
          "
        >
          <ArrowBackRoundedIcon sx={{ fontSize: 22 }} />
          Back
        </button>

        {/* Center title */}
        <div className="text-center min-w-0">
          <h1 className="text-lg font-black tracking-tight truncate">
            Investigation Report
          </h1>

          <p className="text-xs text-sky-100/80 mt-1 truncate">
            {reportData.investigation.investigationId || 'Draft'}
            {' · '}
            {reportData.investigation.providerId || 'N/A'}
          </p>
        </div>

        {/* Downloads */}
        <div className="flex items-center gap-3 shrink-0">

  {/* SAVE REPORT */}

  <button
    type="button"
    onClick={handleSaveReport}
    disabled={saving}
    className="
      flex
      items-center
      gap-2
      px-5
      py-2.5
      bg-emerald-500
      text-white
      text-sm
      font-extrabold
      rounded-xl
      shadow-sm
      hover:bg-emerald-600
      disabled:opacity-60
      disabled:cursor-not-allowed
      transition
      uppercase
      tracking-wide
    "
  >
    {saving ? 'Saving…' : 'Save Report'}
  </button>


  {/* DOWNLOAD IMAGE */}

  <DownloadImageButton
    reportData={reportData}
    ReportDoc={InvestigationReportPDF}
    fileName={imageFileName}
  />


  {/* DOWNLOAD PDF */}

  <PDFDownloadLink
    document={
      <InvestigationReportPDF
        reportData={reportData}
      />
    }
    fileName={pdfFileName}
    className="
      flex
      items-center
      gap-2
      px-5
      py-2.5
      bg-white
      text-[#0284C7]
      text-sm
      font-extrabold
      rounded-xl
      shadow-sm
      hover:bg-sky-50
      transition
      uppercase
      tracking-wide
    "
  >
    {({ loading }) => (
      <>
        <DownloadRoundedIcon sx={{ fontSize: 18 }} />

        {loading
          ? 'Preparing…'
          : 'Download PDF'}
      </>
    )}
  </PDFDownloadLink>

</div>
      </div>
{saveSuccess && (
  <div className="mx-6 mt-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
    Investigation report saved successfully.
  </div>
)}

{saveError && (
  <div className="mx-6 mt-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
    {saveError}
  </div>
)}

      {/* ============================================================
          FULL-SCREEN PDF VIEWER
      ============================================================ */}
      <div
        className="
          flex-1
          min-h-0
          w-full
          bg-[#1f1f1f]
          overflow-hidden
        "
      >
        <PDFViewer
          width="100%"
          height="100%"
          showToolbar
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          }}
        >
          <InvestigationReportPDF
            reportData={reportData}
          />
        </PDFViewer>
      </div>

    </div>
  );
};

export default InvestigationReportPage;