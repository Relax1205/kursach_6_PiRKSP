import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

import authReducer from '../store/slices/authSlice';
import quizReducer from '../store/slices/quizSlice';

export function createTestStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      auth: authReducer,
      quiz: quizReducer,
    },
    preloadedState,
  });
}

export function renderWithProviders(
  ui,
  {
    route = '/',
    store = createTestStore(),
  } = {}
) {
  const result = render(
    <Provider store={store}>
      <MemoryRouter
        initialEntries={[route]}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        {ui}
      </MemoryRouter>
    </Provider>
  );

  return {
    store,
    ...result,
  };
}
