import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const SANITY_BASE_URL = `${import.meta.env.VITE_EXTERNAL_SANITY_API_URL}`;

export const sanityApi = createApi({
  reducerPath: "sanityApi", // better to give unique name
  baseQuery: fetchBaseQuery({
    baseUrl: SANITY_BASE_URL,
  }),
  tagTypes: ["summary", "allSummary", "getdatetime"],
  endpoints: (builder) => ({
    fetchSummary: builder.query({
      query: () => "/summary/get/0",
      providesTags: ["summary"],
    }),
    fetchAllSummary: builder.query({
      query: () => "/summary/get/1",
      providesTags: ["allSummary"],
    }),
    fetchDateTime: builder.query({
      query: () => "/GetDateTime/getdatetime",
      providesTags: ["getdatetime"],
    }),
  }),
});

export const { useFetchSummaryQuery, useFetchAllSummaryQuery , useFetchDateTimeQuery} = sanityApi;
