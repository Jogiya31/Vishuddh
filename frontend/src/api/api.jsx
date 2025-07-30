import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { formatToDDMMYYYY } from "../config/config";

const BASE_URL = `${import.meta.env.VITE_API_URL}`; // Single Base URL
const TIMEOUT_MS = 150000; // 80 seconds timeout

const todaysDate = new Date();

// (Optionally remove saveToLocalStorage and getFromLocalStorage if not used elsewhere)
export const getFromLocalStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    if (key == "token") {
      return data;
    }
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return null;
  }
};

// Handle API responses with error handling
const handleApiResponse = async (response) => {
  try {
    if (!response.ok) {
      // Redirect to login if unauthorized
      if (response.status === 401 || response.status === 402) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/";
        return {
          error: {
            status: 401,
            message: "Unauthorized. Redirecting to login.",
          },
        };
      }
      const errorText = await response.text();
      return {
        error: {
          status: response.status,
          message: errorText || "Unknown error",
        },
      };
    }

    const data = await response.json();
    // Removed: saveToLocalStorage(cacheKey, data);
    return { data };
  } catch (error) {
    return {
      error: {
        message: "Error parsing response",
        details: error.message || "Unknown error",
      },
    };
  }
};

// Function to handle fetch with timeout (no local storage caching)
const fetchWithTimeout = async (url, options = {}) => {
  // Removed: getFromLocalStorage and cache logic
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return await handleApiResponse(response);
  } catch (error) {
    clearTimeout(timeout);
    return {
      error: {
        message:
          error.name === "AbortError" ? "Request timed out" : "Network Error",
        details: error.message,
      },
    };
  }
};

// Create API service
export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
  }),
  endpoints: (builder) => ({
    fetchStateReport: builder.query({
      queryFn: async ({ UnitType = "In Absolute", toggle }) =>
        await fetchWithTimeout(
          `${BASE_URL}${
            UnitType === "In Units"
              ? toggle
                ? "/state-detailed-nested-toggle-unit"
                : "/generate-state-report-unit"
              : toggle
              ? "/state-detailed-nested-toggle"
              : "/generate-state-report"
          }`,
          toggle
            ? {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${getFromLocalStorage("token")}`,
                },
                body: JSON.stringify({ toggle }),
              }
            : {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${getFromLocalStorage("token")}`,
                },
              }
        ),
      providesTags: ["StateReport"],
    }),

    fetchDepartmentMapping: builder.query({
      queryFn: async () =>
        await fetchWithTimeout(
          `${BASE_URL}/scheme-department-mapping`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getFromLocalStorage("token")}`,
            },
          }
        ),
      providesTags: ["Departments"],
    }),

    fetchSectorMapping: builder.query({
      queryFn: async () =>
        await fetchWithTimeout(
          `${BASE_URL}/scheme-sector-mapping`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getFromLocalStorage("token")}`,
            },
          }
        ),
      providesTags: ["Sectors"],
    }),

    fetchNationalReport: builder.query({
      queryFn: async ({ UnitType = "In Absolute", toggle }) =>
        await fetchWithTimeout(
          `${BASE_URL}${
            UnitType === "In Units"
              ? toggle
                ? "/national-detailed-nested-toggle-unit"
                : "/generate-national-report-unit"
              : toggle
              ? "/national-detailed-nested-toggle"
              : "/generate-national-report"
          }`,
          toggle
            ? {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${getFromLocalStorage("token")}`,
                },
                body: JSON.stringify({ toggle }),
              }
            : {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${getFromLocalStorage("token")}`,
                },
              }
        ),
      providesTags: ["NationalReport"],
    }),

    fetchDistrictReport: builder.query({
      queryFn: async ({ UnitType = "In Absolute", toggle }) =>
        await fetchWithTimeout(
          `${BASE_URL}${
            UnitType === "In Units"
              ? toggle
                ? "/district-detailed-nested-toggle-unit"
                : "/generate-district-report-unit"
              : toggle
              ? "/district-detailed-nested-toggle"
              : "/district-summary-report"
          }`,
          toggle
            ? {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${getFromLocalStorage("token")}`,
                },
                body: JSON.stringify({ toggle }),
              }
            : {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${getFromLocalStorage("token")}`,
                },
              }
        ),
      providesTags: ["DistrictReport"],
    }),

    fetchHistoricalDistrictReport: builder.query({
      query: ({ unit = "In Absolute", date, toggle }) => ({
        url: `${BASE_URL}${
          unit === "In Units"
            ? toggle
              ? "/district-historical-nested-toggle-unit"
              : "/district-historical-nested"
            : toggle
            ? "/district-historical-nested-toggle"
            : "/district-historical-nested"
        }`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getFromLocalStorage("token")}`,
        },
        body: { filter_date: date || "10-04-2025", toggle },
      }),

      providesTags: ["DistrictHistoricalReport"],
    }),

    fetchHistoricalStateReport: builder.query({
      query: ({ unit = "In Absolute", date, toggle }) => ({
        url: `${BASE_URL}${
          unit === "In Units"
            ? toggle
              ? "/state-historical-nested-toggle-unit"
              : "/state-historical-nested"
            : toggle
            ? "/state-historical-nested-toggle"
            : "/state-historical-nested"
        }`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getFromLocalStorage("token")}`,
        },
        body: { filter_date: date || "10-04-2025", toggle },
      }),

      providesTags: ["StateHistoricalReport"],
    }),

    fetchHistoricalNationalReport: builder.query({
      query: ({ unit = "In Absolute", date, toggle }) => ({
        url: `${BASE_URL}${
          unit === "In Units"
            ? toggle
              ? "/national-historical-nested-toggle-unit"
              : "/national-historical-nested"
            : toggle
            ? "/national-historical-nested-toggle"
            : "/national-historical-nested"
        }`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getFromLocalStorage("token")}`,
        },
        body: { filter_date: date || "10-04-2025", toggle },
      }),
      providesTags: ["NationalHistoricalReport"],
    }),

    fetchLevelSchemeKpi: builder.query({
      queryFn: async () =>
        await fetchWithTimeout(
          `${BASE_URL}/get_level_scheme_kpi`,
          {
            headers: {
              Authorization: `Bearer ${getFromLocalStorage("token")}`,
            },
          }
        ),
      providesTags: ["LevelSchemeKpi"],
    }),

    fetchScrapingReport: builder.query({
      query: (date) => ({
        url: `${BASE_URL}/get_state_district_mismatch_records`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getFromLocalStorage("token")}`,
        },
        body: { filter_date: formatToDDMMYYYY(date.selectedDate)},
      }),

      providesTags: ["scrapingRecord"],
    }),

     fetchAiReport: builder.query({
      queryFn: async () =>
        await fetchWithTimeout(
          `${BASE_URL}/ai_insights`,
          {
            headers: {
              Authorization: `Bearer ${getFromLocalStorage("token")}`,
            },
          }
        ),
      providesTags: ["AIReport"],
    }),

  }),
});

// Export Hooks
export const {
  useFetchStateReportQuery,
  useFetchDepartmentMappingQuery,
  useFetchSectorMappingQuery,
  useFetchNationalReportQuery,
  useFetchDistrictReportQuery,
  useFetchHistoricalDistrictReportQuery,
  useFetchHistoricalStateReportQuery,
  useFetchHistoricalNationalReportQuery,
  useFetchLevelSchemeKpiQuery,
  useFetchScrapingReportQuery,
  useFetchAiReportQuery
} = api;