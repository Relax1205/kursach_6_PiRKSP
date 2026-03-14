import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import styles from './Header.module.css';

function Header() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link to="/">📚 Конструктор Тестов</Link>
      </div>
      <nav className={styles.nav}>
        <Link to="/">Главная</Link>
        <Link to="/tests">Тесты</Link>
        {isAuthenticated && (user?.role === 'teacher' || user?.role === 'admin') && (
          <Link to="/admin/questions">❓ Вопросы</Link>
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