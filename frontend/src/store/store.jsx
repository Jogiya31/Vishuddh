// store.js
import { configureStore } from '@reduxjs/toolkit';
import { api } from '../api/api';

export const store = configureStore({
 
 
    reducer: {
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,  // <--- DISABLE SERIALIZABLE CHECK
      }).concat(api.middleware),


});