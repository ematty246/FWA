import React, { useState, useEffect } from 'react';
import AssignmentIcon from '@mui/icons-material/AssignmentRounded';
import BadgeIcon from '@mui/icons-material/BadgeRounded';
import CategoryIcon from '@mui/icons-material/CategoryRounded';
import PaymentsIcon from '@mui/icons-material/PaymentsRounded';
import EventIcon from '@mui/icons-material/EventRounded';
import EventAvailableIcon from '@mui/icons-material/EventAvailableRounded';
import CakeIcon from '@mui/icons-material/CakeRounded';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeartRounded';
import LocalHospitalIcon from '@mui/icons-material/LocalHospitalRounded';
import HealingIcon from '@mui/icons-material/HealingRounded';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import PersonIcon from '@mui/icons-material/PersonRounded';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorIcon from '@mui/icons-material/ErrorOutlineRounded';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongRounded';
import {
  TextField,
  MenuItem,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { AppLogo } from '../AppLogo';
import { submitClaim } from '../../services/submissionClaimService';
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

const CLAIM_TYPES = ['Inpatient', 'Outpatient'];

// ================================================================
// Required field label — small dot instead of "*"
// ================================================================
const RequiredLabel = ({ text }) => (
  <span className="inline-flex items-center gap-1.5">
    {text}
    <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] shrink-0" />
  </span>
);

// ================================================================
// Shared MUI TextField style so inputs match ClaimGuard's theme
// ================================================================
const fieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#F4F9FD',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#0A2A4A',
    '& fieldset': {
      borderColor: '#D5E7F3',
    },
    '&:hover fieldset': {
      borderColor: '#93C5FD',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#0284C7',
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#627D98',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#0284C7',
  },
  '& .MuiInputAdornment-root': {
    color: '#627D98',
  },
};

const initialFormState = {
  claimId: '',
  claimType: '',
  beneficiaryId: '',
  claimReimbursement: '',
  claimDeductible: '',
  totalClaimCost: '',
  claimStartDate: '',
  claimEndDate: '',
  beneficiaryAge: '',
  chronicConditionCount: '',
  diagnosisCount: '',
  procedureCount: '',
  physicianCount: '',
  attendingPhysicianId: '',
  operatingPhysicianId: '',
  otherPhysicianId: '',
};

export const SubmissionClaim = () => {
  const [form, setForm] = useState(initialFormState);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!token || !user || user.role !== 'PROVIDER') {
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const requiredFields = [
    'claimId',
    'claimType',
    'beneficiaryId',
    'claimReimbursement',
    'claimDeductible',
    'totalClaimCost',
    'claimStartDate',
    'claimEndDate',
    'beneficiaryAge',
    'chronicConditionCount',
    'diagnosisCount',
    'procedureCount',
    'physicianCount',
  ];

  const requiredLabels = {
    claimId: 'Claim ID',
    claimType: 'Claim Type',
    beneficiaryId: 'Beneficiary ID',
    claimReimbursement: 'Claim Reimbursement',
    claimDeductible: 'Claim Deductible',
    totalClaimCost: 'Total Claim Cost',
    claimStartDate: 'Claim Start Date',
    claimEndDate: 'Claim End Date',
    beneficiaryAge: 'Beneficiary Age',
    chronicConditionCount: 'Chronic Condition Count',
    diagnosisCount: 'Diagnosis Count',
    procedureCount: 'Procedure Count',
    physicianCount: 'Physician Count',
  };

  const validate = () => {
    for (const field of requiredFields) {
      const value = form[field];
      if (value === '' || value === null || value === undefined) {
        return `${requiredLabels[field]} is required.`;
      }
    }
    if (form.claimEndDate && form.claimStartDate && form.claimEndDate < form.claimStartDate) {
      return 'Claim End Date cannot be before Claim Start Date.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    const payload = {
      claim_id: form.claimId.trim(),
      claim_type: form.claimType,
      beneficiary_id: form.beneficiaryId.trim(),
      claim_reimbursement: parseFloat(form.claimReimbursement),
      claim_deductible: parseFloat(form.claimDeductible),
      total_claim_cost: parseFloat(form.totalClaimCost),
      claim_start_dt: form.claimStartDate,
      claim_end_dt: form.claimEndDate,
      beneficiary_age: parseInt(form.beneficiaryAge, 10),
      chronic_condition_count: parseInt(form.chronicConditionCount, 10),
      diagnosis_count: parseInt(form.diagnosisCount, 10),
      procedure_count: parseInt(form.procedureCount, 10),
      physician_count: parseInt(form.physicianCount, 10),
      attending_physician_id: form.attendingPhysicianId.trim() || null,
      operating_physician_id: form.operatingPhysicianId.trim() || null,
      other_physician_id: form.otherPhysicianId.trim() || null,
    };

    setIsLoading(true);
    try {
      const data = await submitClaim(payload);
      setSuccessMsg(data?.message || 'Claim submitted successfully!');
      setForm(initialFormState);
    } catch (err) {
      console.error('Claim submission failed:', err);
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
  const reimbursement = parseFloat(form.claimReimbursement) || 0;
  const deductible = parseFloat(form.claimDeductible) || 0;
  const total = reimbursement + deductible;
  setForm((prev) => ({
    ...prev,
    totalClaimCost: (form.claimReimbursement || form.claimDeductible) ? total.toFixed(2) : '',
  }));
}, [form.claimReimbursement, form.claimDeductible]);

  return (
    <div className="min-h-screen bg-[#edf6ff] p-0 sm:p-4 lg:p-6 font-sans antialiased text-[#0A2A4A]">
      <div className="w-full max-w-[1000px] mx-auto min-h-[700px] bg-white rounded-none sm:rounded-[26px] shadow-[0_12px_40px_rgba(18,55,88,0.16)] overflow-hidden border border-[#d8e7f2]">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-[#f4faff] via-[#edf7ff] to-[#e1f1ff] px-8 sm:px-12 lg:px-16 py-8 sm:py-10 relative overflow-hidden border-b border-[#d8e7f2]">
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(#b8d9f2 1px, transparent 1px)`,
              backgroundSize: '26px 26px',
            }}
          />
          <div className="relative z-10 flex items-center gap-3.5">
            <AppLogo size="lg" className="shadow-lg shadow-sky-600/30" />
            <div>
              <h1 className="text-lg font-black tracking-tight text-[#102f4d] uppercase leading-none flex items-center gap-1.5">
                CLAIMGUARD <span className="text-[#38BDF8]">AI</span>
              </h1>
              <p className="text-[10px] font-bold text-[#93C5FD] tracking-widest uppercase mt-1">
                CLAIMS FRAUD INVESTIGATION SYSTEM
              </p>
            </div>
          </div>
          <div className="relative z-10 pt-8 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white text-[#087aca] flex items-center justify-center shrink-0 shadow-sm">
              <ReceiptLongIcon sx={{ fontSize: 20 }} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-[#087aca] uppercase tracking-widest block">
                Provider Portal
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#102f4d]">
                Submit a Claim
              </h2>
            </div>
          </div>
        </div>

        {/* FORM BODY */}
        <div className="px-8 sm:px-12 lg:px-16 py-8 sm:py-10">
          {errorMsg && (
            <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700">
              <ErrorIcon sx={{ fontSize: 16, color: '#f43f5e' }} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <CheckCircleIcon sx={{ fontSize: 16, color: '#059669' }} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Legend for required fields */}
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#627D98] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />
            <span>Required field</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* SECTION: Claim Details */}
            <div>
              <h3 className="text-xs font-extrabold text-[#087aca] uppercase tracking-widest mb-4 flex items-center gap-2">
                <AssignmentIcon sx={{ fontSize: 16 }} />
                Claim Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label={<RequiredLabel text="Claim ID" />}
                  fullWidth
                  size="small"
                  value={form.claimId}
                  onChange={handleChange('claimId')}
                  placeholder="CLM10006"
                  disabled={isLoading}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  select
                  label={<RequiredLabel text="Claim Type" />}
                  fullWidth
                  size="small"
                  value={form.claimType}
                  onChange={handleChange('claimType')}
                  disabled={isLoading}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CategoryIcon sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  }}
                >
                  {CLAIM_TYPES.map((type) => (
                    <MenuItem key={type} value={type} sx={{ fontSize: '0.8rem' }}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={<RequiredLabel text="Beneficiary ID" />}
                  fullWidth
                  size="small"
                  value={form.beneficiaryId}
                  onChange={handleChange('beneficiaryId')}
                  placeholder="BEN10006"
                  disabled={isLoading}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label={<RequiredLabel text="Beneficiary Age" />}
                  fullWidth
                  size="small"
                  type="number"
                  value={form.beneficiaryAge}
                  onChange={handleChange('beneficiaryAge')}
                  placeholder="70"
                  disabled={isLoading}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CakeIcon sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </div>
            </div>

            {/* SECTION: Financials */}
            <div>
              <h3 className="text-xs font-extrabold text-[#087aca] uppercase tracking-widest mb-4 flex items-center gap-2">
                <PaymentsIcon sx={{ fontSize: 16 }} />
                Financials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TextField
                  label={<RequiredLabel text="Claim Reimbursement" />}
                  fullWidth
                  size="small"
                  type="number"
                  value={form.claimReimbursement}
                  onChange={handleChange('claimReimbursement')}
                  placeholder="7500.00"
                  disabled={isLoading}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
                <TextField
                  label={<RequiredLabel text="Claim Deductible" />}
                  fullWidth
                  size="small"
                  type="number"
                  value={form.claimDeductible}
                  onChange={handleChange('claimDeductible')}
                  placeholder="1000.00"
                  disabled={isLoading}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
               <TextField
  label={<RequiredLabel text="Total Claim Cost (auto)" />}
  fullWidth
  size="small"
  type="number"
  value={form.totalClaimCost}
  disabled
  placeholder="8500.00"
  sx={fieldSx}
  InputProps={{
    readOnly: true,
    startAdornment: <InputAdornment position="start">$</InputAdornment>,
  }}
/>
              </div>
            </div>

            {/* SECTION: Claim Period */}
            <div>
              <h3 className="text-xs font-extrabold text-[#087aca] uppercase tracking-widest mb-4 flex items-center gap-2">
                <EventIcon sx={{ fontSize: 16 }} />
                Claim Period
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <TextField
  label={<RequiredLabel text="Claim Start Date" />}
  fullWidth
  size="small"
  type="date"
  value={form.claimStartDate}
  onChange={handleChange('claimStartDate')}
  disabled={isLoading}
  sx={{
    ...fieldSx,
    '& .MuiInputLabel-root': {
      ...fieldSx['& .MuiInputLabel-root'],
      position: 'relative',
      transform: 'none',
      marginBottom: '6px',
      display: 'block',
    },
    '& .MuiInputLabel-shrink': {
      transform: 'none',
    },
    '& .MuiOutlinedInput-root': {
      ...fieldSx['& .MuiOutlinedInput-root'],
      marginTop: '20px',
    },
    '& legend': {
      display: 'none',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      top: 0,
    },
  }}
  InputLabelProps={{ shrink: true }}
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <EventIcon sx={{ fontSize: 16 }} />
      </InputAdornment>
    ),
  }}
/>
               <TextField
  label={<RequiredLabel text="Claim End Date" />}
  fullWidth
  size="small"
  type="date"
  value={form.claimEndDate}
  onChange={handleChange('claimEndDate')}
  disabled={isLoading}
  sx={{
    ...fieldSx,
    '& .MuiInputLabel-root': {
      ...fieldSx['& .MuiInputLabel-root'],
      position: 'relative',
      transform: 'none',
      marginBottom: '6px',
      display: 'block',
    },
    '& .MuiInputLabel-shrink': {
      transform: 'none',
    },
    '& .MuiOutlinedInput-root': {
      ...fieldSx['& .MuiOutlinedInput-root'],
      marginTop: '20px',
    },
    '& legend': {
      display: 'none',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      top: 0,
    },
  }}
  InputLabelProps={{ shrink: true }}
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <EventAvailableIcon sx={{ fontSize: 16 }} />
      </InputAdornment>
    ),
  }}
/>
              </div>
            </div>

            {/* SECTION: Clinical Details */}
            <div>
              <h3 className="text-xs font-extrabold text-[#087aca] uppercase tracking-widest mb-4 flex items-center gap-2">
                <MonitorHeartIcon sx={{ fontSize: 16 }} />
                Clinical Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TextField
                  label={<RequiredLabel text="Chronic Condition Count" />}
                  fullWidth
                  size="small"
                  type="number"
                  value={form.chronicConditionCount}
                  onChange={handleChange('chronicConditionCount')}
                  placeholder="3"
                  disabled={isLoading}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <HealingIcon sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label={<RequiredLabel text="Diagnosis Count" />}
                  fullWidth
                  size="small"
                  type="number"
                  value={form.diagnosisCount}
                  onChange={handleChange('diagnosisCount')}
                  placeholder="5"
                  disabled={isLoading}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MonitorHeartIcon sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label={<RequiredLabel text="Procedure Count" />}
                  fullWidth
                  size="small"
                  type="number"
                  value={form.procedureCount}
                  onChange={handleChange('procedureCount')}
                  placeholder="2"
                  disabled={isLoading}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocalHospitalIcon sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </div>
            </div>

            {/* SECTION: Physicians */}
            <div>
              <h3 className="text-xs font-extrabold text-[#087aca] uppercase tracking-widest mb-4 flex items-center gap-2">
                <GroupsIcon sx={{ fontSize: 16 }} />
                Physicians
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label={<RequiredLabel text="Physician Count" />}
                  fullWidth
                  size="small"
                  type="number"
                  value={form.physicianCount}
                  onChange={handleChange('physicianCount')}
                  placeholder="2"
                  disabled={isLoading}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <GroupsIcon sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <div />
                <TextField
                  label="Attending Physician ID"
                  fullWidth
                  size="small"
                  value={form.attendingPhysicianId}
                  onChange={handleChange('attendingPhysicianId')}
                  placeholder="PHY10001 (optional)"
                  disabled={isLoading}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Operating Physician ID"
                  fullWidth
                  size="small"
                  value={form.operatingPhysicianId}
                  onChange={handleChange('operatingPhysicianId')}
                  placeholder="PHY10002 (optional)"
                  disabled={isLoading}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Other Physician ID"
                  fullWidth
                  size="small"
                  value={form.otherPhysicianId}
                  onChange={handleChange('otherPhysicianId')}
                  placeholder="PHY10003 (optional)"
                  disabled={isLoading}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </div>
            </div>

            {/* SUBMIT */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="py-3.5 px-8 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shadow-sky-600/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={14} sx={{ color: '#fff' }} />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Claim</span>
                    <ArrowForwardIcon sx={{ fontSize: 16 }} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubmissionClaim;