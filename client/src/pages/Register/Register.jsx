import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register, clearError } from '../../store/slices/authSlice';
import styles from './Register.module.css';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [localError, setLocalError] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/tests');
    }
    return () => { dispatch(clearError()); };
  }, [isAuthenticated, navigate, dispatch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    // 🔒 Локальная валидация
    if (formData.password !== formData.confirmPassword) {
      setLocalError('❌ Пароли не совпадают');
      return;
    }
    if (formData.password.length < 6) {
      setLocalError('❌ Пароль должен содержать минимум 6 символов');
      return;
    }
    
    const { confirmPassword, ...registerData } = formData;
    const result = await dispatch(register(registerData));
    
    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/tests');
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>📝 Регистрация</h2>
        
        {(error || localError) && (
          <div className={styles.error}>{error || localError}</div>
        )}
        
        <div className={styles.inputGroup}>
          <label>Имя</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={isLoading}
            placeholder="Ваше имя"
          />
        </div>
        
        <div className={styles.inputGroup}>
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isLoading}
            placeholder="user@example.com"
          />
        </div>
        
        <div className={styles.inputGroup}>
          <label>Пароль</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLoading}
            minLength={6}
            placeholder="••••••••"
          />
        </div>
        
        <div className={styles.inputGroup}>
          <label>Подтвердите пароль</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={isLoading}
            placeholder="••••••••"
          />
        </div>
        
        <button type="submit" disabled={isLoading} className={styles.submitButton}>
          {isLoading ? '⏳ Регистрация...' : 'Зарегистрироваться'}
        </button>
        
        <p className={styles.switch}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;