// store.js
import { configureStore } from '@reduxjs/toolkit';
import { api } from '../api/api';
import { sanityApi } from '../api/externalSanityApi';

export const store = configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      [sanityApi.reducerPath] : sanityApi.reducer // <--- Add the external sanityApi reducer
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(api.middleware,sanityApi.middleware),


});