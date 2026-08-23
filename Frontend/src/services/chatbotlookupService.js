import { supabase } from '../lib/supabase';

/* ============================================================
   ID PATTERNS

   Real schema notes:
   - providers.provider_id / provider_risk.provider_id / etc
     are TEXT (e.g. "PRV51001") — matched below.
   - investigations.investigation_id is a UUID (auto-generated),
     NOT a human-typed code — users won't type these directly,
     so we don't try to regex-match UUIDs from chat.
   - investigation_records.investigation_id is TEXT and IS
     something a user could plausibly type/reference (it's the
     human-review record id) — matched below.
   - provider_claims.claim_id is TEXT (e.g. "CLM100234").
   ============================================================ */

const ID_PATTERNS = {
  provider: /\bPRV[A-Z0-9]+\b/gi,
  claim: /\bCLM[A-Z0-9]+\b/gi,
  investigationRecord: /\bINV[A-Z0-9]+\b/gi,
};

const extractIds = (text, pattern) => {
  const matches = text.match(pattern) || [];
  return [...new Set(matches.map((id) => id.toUpperCase()))];
};

/* ============================================================
   LOOKUP ENTITIES MENTIONED IN QUESTION

   Queries only the tables/columns that actually exist in the
   schema. Every query is wrapped so one failure doesn't kill
   the others.
   ============================================================ */

export async function lookupEntitiesInQuestion(question) {
  const results = {
    providerRisk: [],
    providerFeatures: [],
    providerClaimSummary: [],
    claims: [],
    investigationRecords: [],
    investigations: [],
    errors: [],
  };

  if (!question || typeof question !== 'string') {
    return results;
  }

  const providerIds = extractIds(question, ID_PATTERNS.provider);
  const claimIds = extractIds(question, ID_PATTERNS.claim);
  const investigationRecordIds = extractIds(
    question,
    ID_PATTERNS.investigationRecord
  );

  /* ----------------------------------------------------------
     PROVIDER RISK
     provider_risk: no total_claims / no provider_name column
     ---------------------------------------------------------- */
  if (providerIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from('provider_risk')
        .select(
          `
          provider_id,
          fraud_risk_score,
          waste_risk_score,
          abuse_risk_score,
          overall_fwa_score,
          fwa_risk_level,
          anomalous_claims,
          maximum_claim_anomaly_score,
          investigation_priority_score,
          investigation_priority,
          updated_at
          `
        )
        .in('provider_id', providerIds);

      if (error) {
        results.errors.push(`provider_risk lookup failed: ${error.message}`);
      } else {
        results.providerRisk = data || [];
      }
    } catch (err) {
      results.errors.push(`provider_risk lookup failed: ${err.message}`);
    }

    /* --------------------------------------------------------
       PROVIDER CLAIM SUMMARY (total_claims lives here, not on
       provider_risk)
       -------------------------------------------------------- */
    try {
      const { data, error } = await supabase
        .from('provider_claim_summary')
        .select(
          `
          provider_id,
          total_claims,
          very_high_risk_claims,
          high_risk_claims,
          medium_risk_claims,
          low_risk_claims,
          updated_at
          `
        )
        .in('provider_id', providerIds);

      if (error) {
        results.errors.push(
          `provider_claim_summary lookup failed: ${error.message}`
        );
      } else {
        results.providerClaimSummary = data || [];
      }
    } catch (err) {
      results.errors.push(
        `provider_claim_summary lookup failed: ${err.message}`
      );
    }

    /* --------------------------------------------------------
       PROVIDER FEATURES (peer group / peer comparison stats)
       -------------------------------------------------------- */
    try {
      const { data, error } = await supabase
        .from('provider_features')
        .select(
          `
          provider_id,
          total_beneficiaries,
          average_claim_reimbursement,
          peer_group,
          total_claims,
          claims_per_beneficiary,
          reimbursement_per_beneficiary,
          average_claim_reimbursement_peer_mean,
          claims_per_beneficiary_peer_mean,
          reimbursement_per_beneficiary_peer_mean,
          average_claim_reimbursement_peer_zscore,
          claims_per_beneficiary_peer_zscore,
          reimbursement_per_beneficiary_peer_zscore
          `
        )
        .in('provider_id', providerIds);

      if (error) {
        results.errors.push(
          `provider_features lookup failed: ${error.message}`
        );
      } else {
        results.providerFeatures = data || [];
      }
    } catch (err) {
      results.errors.push(`provider_features lookup failed: ${err.message}`);
    }

    /* --------------------------------------------------------
       INVESTIGATIONS for this provider (queue status/assignment)
       investigations.provider_id is TEXT — filterable directly.
       assigned_investigator_id is a UUID FK to investigators;
       resolve to investigator name/email separately.
       -------------------------------------------------------- */
    try {
      const { data, error } = await supabase
        .from('investigations')
        .select(
          `
          investigation_id,
          provider_id,
          assigned_investigator_id,
          status,
          assigned_at,
          created_at,
          updated_at,
          investigators ( full_name, email )
          `
        )
        .in('provider_id', providerIds);

      if (error) {
        results.errors.push(`investigations lookup failed: ${error.message}`);
      } else {
        results.investigations = data || [];
      }
    } catch (err) {
      results.errors.push(`investigations lookup failed: ${err.message}`);
    }
  }

  /* ----------------------------------------------------------
     CLAIMS
     provider_claims uses claim_start_dt (not claim_start_date)
     and claim_reimbursement (not total via alias) — select the
     real columns.
     ---------------------------------------------------------- */
  if (claimIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from('provider_claims')
        .select(
          `
          claim_id,
          provider_id,
          claim_type,
          claim_start_dt,
          total_claim_cost,
          claim_duration,
          beneficiary_age,
          claim_risk_tier,
          claim_anomaly_score,
          diagnosis_count,
          procedure_count,
          physician_count,
          claim_reimbursement
          `
        )
        .in('claim_id', claimIds);

      if (error) {
        results.errors.push(`provider_claims lookup failed: ${error.message}`);
      } else {
        results.claims = data || [];
      }
    } catch (err) {
      results.errors.push(`provider_claims lookup failed: ${err.message}`);
    }
  }

  /* ----------------------------------------------------------
     INVESTIGATION RECORDS (Human Review decisions)
     This is the TEXT investigation_id table, e.g. "INV1002".
     ---------------------------------------------------------- */
  if (investigationRecordIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from('investigation_records')
        .select(
          `
          investigation_id,
          investigator_id,
          provider_id,
          overall_fwa_risk,
          summary_document_url,
          decision,
          reason,
          decision_by,
          decision_at,
          created_at,
          updated_at
          `
        )
        .in('investigation_id', investigationRecordIds);

      if (error) {
        results.errors.push(
          `investigation_records lookup failed: ${error.message}`
        );
      } else {
        results.investigationRecords = data || [];
      }
    } catch (err) {
      results.errors.push(
        `investigation_records lookup failed: ${err.message}`
      );
    }
  }

  return results;
}

/* ============================================================
   DASHBOARD-LEVEL / AGGREGATE QUESTIONS

   For questions like "how many high risk claims are there
   overall" or "what's the average fwa risk" that aren't tied
   to one provider, hit the existing dashboard views directly
   so the chatbot can answer portfolio-wide questions live too,
   not just whatever ExecutiveDashboard happened to load earlier.
   ============================================================ */

const AGGREGATE_KEYWORDS = {
  totalClaims: ['total claims', 'how many claims', 'number of claims'],
  highRiskClaims: ['high risk claims', 'high-risk claims'],
  totalReimbursement: ['total reimbursement', 'total exposure', 'financial exposure'],
  averageFwaRisk: ['average fwa', 'average risk', 'avg fwa'],
  openInvestigations: ['open investigation', 'active investigation'],
  providerRiskDistribution: ['provider risk distribution', 'providers by risk', 'provider risk breakdown'],
  claimRiskDistribution: ['claim risk distribution', 'claims by risk', 'claim risk breakdown', 'claim risk tier'],
  claimTrend: ['trend', 'over time', 'monthly', 'by month'],
};

const questionMentions = (question, keywords) => {
  const lower = question.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
};

export async function lookupAggregatesInQuestion(question) {
  const results = {};
  const errors = [];

  if (!question) return { results, errors };

  const needs = {
    totalClaims: questionMentions(question, AGGREGATE_KEYWORDS.totalClaims),
    highRiskClaims: questionMentions(question, AGGREGATE_KEYWORDS.highRiskClaims),
    totalReimbursement: questionMentions(question, AGGREGATE_KEYWORDS.totalReimbursement),
    averageFwaRisk: questionMentions(question, AGGREGATE_KEYWORDS.averageFwaRisk),
    openInvestigations: questionMentions(question, AGGREGATE_KEYWORDS.openInvestigations),
    providerRiskDistribution: questionMentions(question, AGGREGATE_KEYWORDS.providerRiskDistribution),
    claimRiskDistribution: questionMentions(question, AGGREGATE_KEYWORDS.claimRiskDistribution),
    claimTrend: questionMentions(question, AGGREGATE_KEYWORDS.claimTrend),
  };

  const anyNeeded = Object.values(needs).some(Boolean);
  if (!anyNeeded) return { results, errors };

  const tasks = [];

  if (needs.totalClaims) {
    tasks.push(
      supabase.from('v_dashboard_total_claims').select('total_claims').single()
        .then(({ data, error }) => {
          if (error) errors.push(`total_claims: ${error.message}`);
          else results.totalClaims = data?.total_claims;
        })
    );
  }

  if (needs.highRiskClaims) {
    tasks.push(
      supabase.from('v_dashboard_high_risk_claims').select('high_risk_claims').single()
        .then(({ data, error }) => {
          if (error) errors.push(`high_risk_claims: ${error.message}`);
          else results.highRiskClaims = data?.high_risk_claims;
        })
    );
  }

  if (needs.totalReimbursement) {
    tasks.push(
      supabase.from('v_dashboard_total_reimbursement').select('total_reimbursement').single()
        .then(({ data, error }) => {
          if (error) errors.push(`total_reimbursement: ${error.message}`);
          else results.totalReimbursement = data?.total_reimbursement;
        })
    );
  }

  if (needs.averageFwaRisk) {
    tasks.push(
      supabase.from('v_dashboard_average_fwa_risk').select('average_fwa_risk').single()
        .then(({ data, error }) => {
          if (error) errors.push(`average_fwa_risk: ${error.message}`);
          else results.averageFwaRisk = data?.average_fwa_risk;
        })
    );
  }

  if (needs.openInvestigations) {
    tasks.push(
      supabase.from('v_dashboard_open_investigations').select('open_investigations').single()
        .then(({ data, error }) => {
          if (error) errors.push(`open_investigations: ${error.message}`);
          else results.openInvestigations = data?.open_investigations;
        })
    );
  }

  if (needs.providerRiskDistribution) {
    tasks.push(
      supabase.from('v_dashboard_provider_risk').select('risk_level, provider_count')
        .then(({ data, error }) => {
          if (error) errors.push(`provider_risk_distribution: ${error.message}`);
          else results.providerRiskDistribution = data || [];
        })
    );
  }

  if (needs.claimRiskDistribution) {
    tasks.push(
      supabase.from('v_dashboard_claim_risk').select('claim_risk_tier, claim_count')
        .then(({ data, error }) => {
          if (error) errors.push(`claim_risk_distribution: ${error.message}`);
          else results.claimRiskDistribution = data || [];
        })
    );
  }

  if (needs.claimTrend) {
    tasks.push(
      supabase.from('v_dashboard_claim_trend').select('month, total_claim_count, total_reimbursement').order('month', { ascending: true })
        .then(({ data, error }) => {
          if (error) errors.push(`claim_trend: ${error.message}`);
          else results.claimTrend = data || [];
        })
    );
  }

  await Promise.all(tasks);

  return { results, errors };
}

/* ============================================================
   FORMAT ENTITY LOOKUP RESULTS INTO PLAIN CONTEXT TEXT
   ============================================================ */

export function buildDbLookupText(lookup) {
  if (!lookup) return '';

  const {
    providerRisk,
    providerFeatures,
    providerClaimSummary,
    claims,
    investigationRecords,
    investigations,
    errors,
  } = lookup;

  const hasAnything =
    providerRisk?.length ||
    providerFeatures?.length ||
    providerClaimSummary?.length ||
    claims?.length ||
    investigationRecords?.length ||
    investigations?.length ||
    errors?.length;

  if (!hasAnything) return '';

  const lines = [];
  lines.push('\nLIVE DATABASE LOOKUP (fetched just now for this question)');
  lines.push('---------------------------------------------------------');

  if (providerRisk?.length) {
    lines.push('\nPROVIDER RISK:');
    providerRisk.forEach((p) => {
      lines.push(`- provider_id: ${p.provider_id}`);
      lines.push(`  overall_fwa_score: ${p.overall_fwa_score ?? '—'}`);
      lines.push(`  fwa_risk_level: ${p.fwa_risk_level ?? '—'}`);
      lines.push(`  fraud_risk_score: ${p.fraud_risk_score ?? '—'}`);
      lines.push(`  waste_risk_score: ${p.waste_risk_score ?? '—'}`);
      lines.push(`  abuse_risk_score: ${p.abuse_risk_score ?? '—'}`);
      lines.push(`  anomalous_claims: ${p.anomalous_claims ?? '—'}`);
      lines.push(`  maximum_claim_anomaly_score: ${p.maximum_claim_anomaly_score ?? '—'}`);
      lines.push(`  investigation_priority: ${p.investigation_priority ?? '—'}`);
      lines.push(`  investigation_priority_score: ${p.investigation_priority_score ?? '—'}`);
      lines.push(`  updated_at: ${p.updated_at ?? '—'}`);
    });
  }

  if (providerClaimSummary?.length) {
    lines.push('\nPROVIDER CLAIM SUMMARY:');
    providerClaimSummary.forEach((s) => {
      lines.push(`- provider_id: ${s.provider_id}`);
      lines.push(`  total_claims: ${s.total_claims ?? 0}`);
      lines.push(`  very_high_risk_claims: ${s.very_high_risk_claims ?? 0}`);
      lines.push(`  high_risk_claims: ${s.high_risk_claims ?? 0}`);
      lines.push(`  medium_risk_claims: ${s.medium_risk_claims ?? 0}`);
      lines.push(`  low_risk_claims: ${s.low_risk_claims ?? 0}`);
    });
  }

  if (providerFeatures?.length) {
    lines.push('\nPROVIDER FEATURES / PEER DATA:');
    providerFeatures.forEach((f) => {
      lines.push(`- provider_id: ${f.provider_id}`);
      lines.push(`  peer_group: ${f.peer_group ?? '—'}`);
      lines.push(`  total_beneficiaries: ${f.total_beneficiaries ?? '—'}`);
      lines.push(`  total_claims: ${f.total_claims ?? '—'}`);
      lines.push(`  average_claim_reimbursement: ${f.average_claim_reimbursement ?? '—'}`);
      lines.push(`  claims_per_beneficiary: ${f.claims_per_beneficiary ?? '—'} (peer mean: ${f.claims_per_beneficiary_peer_mean ?? '—'}, z-score: ${f.claims_per_beneficiary_peer_zscore ?? '—'})`);
      lines.push(`  reimbursement_per_beneficiary: ${f.reimbursement_per_beneficiary ?? '—'} (peer mean: ${f.reimbursement_per_beneficiary_peer_mean ?? '—'}, z-score: ${f.reimbursement_per_beneficiary_peer_zscore ?? '—'})`);
      lines.push(`  average_claim_reimbursement_peer_mean: ${f.average_claim_reimbursement_peer_mean ?? '—'} (z-score: ${f.average_claim_reimbursement_peer_zscore ?? '—'})`);
    });
  }

  if (investigations?.length) {
    lines.push('\nINVESTIGATION QUEUE ENTRIES:');
    investigations.forEach((i) => {
      const investigatorName =
        i.investigators?.full_name || i.investigators?.email || null;
      lines.push(`- investigation_id: ${i.investigation_id}`);
      lines.push(`  provider_id: ${i.provider_id}`);
      lines.push(`  status: ${i.status}`);
      lines.push(`  assigned_to: ${investigatorName ?? (i.assigned_investigator_id ? i.assigned_investigator_id : 'Unassigned')}`);
      lines.push(`  assigned_at: ${i.assigned_at ?? '—'}`);
      lines.push(`  created_at: ${i.created_at ?? '—'}`);
    });
  }

  if (claims?.length) {
    lines.push('\nCLAIMS:');
    claims.forEach((c) => {
      lines.push(`- claim_id: ${c.claim_id}`);
      lines.push(`  provider_id: ${c.provider_id ?? '—'}`);
      lines.push(`  claim_type: ${c.claim_type ?? '—'}`);
      lines.push(`  claim_start_dt: ${c.claim_start_dt ?? '—'}`);
      lines.push(`  total_claim_cost: ${c.total_claim_cost ?? '—'}`);
      lines.push(`  claim_reimbursement: ${c.claim_reimbursement ?? '—'}`);
      lines.push(`  claim_duration: ${c.claim_duration ?? '—'}`);
      lines.push(`  beneficiary_age: ${c.beneficiary_age ?? '—'}`);
      lines.push(`  claim_risk_tier: ${c.claim_risk_tier ?? '—'}`);
      lines.push(`  claim_anomaly_score: ${c.claim_anomaly_score ?? '—'}`);
      lines.push(`  diagnosis_count: ${c.diagnosis_count ?? '—'}`);
      lines.push(`  procedure_count: ${c.procedure_count ?? '—'}`);
      lines.push(`  physician_count: ${c.physician_count ?? '—'}`);
    });
  }

  if (investigationRecords?.length) {
    lines.push('\nHUMAN REVIEW RECORDS:');
    investigationRecords.forEach((r) => {
      lines.push(`- investigation_id: ${r.investigation_id}`);
      lines.push(`  provider_id: ${r.provider_id}`);
      lines.push(`  investigator_id: ${r.investigator_id}`);
      lines.push(`  overall_fwa_risk: ${r.overall_fwa_risk}`);
      lines.push(`  decision: ${r.decision ?? 'Pending'}`);
      lines.push(`  reason: ${r.reason ?? '—'}`);
      lines.push(`  decision_by: ${r.decision_by ?? '—'}`);
      lines.push(`  decision_at: ${r.decision_at ?? '—'}`);
      lines.push(`  summary_document_url: ${r.summary_document_url ? 'available' : 'not generated'}`);
      lines.push(`  created_at: ${r.created_at}`);
      lines.push(`  updated_at: ${r.updated_at}`);
    });
  }

  if (errors?.length) {
    lines.push('\nLOOKUP ERRORS (mention plainly if relevant to the question):');
    errors.forEach((e) => lines.push(`- ${e}`));
  }

  return lines.join('\n');
}

/* ============================================================
   FORMAT AGGREGATE RESULTS INTO PLAIN CONTEXT TEXT
   ============================================================ */

export function buildAggregateLookupText(aggregateLookup) {
  if (!aggregateLookup) return '';
  const { results, errors } = aggregateLookup;

  const hasAnything = Object.keys(results || {}).length || errors?.length;
  if (!hasAnything) return '';

  const lines = [];
  lines.push('\nLIVE PORTFOLIO-WIDE DATABASE LOOKUP (fetched just now)');
  lines.push('---------------------------------------------------------');

  if (results.totalClaims !== undefined) lines.push(`total_claims: ${results.totalClaims}`);
  if (results.highRiskClaims !== undefined) lines.push(`high_risk_claims: ${results.highRiskClaims}`);
  if (results.totalReimbursement !== undefined) lines.push(`total_reimbursement: ${results.totalReimbursement}`);
  if (results.averageFwaRisk !== undefined) lines.push(`average_fwa_risk: ${results.averageFwaRisk}`);
  if (results.openInvestigations !== undefined) lines.push(`open_investigations: ${results.openInvestigations}`);

  if (results.providerRiskDistribution?.length) {
    lines.push('provider_risk_distribution:');
    results.providerRiskDistribution.forEach((r) => {
      lines.push(`  - ${r.risk_level}: ${r.provider_count} providers`);
    });
  }

  if (results.claimRiskDistribution?.length) {
    lines.push('claim_risk_distribution:');
    results.claimRiskDistribution.forEach((r) => {
      lines.push(`  - ${r.claim_risk_tier}: ${r.claim_count} claims`);
    });
  }

  if (results.claimTrend?.length) {
    lines.push('claim_trend (by month):');
    results.claimTrend.forEach((t) => {
      lines.push(`  - ${t.month}: ${t.total_claim_count} claims, reimbursement=${t.total_reimbursement}`);
    });
  }

  if (errors?.length) {
    lines.push('\nAGGREGATE LOOKUP ERRORS:');
    errors.forEach((e) => lines.push(`- ${e}`));
  }

  return lines.join('\n');
}