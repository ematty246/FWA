import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * ClaimGuard AI
 * Investigation Report Service
 *
 * Flow:
 *
 * 1. Create investigation record
 * 2. Upload generated PDF
 * 3. Backend stores PDF in Supabase Storage
 * 4. Backend stores Storage path in investigation_records
 * 5. Backend returns temporary signed URL
 */
export const reportService = {

  // ============================================================
  // CREATE INVESTIGATION RECORD
  // ============================================================

  createInvestigationRecord: async ({
    investigationId,
    investigatorId,
    providerId,
    overallFwaRisk,
  }) => {

    const response = await api.post(
      '/api/investigation-records',
      {
        investigation_id: investigationId,
        investigator_id: investigatorId,
        provider_id: providerId,
        overall_fwa_risk: overallFwaRisk,
      }
    );

    return response.data;
  },

  // ============================================================
  // UPLOAD GENERATED PDF
  // ============================================================

  uploadInvestigationReport: async ({
    investigationId,
    pdfBlob,
  }) => {

    const formData = new FormData();

    formData.append(
      'file',
      pdfBlob,
      `ClaimGuard_Investigation_Report_${investigationId}.pdf`
    );

    const response = await api.post(
      `/api/investigation-records/${encodeURIComponent(
        investigationId
      )}/report`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  // ============================================================
  // GET SAVED REPORT
  // ============================================================

  getInvestigationReport: async (
    investigationId
  ) => {

    const response = await api.get(
      `/api/investigation-records/${encodeURIComponent(
        investigationId
      )}/report`
    );

    return response.data;
  },

  // ============================================================
  // SAVE COMPLETE REPORT
  //
  // Creates record + uploads PDF
  // ============================================================

  saveInvestigationReport: async ({
    investigationId,
    investigatorId,
    providerId,
    overallFwaRisk,
    pdfBlob,
  }) => {

    // ----------------------------------------------------------
    // STEP 1
    // Create investigation record
    // ----------------------------------------------------------

    let record;

    try {

      record = await reportService.createInvestigationRecord({
        investigationId,
        investigatorId,
        providerId,
        overallFwaRisk,
      });

    } catch (error) {

      /*
       * If the record already exists, do not stop.
       *
       * This is useful when the investigator regenerates
       * the same report.
       */

      const status = error?.response?.status;

      if (status !== 409) {
        throw error;
      }

      // Existing record is okay.
      record = null;
    }

    // ----------------------------------------------------------
    // STEP 2
    // Upload PDF
    // ----------------------------------------------------------

    const uploadResult =
      await reportService.uploadInvestigationReport({
        investigationId,
        pdfBlob,
      });

    // ----------------------------------------------------------
    // STEP 3
    // Return everything
    // ----------------------------------------------------------

    return {
      record,
      upload: uploadResult,
    };
  },
};

export default reportService;