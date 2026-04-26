import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';
import { store } from './store/store';
import { fetchProfile } from './store/slices/authSlice';
import styles from './App.module.css';

import Header from './components/Header/Header';
import Home from './pages/Home/Home';
import Test from './pages/Test/Test';
import QuizContainer from './components/Quiz/QuizContainer';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Profile from './pages/Profile/Profile';
import QuestionsAdmin from './pages/Admin/QuestionsAdmin';

function AppContent() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchProfile());
    }
  }, [dispatch, token, user]);

  return (
    <Router>
      <div className={styles.app}>
        <Header />
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tests" element={<Test />} />
            <Route path="/test/:testId" element={<QuizContainer />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/questions" element={<QuestionsAdmin />} />
            <Route path="/constructor" element={<QuestionsAdmin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
