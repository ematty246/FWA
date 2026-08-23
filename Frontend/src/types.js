// Type definition constants and helpers for ClaimGuard AI

export const RiskLevels = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

export const ClaimTypes = {
  Inpatient: 'Inpatient',
  Outpatient: 'Outpatient'
};

export const ActionTypes = {
  IMMEDIATE_REVIEW: 'IMMEDIATE REVIEW',
  ENHANCED_REVIEW: 'ENHANCED REVIEW',
  AUTO_APPROVE: 'AUTO APPROVE'
};

export const InvestigationStatuses = {
  NEW: 'NEW',
  UNDER_REVIEW: 'UNDER_REVIEW',
  INVESTIGATING: 'INVESTIGATING',
  CONFIRMED_FRAUD: 'CONFIRMED_FRAUD',
  FALSE_POSITIVE: 'FALSE_POSITIVE',
  CLEARED: 'CLEARED'
};

export const UserRoles = {
  INVESTIGATOR: 'INVESTIGATOR',
  PROVIDER: 'PROVIDER',
  ADMIN: 'ADMIN'
};
