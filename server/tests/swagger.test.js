const { openApiDocument, setupSwagger } = require('../src/config/swagger');

describe('swagger configuration', () => {
  test('describes main API groups and bearer authentication', () => {
    expect(openApiDocument.openapi).toBe('3.0.3');
    expect(openApiDocument.paths).toHaveProperty('/api/auth/login');
    expect(openApiDocument.paths).toHaveProperty('/api/tests');
    expect(openApiDocument.paths).toHaveProperty('/api/results/my');
    expect(openApiDocument.paths).toHaveProperty('/api/admin/users/{id}/role');
    expect(openApiDocument.components.securitySchemes.bearerAuth).toEqual({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    });
  });

  test('registers JSON spec and Swagger UI routes', () => {
    const app = {
      get: jest.fn(),
      use: jest.fn()
    };

    setupSwagger(app);

    expect(app.get).toHaveBeenCalledWith('/api/docs.json', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/api/docs', expect.anything(), expect.any(Function));

    const jsonHandler = app.get.mock.calls[0][1];
    const response = {
      json: jest.fn()
    };

    jsonHandler({}, response);

    expect(response.json).toHaveBeenCalledWith(openApiDocument);
  });
});
