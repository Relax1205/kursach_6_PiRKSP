const mockApiClient = {
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockApiClient),
}));

const {
  default: api,
  adminAPI,
  authAPI,
  resultsAPI,
  testsAPI,
} = require('./api');

describe('api service', () => {
  const [[requestFulfilled, requestRejected]] = mockApiClient.interceptors.request.use.mock.calls;
  const [[responseFulfilled, responseRejected]] = mockApiClient.interceptors.response.use.mock.calls;

  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
    mockApiClient.get.mockClear();
    mockApiClient.post.mockClear();
    mockApiClient.put.mockClear();
    mockApiClient.patch.mockClear();
    mockApiClient.delete.mockClear();
  });

  test('creates configured axios client', () => {
    expect(api).toBe(mockApiClient);
  });

  test('adds auth token to requests when present', async () => {
    localStorage.setItem('token', 'abc');

    expect(requestFulfilled({ headers: {} })).toEqual({
      headers: { Authorization: 'Bearer abc' },
    });

    localStorage.removeItem('token');
    expect(requestFulfilled({ headers: {} })).toEqual({ headers: {} });
    await expect(requestRejected('request-error')).rejects.toBe('request-error');
  });

  test('passes successful responses and handles unauthorized errors', async () => {
    expect(responseFulfilled({ data: 1 })).toEqual({ data: 1 });

    localStorage.setItem('token', 'abc');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(responseRejected({ response: { status: 401 } })).rejects.toEqual({
      response: { status: 401 },
    });
    consoleErrorSpy.mockRestore();
    expect(localStorage.getItem('token')).toBeNull();

    window.history.pushState({}, '', '/login');
    await expect(responseRejected({ response: { status: 401 } })).rejects.toEqual({
      response: { status: 401 },
    });
    await expect(responseRejected({ response: { status: 500 } })).rejects.toEqual({
      response: { status: 500 },
    });
  });

  test('wraps auth, tests, results and admin endpoints', () => {
    authAPI.register({ email: 'a' });
    expect(mockApiClient.post).toHaveBeenLastCalledWith('/api/auth/register', { email: 'a' });
    authAPI.login({ email: 'a' });
    expect(mockApiClient.post).toHaveBeenLastCalledWith('/api/auth/login', { email: 'a' });
    authAPI.getProfile();
    expect(mockApiClient.get).toHaveBeenLastCalledWith('/api/auth/profile');

    testsAPI.getAll();
    testsAPI.getManageable();
    testsAPI.getById(1);
    testsAPI.getQuestions(1);
    testsAPI.getManageQuestions(1);
    testsAPI.create({ title: 'Test' });
    testsAPI.update(1, { title: 'New' });
    testsAPI.delete(1);
    testsAPI.submit(1, { answers: [] });
    testsAPI.createQuestion(1, { question: 'Q' });
    testsAPI.updateQuestion(1, 2, { question: 'Q2' });
    testsAPI.deleteQuestion(1, 2);

    expect(mockApiClient.get).toHaveBeenCalledWith('/api/tests');
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/tests/manage');
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/tests/1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/tests/1/questions');
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/tests/1/questions/manage');
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/tests', { title: 'Test' });
    expect(mockApiClient.put).toHaveBeenCalledWith('/api/tests/1', { title: 'New' });
    expect(mockApiClient.delete).toHaveBeenCalledWith('/api/tests/1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/tests/1/submit', { answers: [] });
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/tests/1/questions', { question: 'Q' });
    expect(mockApiClient.put).toHaveBeenCalledWith('/api/tests/1/questions/2', { question: 'Q2' });
    expect(mockApiClient.delete).toHaveBeenCalledWith('/api/tests/1/questions/2');

    resultsAPI.save({ testId: 1 });
    resultsAPI.getMy();
    resultsAPI.getMistakes(4);
    resultsAPI.getStats(5);
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/results', { testId: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/results/my');
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/results/4/mistakes');
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/results/test/5/stats');

    adminAPI.getUsers();
    adminAPI.updateUserRole(1, 'admin');
    adminAPI.deleteUser(1);
    adminAPI.getTests();
    adminAPI.updateTestModeration(2, true);
    adminAPI.getSettings();
    adminAPI.updateSettings({ platformName: 'X' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/admin/users');
    expect(mockApiClient.patch).toHaveBeenCalledWith('/api/admin/users/1/role', { role: 'admin' });
    expect(mockApiClient.delete).toHaveBeenCalledWith('/api/admin/users/1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/admin/tests');
    expect(mockApiClient.patch).toHaveBeenCalledWith('/api/admin/tests/2/moderation', { isActive: true });
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/admin/settings');
    expect(mockApiClient.patch).toHaveBeenCalledWith('/api/admin/settings', {
      settings: { platformName: 'X' },
    });
  });
});

