import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { adminAPI } from '../../services/api';
import styles from './AdminDashboard.module.css';

const ROLE_LABELS = {
  student: 'Студент',
  teacher: 'Учитель',
  admin: 'Админ',
};

const SETTINGS_LABELS = {
  platformName: 'Название системы',
  publicRegistrationEnabled: 'Самостоятельная регистрация',
  teacherTestsRequireModeration: 'Модерация тестов учителей',
};

function AdminDashboard() {
  const { user } = useSelector((state) => state.auth);
  const [users, setUsers] = useState([]);
  const [tests, setTests] = useState([]);
  const [settings, setSettings] = useState([]);
  const [settingsForm, setSettingsForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const settingsByKey = useMemo(() => {
    return settings.reduce((accumulator, setting) => {
      accumulator[setting.key] = setting;
      return accumulator;
    }, {});
  }, [settings]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError('');

      const [usersResponse, testsResponse, settingsResponse] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getTests(),
        adminAPI.getSettings(),
      ]);

      const nextSettingsForm = settingsResponse.data.reduce((accumulator, setting) => {
        accumulator[setting.key] = setting.value;
        return accumulator;
      }, {});

      setUsers(usersResponse.data);
      setTests(testsResponse.data);
      setSettings(settingsResponse.data);
      setSettingsForm(nextSettingsForm);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Не удалось загрузить админ-панель.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      setSaving(true);
      setMessage('');
      await adminAPI.updateUserRole(userId, role);
      setUsers((currentUsers) => currentUsers.map((currentUser) => (
        currentUser.id === userId ? { ...currentUser, role } : currentUser
      )));
      setMessage('Роль пользователя обновлена.');
    } catch (requestError) {
      alert(requestError.response?.data?.error || 'Не удалось обновить роль.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    if (!window.confirm(`Удалить пользователя "${userToDelete.email}"? Его тесты будут переданы текущему админу.`)) {
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      await adminAPI.deleteUser(userToDelete.id);
      setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== userToDelete.id));
      await loadAdminData();
      setMessage('Пользователь удалён.');
    } catch (requestError) {
      alert(requestError.response?.data?.error || 'Не удалось удалить пользователя.');
    } finally {
      setSaving(false);
    }
  };

  const handleModerationChange = async (testId, isActive) => {
    try {
      setSaving(true);
      setMessage('');
      await adminAPI.updateTestModeration(testId, isActive);
      setTests((currentTests) => currentTests.map((test) => (
        test.id === testId ? { ...test, isActive } : test
      )));
      setMessage('Статус теста обновлён.');
    } catch (requestError) {
      alert(requestError.response?.data?.error || 'Не удалось обновить тест.');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage('');
      const response = await adminAPI.updateSettings(settingsForm);
      const nextSettingsForm = response.data.settings.reduce((accumulator, setting) => {
        accumulator[setting.key] = setting.value;
        return accumulator;
      }, {});

      setSettings(response.data.settings);
      setSettingsForm(nextSettingsForm);
      setMessage('Настройки сохранены.');
    } catch (requestError) {
      alert(requestError.response?.data?.error || 'Не удалось сохранить настройки.');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Доступ только для администратора.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка админ-панели...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Администрирование</h1>
        {message && <span className={styles.message}>{message}</span>}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.section}>
        <h2>Пользователи и роли</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Роль</th>
                <th>Тесты</th>
                <th>Результаты</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {users.map((userItem) => (
                <tr key={userItem.id}>
                  <td>
                    <strong>{userItem.name}</strong>
                    <span>{userItem.email}</span>
                  </td>
                  <td>
                    <select
                      value={userItem.role}
                      onChange={(event) => handleRoleChange(userItem.id, event.target.value)}
                      disabled={saving || userItem.id === user.id}
                    >
                      {Object.entries(ROLE_LABELS).map(([role, label]) => (
                        <option key={role} value={role}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td>{userItem.testCount}</td>
                  <td>{userItem.resultCount}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => handleDeleteUser(userItem)}
                      disabled={saving || userItem.id === user.id}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Все тесты и модерация</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Тест</th>
                <th>Автор</th>
                <th>Вопросы</th>
                <th>Попытки</th>
                <th>Публикация</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id}>
                  <td>
                    <Link to={`/test/${test.id}`}>{test.title}</Link>
                    <span>{test.description || 'Без описания'}</span>
                  </td>
                  <td>{test.author?.name || `#${test.authorId}`}</td>
                  <td>{test.questionCount}</td>
                  <td>{test.totalAttempts}</td>
                  <td>
                    <label className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={Boolean(test.isActive)}
                        onChange={(event) => handleModerationChange(test.id, event.target.checked)}
                        disabled={saving}
                      />
                      <span>{test.isActive ? 'Опубликован' : 'Скрыт'}</span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Системные настройки</h2>
        <form className={styles.settingsForm} onSubmit={handleSettingsSubmit}>
          <label className={styles.formRow}>
            <span>{SETTINGS_LABELS.platformName}</span>
            <input
              type="text"
              value={settingsForm.platformName || ''}
              onChange={(event) => setSettingsForm({ ...settingsForm, platformName: event.target.value })}
              maxLength={100}
              required
            />
            <small>{settingsByKey.platformName?.description}</small>
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={Boolean(settingsForm.publicRegistrationEnabled)}
              onChange={(event) => setSettingsForm({
                ...settingsForm,
                publicRegistrationEnabled: event.target.checked,
              })}
            />
            <span>{SETTINGS_LABELS.publicRegistrationEnabled}</span>
            <small>{settingsByKey.publicRegistrationEnabled?.description}</small>
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={Boolean(settingsForm.teacherTestsRequireModeration)}
              onChange={(event) => setSettingsForm({
                ...settingsForm,
                teacherTestsRequireModeration: event.target.checked,
              })}
            />
            <span>{SETTINGS_LABELS.teacherTestsRequireModeration}</span>
            <small>{settingsByKey.teacherTestsRequireModeration?.description}</small>
          </label>

          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default AdminDashboard;
