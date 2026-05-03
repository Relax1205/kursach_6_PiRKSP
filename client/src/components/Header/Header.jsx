import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import styles from './Header.module.css';

function Header() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const canUseConstructor = isAuthenticated && (user?.role === 'teacher' || user?.role === 'admin');
  const canUseAnalytics = isAuthenticated && user?.role === 'teacher';
  const canUseAdmin = isAuthenticated && user?.role === 'admin';

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link to="/">Конструктор тестов</Link>
      </div>
      <nav className={styles.nav}>
        <Link to="/">Главная</Link>
        <Link to="/tests">Тесты</Link>
        {canUseConstructor && (
          <Link to="/constructor">Конструктор</Link>
        )}
        {canUseAnalytics && (
          <Link to="/analytics">Аналитика</Link>
        )}
        {canUseAdmin && (
          <Link to="/admin">Администрирование</Link>
        )}
        {isAuthenticated ? (
          <>
            <Link to="/profile">Профиль ({user?.role})</Link>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Выйти
            </button>
          </>
        ) : (
          <Link to="/login">Войти</Link>
        )}
      </nav>
    </header>
  );
}

export default Header;
