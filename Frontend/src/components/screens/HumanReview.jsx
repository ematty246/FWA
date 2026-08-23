import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';

import reviewService from '../../services/reviewService';
import { useReportData } from '../../context/ReportDataContext';


const DECISIONS = [
  {
    value: 'CONTINUE_REVIEW',
    label: 'Continue Review',
  },
  {
    value: 'ESCALATE',
    label: 'Escalate',
  },
  {
    value: 'REJECT',
    label: 'Reject',
  },
];


const formatDecision = (decision) => {
  if (!decision) return 'Pending';

  return decision
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};


const formatDate = (value) => {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};


const formatRisk = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return value;
  }

  return number.toFixed(2);
};

const getInvestigatorIdFromLocalStorage = () => {
  try {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      console.error('No user found in localStorage.');
      return null;
    }

    const user = JSON.parse(storedUser);

    const investigatorId = user?.investigator_id;

    if (!investigatorId) {
      console.error(
        'investigator_id not found inside localStorage.user',
        user
      );

      return null;
    }

    return String(investigatorId)
      .trim()
      .toUpperCase();

  } catch (error) {
    console.error(
      'Failed to read investigator ID from localStorage.user:',
      error
    );

    return null;
  }
};
const HumanReview = () => {
  const navigate = useNavigate();
const { setInvestigationRecord } = useReportData();
  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');
const [currentInvestigatorId, setCurrentInvestigatorId] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');

  const [savingDecision, setSavingDecision] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [decisionError, setDecisionError] = useState('');

  const [openingReport, setOpeningReport] = useState(false);


  useEffect(() => {
  try {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      console.error('No user found in localStorage.');
      return;
    }

    const user = JSON.parse(storedUser);

    const investigatorId = user?.investigator_id;

    if (investigatorId) {
      setCurrentInvestigatorId(
        String(investigatorId).trim().toUpperCase()
      );

      console.log(
        'Current Investigator ID:',
        String(investigatorId).trim().toUpperCase()
      );
    } else {
      console.error(
        'investigator_id not found inside localStorage.user'
      );
    }
  } catch (error) {
    console.error(
      'Failed to load investigator ID:',
      error
    );
  }
}, []);
  // ============================================================
  // LOAD INVESTIGATION RECORDS
  // ============================================================

  const loadRecords = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const data =
        await reviewService.getInvestigationRecords();

      /*
       * Backend may return:
       *
       * [
       *   {...},
       *   {...}
       * ]
       *
       * or
       *
       * {
       *   records: [...]
       * }
       */

      const normalizedRecords =
        Array.isArray(data)
          ? data
          : data?.records || [];

      setRecords(normalizedRecords);

    } catch (err) {

      console.error(
        'Failed to load investigation records:',
        err
      );

      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Unable to load investigation records.';

      setError(
        typeof message === 'string'
          ? message
          : 'Unable to load investigation records.'
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    loadRecords();
  }, []);


  // ============================================================
  // SELECT RECORD
  // ============================================================

    const handleSelectRecord = (record) => {
    setSelectedRecord(record);

    setDecision(
      record?.decision || ''
    );

    setReason(
      record?.reason || ''
    );

    setSuccessMessage('');
    setDecisionError('');

    // NEW — expose selected record's field:value data to the chatbot
    setInvestigationRecord({
      investigation_id: record?.investigation_id,
      provider_id: record?.provider_id,
      overall_fwa_risk: record?.overall_fwa_risk,
      decision: record?.decision,
      reason: record?.reason,
      decision_by: record?.decision_by,
      decision_at: record?.decision_at,
      created_at: record?.created_at,
      updated_at: record?.updated_at,
      summary_document_url: record?.summary_document_url,
    });
  };
  // ============================================================
  // VIEW PRIVATE REPORT
  // ============================================================

  const handleViewReport = async (record) => {
    try {

      setOpeningReport(true);
      setDecisionError('');

      const result =
        await reviewService.getReportUrl(
          record.investigation_id
        );

      if (!result?.signed_url) {
        throw new Error(
          'Report URL was not returned.'
        );
      }

      /*
       * signed_url is temporary.
       *
       * The Supabase bucket remains PRIVATE.
       * Backend creates the temporary signed URL.
       */

      window.open(
        result.signed_url,
        '_blank',
        'noopener,noreferrer'
      );

    } catch (err) {

      console.error(
        'Failed to open investigation report:',
        err
      );

      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Unable to open investigation report.';

      setDecisionError(
        typeof message === 'string'
          ? message
          : 'Unable to open investigation report.'
      );

    } finally {
      setOpeningReport(false);
    }
  };


  // ============================================================
  // SAVE DECISION
  // ============================================================

 const handleDecisionSubmit = async () => {
  if (!selectedRecord) {
    setDecisionError('Please select an investigation.');
    return;
  }

  if (!decision) {
    setDecisionError('Please select a decision.');
    return;
  }

  // ============================================================
  // GET INVESTIGATOR ID FROM LOGGED-IN USER
  // ============================================================

  const investigatorId =
    getInvestigatorIdFromLocalStorage();

  if (!investigatorId) {
    setDecisionError(
      'Investigator ID not found in local storage. Please log in again.'
    );

    console.error(
      'Investigator ID missing from localStorage.user'
    );

    return;
  }

  console.log(
    'Investigator ID used for decision:',
    investigatorId
  );

  try {
    setSavingDecision(true);
    setDecisionError('');
    setSuccessMessage('');

    const result =
      await reviewService.makeDecision({
        investigationId:
          selectedRecord.investigation_id,

        investigatorId: investigatorId,

        decision: decision,

        reason:
          reason?.trim() || null,
      });

    console.log(
      'Investigation decision saved:',
      result
    );

    setSuccessMessage(
      'Investigation decision saved successfully.'
    );

    // ============================================================
    // UPDATE TABLE IMMEDIATELY
    // ============================================================

    const updatedRecord =
      result?.record ||
      result;

    setRecords((previousRecords) =>
      previousRecords.map((record) =>
        record.investigation_id ===
        selectedRecord.investigation_id
          ? {
              ...record,
              ...updatedRecord,

              decision,

              reason:
                reason?.trim() || null,

              decision_by:
                investigatorId,

              decision_at:
                updatedRecord?.decision_at ??
                new Date().toISOString(),
            }
          : record
      )
    );

    // ============================================================
    // UPDATE SELECTED RECORD
    // ============================================================

    setSelectedRecord((previous) =>
      previous
        ? {
            ...previous,
            ...updatedRecord,

            decision,

            reason:
              reason?.trim() || null,

            decision_by:
              investigatorId,

            decision_at:
              updatedRecord?.decision_at ??
              new Date().toISOString(),
          }
        : previous
    );

  } catch (err) {

    console.error(
      'Failed to save investigation decision:',
      err
    );

    const message =
      err?.response?.data?.detail ||
      err?.message ||
      'Unable to save investigation decision.';

    setDecisionError(
      typeof message === 'string'
        ? message
        : 'Unable to save investigation decision.'
    );

  } finally {

    setSavingDecision(false);
  }
};

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="h-full min-h-[calc(100vh-5rem)] bg-[#EAF4FA] flex items-center justify-center">

        <div className="bg-white rounded-2xl border border-[#D5E7F3] px-8 py-7 shadow-sm text-center">

          <div className="animate-spin w-8 h-8 border-4 border-[#BAE6FD] border-t-[#0284C7] rounded-full mx-auto mb-4" />

          <p className="text-sm font-bold text-[#0A2A4A]">
            Loading investigation records...
          </p>

          <p className="text-xs text-[#627D98] mt-1">
            Retrieving your investigation records
          </p>

        </div>

      </div>
    );
  }


  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="h-full min-h-[calc(100vh-5rem)] bg-[#EAF4FA] text-[#0A2A4A] p-6 overflow-y-auto">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="bg-gradient-to-r from-[#0A2A4A] via-[#0369A1] to-[#0284C7] rounded-2xl px-6 py-5 shadow-sm border border-[#C6E2F5]">

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-xl font-black text-white">
              Human Review
            </h1>

            <p className="text-xs text-sky-100/80 mt-1">
              Review investigation records and make final decisions
            </p>

          </div>

          <button
            type="button"
            onClick={() => loadRecords(true)}
            disabled={refreshing}
            className="
              flex
              items-center
              gap-2
              px-4
              py-2
              rounded-xl
              bg-white/10
              border
              border-white/20
              text-white
              text-xs
              font-bold
              hover:bg-white/20
              disabled:opacity-50
              transition
            "
          >

            <RefreshRoundedIcon
              sx={{
                fontSize: 17,
                ...(refreshing
                  ? {
                      animation:
                        'spin 1s linear infinite',
                    }
                  : {}),
              }}
            />

            {refreshing
              ? 'Refreshing...'
              : 'Refresh'}

          </button>

        </div>

      </div>


      {/* ========================================================
          ERROR
      ======================================================== */}

      {error && (
        <div className="mt-4 px-5 py-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">

          {error}

        </div>
      )}


      {/* ========================================================
          SUCCESS
      ======================================================== */}

      {successMessage && (
        <div className="mt-4 px-5 py-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">

          {successMessage}

        </div>
      )}


      {/* ========================================================
          RECORD COUNT
      ======================================================== */}

      <div className="mt-5 flex items-center justify-between">

        <div>

          <h2 className="text-sm font-black text-[#0A2A4A]">
            Investigation Records
          </h2>

          <p className="text-xs text-[#627D98] mt-1">
            {records.length} investigation
            {records.length === 1 ? '' : 's'} found
          </p>

        </div>

      </div>


      {/* ========================================================
          TABLE
      ======================================================== */}

      <div className="mt-4 bg-white rounded-2xl border border-[#D5E7F3] shadow-sm overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full text-left">

            <thead className="bg-[#F3F8FC] border-b border-[#D5E7F3]">

              <tr>

                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wide text-[#486581]">
                  Investigation ID
                </th>

                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wide text-[#486581]">
                  Provider ID
                </th>

                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wide text-[#486581]">
                  Overall FWA Risk
                </th>

                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wide text-[#486581]">
                  Decision
                </th>

                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wide text-[#486581]">
                  Report
                </th>

                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wide text-[#486581]">
                  Updated
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-[#E6EEF5]">

              {records.length === 0 ? (

                <tr>

                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center"
                  >

                    <DescriptionRoundedIcon
                      sx={{
                        fontSize: 40,
                        color: '#94A3B8',
                      }}
                    />

                    <p className="text-sm font-bold text-[#486581] mt-3">
                      No investigation records found
                    </p>

                    <p className="text-xs text-[#829AB1] mt-1">
                      Saved investigation reports will appear here.
                    </p>

                  </td>

                </tr>

              ) : (

                records.map((record) => (

                  <tr
                    key={record.investigation_id}
                    className={`
                      hover:bg-[#F8FBFD]
                      transition
                      ${
                        selectedRecord?.investigation_id ===
                        record.investigation_id
                          ? 'bg-[#EFF8FF]'
                          : ''
                      }
                    `}
                  >

                    <td className="px-5 py-4">

                      <button
                        type="button"
                        onClick={() =>
                          handleSelectRecord(record)
                        }
                        className="text-sm font-bold text-[#0284C7] hover:text-[#0369A1]"
                      >
                        {record.investigation_id}
                      </button>

                    </td>


                    <td className="px-5 py-4 text-sm font-semibold text-[#334E68]">
                      {record.provider_id || '—'}
                    </td>


                    <td className="px-5 py-4">

                      <span className="inline-flex px-3 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-black">
                        {formatRisk(
                          record.overall_fwa_risk
                        )}
                      </span>

                    </td>


                    <td className="px-5 py-4">

                      {record.decision ? (

                        <span className="inline-flex px-3 py-1 rounded-lg bg-sky-50 text-[#0369A1] text-xs font-black">
                          {formatDecision(
                            record.decision
                          )}
                        </span>

                      ) : (

                        <span className="inline-flex px-3 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-black">
                          Pending
                        </span>

                      )}

                    </td>


                    <td className="px-5 py-4">

                      {record.summary_document_url ? (

                        <button
                          type="button"
                          onClick={() =>
                            handleViewReport(record)
                          }
                          disabled={openingReport}
                          className="
                            inline-flex
                            items-center
                            gap-2
                            px-3
                            py-2
                            rounded-lg
                            bg-[#E0F2FE]
                            text-[#0369A1]
                            text-xs
                            font-black
                            hover:bg-[#BAE6FD]
                            disabled:opacity-50
                            transition
                          "
                        >

                          <VisibilityRoundedIcon
                            sx={{ fontSize: 16 }}
                          />

                          {openingReport
                            ? 'Opening...'
                            : 'View Report'}

                        </button>

                      ) : (

                        <span className="text-xs text-[#829AB1]">
                          Not generated
                        </span>

                      )}

                    </td>


                    <td className="px-5 py-4 text-xs text-[#627D98]">
                      {formatDate(
                        record.updated_at
                      )}
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* ========================================================
          DECISION PANEL
      ======================================================== */}

      {selectedRecord && (

        <div className="mt-5 bg-white rounded-2xl border border-[#D5E7F3] shadow-sm overflow-hidden">

          {/* Panel header */}

          <div className="px-6 py-5 bg-[#F3F8FC] border-b border-[#D5E7F3]">

            <div className="flex items-center justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <GavelRoundedIcon
                    sx={{
                      fontSize: 21,
                      color: '#0284C7',
                    }}
                  />

                  <h2 className="text-base font-black text-[#0A2A4A]">
                    Investigation Decision
                  </h2>

                </div>

                <p className="text-xs text-[#627D98] mt-1">
                  {selectedRecord.investigation_id}
                  {' · '}
                  {selectedRecord.provider_id}
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  handleViewReport(selectedRecord)
                }
                disabled={openingReport}
                className="
                  flex
                  items-center
                  gap-2
                  px-4
                  py-2
                  rounded-xl
                  bg-[#0284C7]
                  text-white
                  text-xs
                  font-black
                  hover:bg-[#0369A1]
                  disabled:opacity-50
                  transition
                "
              >

                <VisibilityRoundedIcon
                  sx={{ fontSize: 17 }}
                />

                View Private Report

              </button>

            </div>

          </div>


          <div className="p-6">

            {/* Current values */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

              <div className="rounded-xl border border-[#D5E7F3] bg-[#F8FBFD] p-4">

                <p className="text-[10px] font-black uppercase tracking-wide text-[#829AB1]">
                  Investigator ID
                </p>

               <p className="mt-2 text-sm font-black text-[#0A2A4A]">
  {currentInvestigatorId || '—'}
</p>

              </div>


              <div className="rounded-xl border border-[#D5E7F3] bg-[#F8FBFD] p-4">

                <p className="text-[10px] font-black uppercase tracking-wide text-[#829AB1]">
                  Overall FWA Risk
                </p>

                <p className="mt-2 text-lg font-black text-[#DC2626]">
                  {formatRisk(
                    selectedRecord.overall_fwa_risk
                  )}
                </p>

              </div>


              <div className="rounded-xl border border-[#D5E7F3] bg-[#F8FBFD] p-4">

                <p className="text-[10px] font-black uppercase tracking-wide text-[#829AB1]">
                  Current Decision
                </p>

                <p className="mt-2 text-sm font-black text-[#0369A1]">
                  {formatDecision(
                    selectedRecord.decision
                  )}
                </p>

              </div>

            </div>


            {/* Decision */}

            <div className="mb-5">

              <label className="block text-xs font-black text-[#334E68] mb-2">
                Decision
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                {DECISIONS.map((item) => {

                  const active =
                    decision === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setDecision(item.value)
                      }
                      className={`
                        px-4
                        py-3
                        rounded-xl
                        border
                        text-sm
                        font-black
                        transition
                        ${
                          active
                            ? 'border-[#0284C7] bg-[#E0F2FE] text-[#0369A1]'
                            : 'border-[#D5E7F3] bg-white text-[#486581] hover:bg-[#F8FBFD]'
                        }
                      `}
                    >
                      {item.label}
                    </button>
                  );

                })}

              </div>

            </div>


            {/* Reason */}

            <div className="mb-5">

              <label className="block text-xs font-black text-[#334E68] mb-2">
                Reason
                <span className="ml-1 text-[#829AB1] font-normal">
                  (Optional)
                </span>
              </label>

              <textarea
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value)
                }
                placeholder="Enter the reason for your decision..."
                rows={4}
                className="
                  w-full
                  px-4
                  py-3
                  rounded-xl
                  border
                  border-[#D5E7F3]
                  bg-white
                  text-sm
                  text-[#334E68]
                  outline-none
                  focus:border-[#0284C7]
                  focus:ring-2
                  focus:ring-[#BAE6FD]
                  resize-none
                "
              />

            </div>


            {/* Decision error */}

            {decisionError && (

              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                {decisionError}
              </div>

            )}


            {/* Audit information */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

              <div>

                <p className="text-[10px] font-black uppercase tracking-wide text-[#829AB1]">
                  Created At
                </p>

                <p className="text-xs font-semibold text-[#486581] mt-1">
                  {formatDate(
                    selectedRecord.created_at
                  )}
                </p>

              </div>


              <div>

                <p className="text-[10px] font-black uppercase tracking-wide text-[#829AB1]">
                  Decision By
                </p>

                <p className="text-xs font-semibold text-[#486581] mt-1">
                  {recordValue(
                    selectedRecord.decision_by
                  )}
                </p>

              </div>


              <div>

                <p className="text-[10px] font-black uppercase tracking-wide text-[#829AB1]">
                  Decision At
                </p>

                <p className="text-xs font-semibold text-[#486581] mt-1">
                  {formatDate(
                    selectedRecord.decision_at
                  )}
                </p>

              </div>

            </div>


            {/* Save */}

            <div className="flex justify-end">

              <button
                type="button"
                onClick={handleDecisionSubmit}
                disabled={
                  savingDecision ||
                  !decision
                }
                className="
                  flex
                  items-center
                  gap-2
                  px-6
                  py-3
                  rounded-xl
                  bg-[#0284C7]
                  text-white
                  text-sm
                  font-black
                  hover:bg-[#0369A1]
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  transition
                  shadow-sm
                "
              >

                <GavelRoundedIcon
                  sx={{ fontSize: 18 }}
                />

                {savingDecision
                  ? 'Saving Decision...'
                  : 'Save Decision'}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};


// ============================================================
// SAFE VALUE
// ============================================================

const recordValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—';
  }

  return value;
};


export default HumanReview;