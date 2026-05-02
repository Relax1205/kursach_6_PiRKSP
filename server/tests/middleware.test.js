jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}));

jest.mock('../src/models', () => ({
  User: {
    findByPk: jest.fn()
  }
}));

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('../src/models');

const auth = require('../src/middleware/auth');
const optionalAuth = require('../src/middleware/optionalAuth');
const role = require('../src/middleware/role');
const validate = require('../src/middleware/validate');

const createResponse = () => {
  const response = {};
  response.status = jest.fn(() => response);
  response.json = jest.fn(() => response);
  return response;
};

const createRequest = (authorization) => ({
  headers: authorization === undefined ? {} : { authorization }
});

const createNamedError = (name) => {
  const error = new Error(name);
  error.name = name;
  return error;
};

describe('auth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects missing and malformed bearer headers', async () => {
    for (const request of [createRequest(), createRequest('Token abc')]) {
      const response = createResponse();
      const next = jest.fn();

      await auth(request, response, next);

      expect(response.status).toHaveBeenCalledWith(401);
      expect(response.json).toHaveBeenCalledWith({
        error: 'Доступ запрещён. Требуется токен авторизации.'
      });
      expect(next).not.toHaveBeenCalled();
    }
  });

  test('loads an authorized user and stores token on the request', async () => {
    const user = { id: 7, role: 'teacher' };
    const request = createRequest('Bearer jwt-token');
    const response = createResponse();
    const next = jest.fn();

    jwt.verify.mockReturnValue({ id: 7 });
    User.findByPk.mockResolvedValue(user);

    await auth(request, response, next);

    expect(jwt.verify).toHaveBeenCalledWith('jwt-token', process.env.JWT_SECRET);
    expect(User.findByPk).toHaveBeenCalledWith(7);
    expect(request.user).toBe(user);
    expect(request.token).toBe('jwt-token');
    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });

  test('rejects valid tokens when user is not found', async () => {
    const response = createResponse();

    jwt.verify.mockReturnValue({ id: 404 });
    User.findByPk.mockResolvedValue(null);

    await auth(createRequest('Bearer missing-user'), response, jest.fn());

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: 'Пользователь не найден.' });
  });

  test('reports token and server errors', async () => {
    const cases = [
      [createNamedError('JsonWebTokenError'), 401, 'Неверный токен.'],
      [createNamedError('TokenExpiredError'), 401, 'Токен истёк.'],
      [createNamedError('DatabaseError'), 500, 'Ошибка сервера.']
    ];

    for (const [error, status, message] of cases) {
      const response = createResponse();
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      await auth(createRequest('Bearer broken-token'), response, jest.fn());

      expect(response.status).toHaveBeenCalledWith(status);
      expect(response.json).toHaveBeenCalledWith({ error: message });
    }
  });
});

describe('optionalAuth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('continues without a user when bearer header is absent or malformed', async () => {
    for (const request of [createRequest(), createRequest('Token abc')]) {
      const next = jest.fn();

      await optionalAuth(request, createResponse(), next);

      expect(request.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
    }
  });

  test('attaches a user when an optional token is valid', async () => {
    const user = { id: 3, role: 'student' };
    const request = createRequest('Bearer optional-token');
    const next = jest.fn();

    jwt.verify.mockReturnValue({ id: 3 });
    User.findByPk.mockResolvedValue(user);

    await optionalAuth(request, createResponse(), next);

    expect(request.user).toBe(user);
    expect(request.token).toBe('optional-token');
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('continues without a user when token lookup fails or returns nothing', async () => {
    const missingUserRequest = createRequest('Bearer no-user');
    jwt.verify.mockReturnValue({ id: 99 });
    User.findByPk.mockResolvedValue(null);

    await optionalAuth(missingUserRequest, createResponse(), jest.fn());

    expect(missingUserRequest.user).toBeUndefined();

    const invalidTokenRequest = createRequest('Bearer invalid');
    const next = jest.fn();
    jwt.verify.mockImplementation(() => {
      throw createNamedError('JsonWebTokenError');
    });

    await optionalAuth(invalidTokenRequest, createResponse(), next);

    expect(invalidTokenRequest.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('role middleware', () => {
  test('requires an authenticated user', () => {
    const response = createResponse();

    role('admin')({}, response, jest.fn());

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: 'Требуется авторизация.' });
  });

  test('rejects users without an allowed role', () => {
    const response = createResponse();

    role('admin', 'teacher')({ user: { role: 'student' } }, response, jest.fn());

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Недостаточно прав для выполнения этого действия.',
      required: ['admin', 'teacher'],
      current: 'student'
    });
  });

  test('continues when the user has an allowed role', () => {
    const next = jest.fn();

    role('admin', 'teacher')({ user: { role: 'teacher' } }, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('validate middleware', () => {
  test('returns validation errors', () => {
    const details = [{ path: 'email', msg: 'Invalid value' }];
    const response = createResponse();
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => details
    });

    validate({}, response, jest.fn());

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Ошибка валидации',
      details
    });
  });

  test('continues when request validation passes', () => {
    const next = jest.fn();
    validationResult.mockReturnValue({
      isEmpty: () => true
    });

    validate({}, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
