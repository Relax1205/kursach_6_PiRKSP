import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import styles from './App.module.css';

// Компоненты
import Header from './components/Header/Header';
import Home from './pages/Home/Home';
import Test from './pages/Test/Test';
import QuizContainer from './components/Quiz/QuizContainer';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className={styles.app}>
          <Header />
          <main className={styles.main}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tests" element={<Test />} />
              <Route path="/test/:testId" element={<QuizContainer />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Provider>
  );
}

export default App;