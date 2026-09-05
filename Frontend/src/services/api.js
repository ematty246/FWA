import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


// ============================================================
// REQUEST INTERCEPTOR
// Attach access token to every protected request
// ============================================================

api.interceptors.request.use(
  (config) => {

    const token =
      localStorage.getItem('access_token');

    if (token) {

      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);


// ============================================================
// TOKEN REFRESH STATE
// ============================================================

let isRefreshing = false;

let refreshSubscribers = [];


// ============================================================
// ADD REQUEST TO REFRESH QUEUE
// ============================================================

const subscribeTokenRefresh = (
  resolve,
  reject
) => {

  refreshSubscribers.push({
    resolve,
    reject,
  });

};


// ============================================================
// RESOLVE ALL WAITING REQUESTS
// ============================================================

const onRefreshed = (
  newToken
) => {

  refreshSubscribers.forEach(
    ({ resolve }) => {

      resolve(newToken);

    }
  );

  refreshSubscribers = [];

};


// ============================================================
// REJECT ALL WAITING REQUESTS
// ============================================================

const onRefreshFailed = (
  error
) => {

  refreshSubscribers.forEach(
    ({ reject }) => {

      reject(error);

    }
  );

  refreshSubscribers = [];

};


// ============================================================
// CLEAR AUTHENTICATION
// ============================================================

const clearAuthentication = () => {

  localStorage.removeItem(
    'access_token'
  );

  localStorage.removeItem(
    'refresh_token'
  );

  localStorage.removeItem(
    'user'
  );

};


// ============================================================
// RESPONSE INTERCEPTOR
// Automatically refresh expired access token
// ============================================================

api.interceptors.response.use(

  // ----------------------------------------------------------
  // SUCCESS
  // ----------------------------------------------------------

  (response) => {

    return response;

  },


  // ----------------------------------------------------------
  // ERROR
  // ----------------------------------------------------------

  async (error) => {

    const originalRequest =
      error.config;


    // ========================================================
    // NO RESPONSE
    // Network / server connection error
    // ========================================================

    if (!error.response) {

      return Promise.reject(error);

    }


    const status =
      error.response.status;


    // ========================================================
    // ONLY REFRESH ON 401
    // ========================================================

    if (status !== 401) {

      return Promise.reject(error);

    }


    // ========================================================
    // PREVENT INFINITE LOOP
    // ========================================================

    if (
      originalRequest?._retry
    ) {

      return Promise.reject(error);

    }


    // ========================================================
    // NEVER REFRESH THE REFRESH REQUEST
    // ========================================================

    if (
      originalRequest?.url?.includes(
        '/api/auth/refresh'
      )
    ) {

      return Promise.reject(error);

    }


    // ========================================================
    // GET REFRESH TOKEN
    // ========================================================

    const refreshToken =
      localStorage.getItem(
        'refresh_token'
      );


    // ========================================================
    // NO REFRESH TOKEN
    // ========================================================

    if (!refreshToken) {

      clearAuthentication();

      window.location.href =
        '/auth';

      return Promise.reject(error);

    }


    // ========================================================
    // ANOTHER REQUEST IS ALREADY REFRESHING
    // ========================================================

    if (isRefreshing) {

      return new Promise(
        (resolve, reject) => {

          subscribeTokenRefresh(
            resolve,
            reject
          );

        }
      ).then(
        (newToken) => {

          originalRequest._retry =
            true;

          originalRequest.headers =
            originalRequest.headers || {};

          originalRequest.headers.Authorization =
            `Bearer ${newToken}`;

          return api(
            originalRequest
          );

        }
      );

    }


    // ========================================================
    // START REFRESH
    // ========================================================

    originalRequest._retry =
      true;

    isRefreshing =
      true;


    try {

      // ======================================================
      // CALL REFRESH ENDPOINT
      //
      // IMPORTANT:
      // Use axios directly here, not `api`.
      // Otherwise the interceptor could intercept the
      // refresh request itself.
      // ======================================================

      const response =
        await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {
            refresh_token:
              refreshToken,
          },
          {
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );


      // ======================================================
      // GET NEW ACCESS TOKEN
      // ======================================================

      const newAccessToken =
        response.data?.access_token;


      if (!newAccessToken) {

        throw new Error(
          'Refresh endpoint did not return an access token.'
        );

      }


      // ======================================================
      // SAVE NEW ACCESS TOKEN
      // ======================================================

      localStorage.setItem(
        'access_token',
        newAccessToken
      );


      // ======================================================
      // RESOLVE WAITING REQUESTS
      // ======================================================

      onRefreshed(
        newAccessToken
      );


      // ======================================================
      // UPDATE ORIGINAL REQUEST
      // ======================================================

      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;


      // ======================================================
      // RETRY ORIGINAL REQUEST
      // ======================================================

      return api(
        originalRequest
      );

    } catch (refreshError) {

      // ======================================================
      // REFRESH FAILED
      // ======================================================

      onRefreshFailed(
        refreshError
      );


      clearAuthentication();


      window.location.href =
        '/auth';


      return Promise.reject(
        refreshError
      );

    } finally {

      isRefreshing =
        false;

    }

  }

);


export default api;