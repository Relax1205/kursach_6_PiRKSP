import { configureStore } from '@reduxjs/toolkit';
import quizReducer from './slices/quizSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    quiz: quizReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['quiz/setUserAnswer'],
      },
    }),
});