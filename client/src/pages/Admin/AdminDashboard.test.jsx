import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';

import AdminDashboard from './AdminDashboard';
import { adminAPI } from '../../services/api';
import { createTestStore, renderWithProviders } from '../../test-utils/render';

jest.mock('../../services/api', () => ({
  adminAPI: {
    getUsers: jest.fn(),
    updateUserRole: jest.fn(),
    deleteUser: jest.fn(),
    getTests: jest.fn(),
    updateTestModeration: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  },
}));

function renderAdmin(user = { id: 1, role: 'admin' }) {
  return renderWithProviders(<AdminDashboard />, {
    store: createTestStore({
      auth: {
        user,
        token: user ? 'token' : null,
        isAuthenticated: Boolean(user),
        role: user?.role || null,
        isLoading: false,
        error: null,
      },
      quiz: {
        questions: [],
        currentQuestion: 0,
        wrongQuestions: [],
        mode: 'main',
        isFinished: false,
        userAnswers: [],
        isLoading: false,
        isSubmitting: false,
        error: null,
        finalResult: null,
      },
    }),
  });
}

function mockLoadedAdminData() {
  adminAPI.getUsers.mockResolvedValue({
    data: [
      { id: 1, name: 'Admin', email: 'admin@test.ru', role: 'admin', testCount: 0, resultCount: 0 },
      { id: 2, name: 'Teacher', email: 'teacher@test.ru', role: 'teacher', testCount: 2, resultCount: 3 },
    ],
  });
  adminAPI.getTests.mockResolvedValue({
    data: [
      {
        id: 10,
        title: 'Тест',
        description: '',
        authorId: 2,
        author: null,
        questionCount: 5,
        totalAttempts: 1,
        isActive: false,
      },
      {
        id: 11,
        title: 'Второй тест',
        description: 'Описание',
        authorId: 1,
        author: { name: 'Admin' },
        questionCount: 1,
        totalAttempts: 0,
        isActive: true,
      },
    ],
  });
  adminAPI.getSettings.mockResolvedValue({
    data: [
      { key: 'platformName', value: 'Платформа', description: 'Название' },
      { key: 'publicRegistrationEnabled', value: true, description: 'Регистрация' },
      { key: 'teacherTestsRequireModeration', value: false, description: 'Модерация' },
    ],
  });
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    window.alert.mockRestore();
    window.confirm.mockRestore();
  });

  test('blocks non-admin users', () => {
    renderAdmin({ id: 2, role: 'teacher' });

    expect(screen.getByText('Доступ только для администратора.')).toBeInTheDocument();
    expect(adminAPI.getUsers).not.toHaveBeenCalled();
  });

  test('loads data and performs successful admin actions', async () => {
    mockLoadedAdminData();
    adminAPI.updateUserRole.mockResolvedValue({});
    adminAPI.deleteUser.mockResolvedValue({});
    adminAPI.updateTestModeration.mockResolvedValue({});
    adminAPI.updateSettings.mockResolvedValue({
      data: {
        settings: [
          { key: 'platformName', value: 'Новая', description: 'Название' },
          { key: 'publicRegistrationEnabled', value: false, description: 'Регистрация' },
          { key: 'teacherTestsRequireModeration', value: true, description: 'Модерация' },
        ],
      },
    });

    renderAdmin();
    expect(screen.getByText('Загрузка админ-панели...')).toBeInTheDocument();
    expect(await screen.findByText('Teacher')).toBeInTheDocument();

    const teacherRow = screen.getByText('Teacher').closest('tr');
    fireEvent.change(within(teacherRow).getByRole('combobox'), { target: { value: 'admin' } });
    await waitFor(() => expect(adminAPI.updateUserRole).toHaveBeenCalledWith(2, 'admin'));
    expect(await screen.findByText('Роль пользователя обновлена.')).toBeInTheDocument();

    fireEvent.click(within(teacherRow).getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(adminAPI.deleteUser).toHaveBeenCalledWith(2));
    expect(adminAPI.getUsers).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByLabelText(/Скрыт/));
    await waitFor(() => expect(adminAPI.updateTestModeration).toHaveBeenCalledWith(10, true));
    expect(await screen.findByText('Статус теста обновлён.')).toBeInTheDocument();

    const settingsForm = screen.getByRole('button', { name: 'Сохранить настройки' }).closest('form');
    fireEvent.change(within(settingsForm).getByRole('textbox'), { target: { value: 'Новая' } });
    const [registrationCheckbox, moderationCheckbox] = within(settingsForm).getAllByRole('checkbox');
    fireEvent.click(registrationCheckbox);
    fireEvent.click(moderationCheckbox);
    fireEvent.submit(settingsForm);

    await waitFor(() => expect(adminAPI.updateSettings).toHaveBeenCalledWith({
      platformName: 'Новая',
      publicRegistrationEnabled: false,
      teacherTestsRequireModeration: true,
    }));
    expect(await screen.findByText('Настройки сохранены.')).toBeInTheDocument();
  });

  test('handles load and action errors plus cancelled delete', async () => {
    adminAPI.getUsers.mockRejectedValueOnce({ response: { data: { error: 'Нет доступа' } } });
    adminAPI.getTests.mockResolvedValue({ data: [] });
    adminAPI.getSettings.mockResolvedValue({ data: [] });
    const failedLoad = renderAdmin();
    expect(await screen.findByText('Нет доступа')).toBeInTheDocument();
    failedLoad.unmount();
    cleanup();

    mockLoadedAdminData();
    adminAPI.updateUserRole.mockRejectedValue({ response: { data: { error: 'role error' } } });
    adminAPI.deleteUser.mockRejectedValue({ response: { data: { error: 'delete error' } } });
    adminAPI.updateTestModeration.mockRejectedValue({ response: { data: { error: 'test error' } } });
    adminAPI.updateSettings.mockRejectedValue({ response: { data: { error: 'settings error' } } });
    window.confirm.mockReturnValueOnce(false).mockReturnValue(true);

    renderAdmin();
    const teacherRow = await screen.findByText('Teacher').then((node) => node.closest('tr'));
    fireEvent.change(within(teacherRow).getByRole('combobox'), { target: { value: 'student' } });
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('role error'));

    fireEvent.click(within(teacherRow).getByRole('button', { name: 'Удалить' }));
    expect(adminAPI.deleteUser).not.toHaveBeenCalled();

    fireEvent.click(within(teacherRow).getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('delete error'));

    fireEvent.click(screen.getByLabelText(/Скрыт/));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('test error'));

    window.alert.mockClear();
    adminAPI.updateTestModeration.mockRejectedValueOnce({});
    fireEvent.click(screen.getByLabelText(/Скрыт/));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Не удалось обновить тест.'));

    fireEvent.submit(screen.getAllByRole('button', { name: 'Сохранить настройки' }).pop().closest('form'));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('settings error'));
  });
});


