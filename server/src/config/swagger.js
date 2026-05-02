const swaggerUi = require('swagger-ui-express');

const ref = (schemaName) => ({ $ref: `#/components/schemas/${schemaName}` });

const jsonContent = (schema) => ({
  'application/json': {
    schema
  }
});

const requestBody = (schema, required = true) => ({
  required,
  content: jsonContent(schema)
});

const response = (description, schema) => ({
  description,
  ...(schema ? { content: jsonContent(schema) } : {})
});

const badRequest = { $ref: '#/components/responses/BadRequest' };
const unauthorized = { $ref: '#/components/responses/Unauthorized' };
const forbidden = { $ref: '#/components/responses/Forbidden' };
const notFound = { $ref: '#/components/responses/NotFound' };
const serverError = { $ref: '#/components/responses/ServerError' };

const idParameter = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: {
    type: 'integer',
    minimum: 1
  }
});

const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Test Constructor API',
    version: '1.0.0',
    description: 'REST API for authentication, tests, questions, results and administration.'
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local backend'
    },
    {
      url: 'http://localhost',
      description: 'Docker nginx proxy'
    }
  ],
  tags: [
    { name: 'Health', description: 'Service healthcheck' },
    { name: 'Auth', description: 'Registration, login and profile' },
    { name: 'Tests', description: 'Test catalog and test management' },
    { name: 'Questions', description: 'Question management' },
    { name: 'Results', description: 'Saved test results and statistics' },
    { name: 'Admin', description: 'Administrative operations' }
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API availability',
        responses: {
          200: response('API is available.', ref('HealthResponse'))
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new student account',
        requestBody: requestBody(ref('RegisterRequest')),
        responses: {
          201: response('User registered.', ref('AuthResponse')),
          400: badRequest,
          403: forbidden,
          500: serverError
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive a JWT token',
        requestBody: requestBody(ref('LoginRequest')),
        responses: {
          200: response('Login successful.', ref('AuthResponse')),
          400: badRequest,
          401: unauthorized,
          500: serverError
        }
      }
    },
    '/api/auth/profile': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: response('Current user profile.', ref('ProfileResponse')),
          401: unauthorized,
          500: serverError
        }
      }
    },
    '/api/tests': {
      get: {
        tags: ['Tests'],
        summary: 'Get public active tests',
        responses: {
          200: response('Active tests.', {
            type: 'array',
            items: ref('Test')
          }),
          500: serverError
        }
      },
      post: {
        tags: ['Tests'],
        summary: 'Create a test',
        security: [{ bearerAuth: [] }],
        requestBody: requestBody(ref('CreateTestRequest')),
        responses: {
          201: response('Test created.', ref('TestMutationResponse')),
          400: badRequest,
          401: unauthorized,
          403: forbidden,
          500: serverError
        }
      }
    },
    '/api/tests/manage': {
      get: {
        tags: ['Tests'],
        summary: 'Get tests manageable by current teacher or admin',
        security: [{ bearerAuth: [] }],
        responses: {
          200: response('Manageable tests.', {
            type: 'array',
            items: ref('Test')
          }),
          401: unauthorized,
          403: forbidden,
          500: serverError
        }
      }
    },
    '/api/tests/{id}': {
      get: {
        tags: ['Tests'],
        summary: 'Get a test by id',
        security: [{ bearerAuth: [] }, {}],
        parameters: [idParameter('id', 'Test id.')],
        responses: {
          200: response('Test details.', ref('Test')),
          400: badRequest,
          404: notFound,
          500: serverError
        }
      },
      put: {
        tags: ['Tests'],
        summary: 'Update a test',
        security: [{ bearerAuth: [] }],
        parameters: [idParameter('id', 'Test id.')],
        requestBody: requestBody(ref('UpdateTestRequest')),
        responses: {
          200: response('Test updated.', ref('TestMutationResponse')),
          400: badRequest,
          401: unauthorized,
          403: forbidden,
          404: notFound,
          500: serverError
        }
      },
      delete: {
        tags: ['Tests'],
        summary: 'Delete a test',
        security: [{ bearerAuth: [] }],
        parameters: [idParameter('id', 'Test id.')],
        responses: {
          200: response('Test deleted.', ref('MessageResponse')),
          400: badRequest,
          401: unauthorized,
          403: forbidden,
          404: notFound,
          500: serverError
        }
      }
    },
    '/api/tests/{id}/questions': {
      get: {
        tags: ['Questions'],
        summary: 'Get questions for taking a test',
        security: [{ bearerAuth: [] }, {}],
        parameters: [idParameter('id', 'Test id.')],
        responses: {
          200: response('Questions.', {
            type: 'array',
            items: ref('Question')
          }),
          400: badRequest,
          404: notFound,
          500: serverError
        }
      },
      post: {
        tags: ['Questions'],
        summary: 'Create a question in a test',
        security: [{ bearerAuth: [] }],
        parameters: [idParameter('id', 'Test id.')],
        requestBody: requestBody(ref('QuestionInput')),
        responses: {
          201: response('Question created.', ref('QuestionMutationResponse')),
          400: badRequest,
          401: unauthorized,
          403: forbidden,
          404: notFound,
          500: serverError
        }
      }
    },
    '/api/tests/{id}/questions/manage': {
      get: {
        tags: ['Questions'],
        summary: 'Get questions for editing',
        security: [{ bearerAuth: [] }],
        parameters: [idParameter('id', 'Test id.')],
        responses: {
          200: response('Manageable questions.', {
            type: 'array',
            items: ref('Question')
          }),
          400: badRequest,
          401: unauthorized,
          403: forbidden,
          404: notFound,
          500: serverError
        }
      }
    },
    '/api/tests/{id}/questions/{questionId}': {
      put: {
        tags: ['Questions'],
        summary: 'Update a question',
        security: [{ bearerAuth: [] }],
        parameters: [
          idParameter('id', 'Test id.'),
          idParameter('questionId', 'Question id.')
        ],
        requestBody: requestBody(ref('QuestionInput')),
        responses: {
          200: response('Question updated.', ref('QuestionMutationResponse')),
          400: badRequest,
          401: unauthorized,
          403: forbidden,
          404: notFound,
          500: serverError
        }
      },
      delete: {
        tags: ['Questions'],
        summary: 'Delete a question',
        security: [{ bearerAuth: [] }],
        parameters: [
          idParameter('id', 'Test id.'),
          idParameter('questionId', 'Question id.')
        ],
        responses: {
          200: response('Question deleted.', ref('MessageResponse')),
          400: badRequest,
          401: unauthorized,
          403: forbidden,
          404: notFound,
          500: serverError
        }
      }
    },
    '/api/tests/{id}/submit': {
      post: {
        tags: ['Tests'],
        summary: 'Submit answers for a test',
        security: [{ bearerAuth: [] }, {}],
        parameters: [idParameter('id', 'Test id.')],
        requestBody: requestBody(ref('SubmitTestRequest')),
        responses: {
          200: response('Submission evaluated.', ref('SubmitTestResponse')),
          400: badRequest,
          404: notFound,
          500: serverError
        }
      }
    },
    '/api/results': {
      post: {
        tags: ['Results'],
        summary: 'Save a test result',
        security: [{ bearerAuth: [] }],
        requestBody: requestBody(ref('SaveResultRequest')),
        responses: {
          201: response('Result saved.', ref('SaveResultResponse')),
          400: badRequest,
          401: unauthorized,
          404: notFound,
          500: serverError
        }
      }
    },
    '/api/results/my': {
      get: {
        tags: ['Results'],
        summary: 'Get current user results',
        security: [{ bearerAuth: [] }],
        responses: {
          200: response('User results.', {
            type: 'array',
            items: ref('TestResult')
          }),
          401: unauthorized,
          500: serverError
        }
      }
    },
    '/api/results/{id}/mistakes': {
      get: {
        tags: ['Results'],
        summary: 'Get incorrectly answered questions for a result',
        security: [{ bearerAuth: [] }],
        parameters: [idParameter('id', 'Result id.')],
        responses: {
          200: response('Incorrect questions.', {
            type: 'array',
            items: ref('Question')
          }),
          400: badRequest,
          401: unauthorized,
          403: forbidden,
          404: notFound,
          500: serverError
        }
      }
    },
    '/api/results/test/{testId}/stats': {
      get: {
        tags: ['Results'],
        summary: 'Get statistics for a test',
        security: [{ bearerAuth: [] }],
        parameters: [idParameter('testId', 'Test id.')],
        responses: {
          200: response('Test statistics.', ref('TestStatistics')),
          400: badRequest,
          401: unauthorized,
          403: forbidden,
          404: notFound,
          500: serverError
        }
      }
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'Get all users',
        security: [{ bearerAuth: [] }],
        responses: {
          200: response('Users.', {
            type: 'array',
            items: ref('AdminUser')
          }),
          401: unauthorized,
          403: forbidden,
          500: serverError
        }
      }
    },
    '/api/admin/users/{id}/role': {
      patch: {
        tags: ['Admin'],
        summary: 'Update user role',
        security: [{ bearerAuth: [] }],
        parameters: [idParameter('id', 'User id.')],
        requestBody: requestBody(ref('UpdateUserRoleRequest')),
        responses: {
          200: response('Role updated.', ref('UserMutationResponse')),
          400: badRequest,
          401: unauthorized,
          403: forbidden,
          404: notFound,
          500: serverError
        }
      }
    },
    '/api/admin/users/{id}': {
      delete: {
        tags: ['Admin'],
        summary: 'Delete a user',
        security: [{ bearerAuth: [] }],
        parameters: [idParameter('id', 'User id.')],
        responses: {
          200: response('User deleted.', ref('MessageResponse')),
          400: badRequest,
          401: unauthorized,
          403: forbidden,
          404: notFound,
          500: serverError
        }
      }
    },
    '/api/admin/tests': {
      get: {
        tags: ['Admin'],
        summary: 'Get all tests with admin statistics',
        security: [{ bearerAuth: [] }],
        responses: {
          200: response('Tests with statistics.', {
            type: 'array',
            items: ref('AdminTest')
          }),
          401: unauthorized,
          403: forbidden,
          500: serverError
        }
      }
    },
    '/api/admin/tests/{id}/moderation': {
      patch: {
        tags: ['Admin'],
        summary: 'Publish or hide a test',
        security: [{ bearerAuth: [] }],
        parameters: [idParameter('id', 'Test id.')],
        requestBody: requestBody(ref('UpdateTestModerationRequest')),
        responses: {
          200: response('Moderation status updated.', ref('TestMutationResponse')),
          400: badRequest,
          401: unauthorized,
          403: forbidden,
          404: notFound,
          500: serverError
        }
      }
    },
    '/api/admin/settings': {
      get: {
        tags: ['Admin'],
        summary: 'Get system settings',
        security: [{ bearerAuth: [] }],
        responses: {
          200: response('System settings.', {
            type: 'array',
            items: ref('SystemSetting')
          }),
          401: unauthorized,
          403: forbidden,
          500: serverError
        }
      },
      patch: {
        tags: ['Admin'],
        summary: 'Update system settings',
        security: [{ bearerAuth: [] }],
        requestBody: requestBody(ref('UpdateSettingsRequest')),
        responses: {
          200: response('Settings updated.', ref('SettingsMutationResponse')),
          400: badRequest,
          401: unauthorized,
          403: forbidden,
          500: serverError
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    responses: {
      BadRequest: response('Invalid request data.', ref('ErrorResponse')),
      Unauthorized: response('Authentication required or token invalid.', ref('ErrorResponse')),
      Forbidden: response('Access denied.', ref('ErrorResponse')),
      NotFound: response('Resource not found.', ref('ErrorResponse')),
      ServerError: response('Internal server error.', ref('ErrorResponse'))
    },
    schemas: {
      Role: {
        type: 'string',
        enum: ['student', 'teacher', 'admin']
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Invalid request data.'
          }
        },
        required: ['error']
      },
      MessageResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string'
          }
        },
        required: ['message']
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'OK'
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          },
          environment: {
            type: 'string',
            nullable: true,
            example: 'development'
          }
        },
        required: ['status', 'timestamp']
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'student@test.ru'
          },
          name: {
            type: 'string',
            example: 'Student'
          },
          role: ref('Role'),
          createdAt: {
            type: 'string',
            format: 'date-time'
          }
        },
        required: ['id', 'email', 'name', 'role']
      },
      AdminUser: {
        allOf: [
          ref('User'),
          {
            type: 'object',
            properties: {
              testCount: {
                type: 'integer',
                example: 2
              },
              resultCount: {
                type: 'integer',
                example: 5
              }
            }
          }
        ]
      },
      Author: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1
          },
          name: {
            type: 'string',
            example: 'Admin'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@test.ru'
          }
        }
      },
      Test: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 10
          },
          title: {
            type: 'string',
            example: 'JavaScript basics'
          },
          description: {
            type: 'string',
            nullable: true
          },
          questionLimit: {
            type: 'integer',
            nullable: true,
            minimum: 1
          },
          authorId: {
            type: 'integer',
            example: 1
          },
          isActive: {
            type: 'boolean',
            example: true
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          author: ref('Author'),
          availableQuestionCount: {
            type: 'integer',
            example: 12
          },
          questionCount: {
            type: 'integer',
            example: 10
          }
        }
      },
      AdminTest: {
        allOf: [
          ref('Test'),
          {
            type: 'object',
            properties: {
              totalAttempts: {
                type: 'integer',
                example: 4
              },
              averageScore: {
                type: 'integer',
                example: 75
              }
            }
          }
        ]
      },
      QuestionType: {
        type: 'string',
        enum: ['single', 'multiple', 'matching']
      },
      Question: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 100
          },
          testId: {
            type: 'integer',
            example: 10
          },
          type: ref('QuestionType'),
          questionText: {
            type: 'string',
            example: 'What does HTTP stand for?'
          },
          options: {
            type: 'array',
            nullable: true,
            items: {
              type: 'string'
            },
            example: ['HyperText Transfer Protocol', 'High Transfer Text Protocol']
          },
          left: {
            type: 'array',
            nullable: true,
            items: {
              type: 'string'
            }
          },
          right: {
            type: 'array',
            nullable: true,
            items: {
              type: 'string'
            }
          },
          correct: {
            type: 'array',
            items: {
              type: 'integer'
            },
            example: [0]
          },
          order: {
            type: 'integer',
            example: 0
          }
        }
      },
      TestResult: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 50
          },
          userId: {
            type: 'integer',
            example: 3
          },
          testId: {
            type: 'integer',
            example: 10
          },
          score: {
            type: 'integer',
            example: 80
          },
          totalQuestions: {
            type: 'integer',
            example: 10
          },
          durationSeconds: {
            type: 'integer',
            nullable: true,
            example: 420
          },
          percent: {
            type: 'integer',
            nullable: true,
            example: 80
          },
          answers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                questionId: {
                  type: 'integer'
                },
                answer: {
                  oneOf: [
                    {
                      type: 'array',
                      items: {
                        type: 'integer'
                      }
                    },
                    {
                      type: 'object',
                      additionalProperties: {
                        type: 'integer'
                      }
                    }
                  ]
                }
              }
            }
          },
          completedAt: {
            type: 'string',
            format: 'date-time'
          },
          test: ref('Test'),
          user: ref('Author')
        }
      },
      SystemSetting: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            example: 'publicRegistrationEnabled'
          },
          value: {
            oneOf: [
              { type: 'string' },
              { type: 'boolean' },
              { type: 'number' },
              { type: 'object' },
              {
                type: 'array',
                items: {}
              }
            ]
          },
          description: {
            type: 'string',
            nullable: true
          },
          updatedBy: {
            type: 'integer',
            nullable: true
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      RegisterRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email'
          },
          password: {
            type: 'string',
            minLength: 6
          },
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 100
          },
          role: {
            type: 'string',
            enum: ['student'],
            description: 'Public registration accepts only student.'
          }
        },
        required: ['email', 'password', 'name']
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email'
          },
          password: {
            type: 'string'
          }
        },
        required: ['email', 'password']
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string'
          },
          user: ref('User'),
          token: {
            type: 'string'
          }
        },
        required: ['message', 'user', 'token']
      },
      ProfileResponse: {
        type: 'object',
        properties: {
          user: ref('User')
        },
        required: ['user']
      },
      QuestionInput: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            minLength: 5,
            maxLength: 500
          },
          type: ref('QuestionType'),
          options: {
            type: 'array',
            items: {
              type: 'string'
            },
            minItems: 2,
            description: 'Required for single and multiple questions.'
          },
          left: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Required for matching questions.'
          },
          right: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Required for matching questions.'
          },
          correct: {
            type: 'array',
            items: {
              type: 'integer'
            },
            minItems: 1
          },
          order: {
            type: 'integer',
            minimum: 0
          }
        },
        required: ['question', 'type', 'correct']
      },
      CreateTestRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 5,
            maxLength: 200
          },
          description: {
            type: 'string',
            nullable: true
          },
          questionLimit: {
            type: 'integer',
            minimum: 1,
            maximum: 500,
            nullable: true
          },
          isActive: {
            type: 'boolean',
            description: 'Admin can explicitly publish or hide a test.'
          },
          questions: {
            type: 'array',
            items: ref('QuestionInput')
          }
        },
        required: ['title', 'questions']
      },
      UpdateTestRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 5,
            maxLength: 200
          },
          description: {
            type: 'string',
            nullable: true
          },
          questionLimit: {
            type: 'integer',
            minimum: 1,
            maximum: 500,
            nullable: true
          },
          isActive: {
            type: 'boolean'
          }
        }
      },
      TestMutationResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string'
          },
          test: ref('Test')
        },
        required: ['message', 'test']
      },
      QuestionMutationResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string'
          },
          question: ref('Question')
        },
        required: ['message', 'question']
      },
      SubmitTestRequest: {
        type: 'object',
        properties: {
          answers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                questionId: {
                  type: 'integer'
                },
                answer: {
                  oneOf: [
                    {
                      type: 'array',
                      items: {
                        type: 'integer'
                      }
                    },
                    {
                      type: 'object',
                      additionalProperties: {
                        type: 'integer'
                      }
                    }
                  ]
                }
              }
            },
            example: [
              { questionId: 100, answer: [0] },
              { questionId: 101, answer: [1, 2] }
            ]
          },
          questionIds: {
            type: 'array',
            items: {
              type: 'integer'
            }
          },
          persistResult: {
            type: 'boolean',
            default: true
          },
          durationSeconds: {
            type: 'integer',
            minimum: 0,
            maximum: 86400,
            nullable: true,
            description: 'Elapsed test time in seconds.'
          }
        },
        required: ['answers']
      },
      SubmitTestResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string'
          },
          saved: {
            type: 'boolean'
          },
          result: {
            nullable: true,
            allOf: [ref('TestResult')]
          },
          score: {
            type: 'integer'
          },
          totalQuestions: {
            type: 'integer'
          },
          incorrectQuestionIds: {
            type: 'array',
            items: {
              type: 'integer'
            }
          }
        }
      },
      SaveResultRequest: {
        allOf: [
          ref('SubmitTestRequest'),
          {
            type: 'object',
            properties: {
              testId: {
                type: 'integer',
                minimum: 1
              }
            },
            required: ['testId']
          }
        ]
      },
      SaveResultResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string'
          },
          result: ref('TestResult'),
          score: {
            type: 'integer'
          },
          totalQuestions: {
            type: 'integer'
          },
          incorrectQuestionIds: {
            type: 'array',
            items: {
              type: 'integer'
            }
          }
        }
      },
      QuestionStatistics: {
        type: 'object',
        properties: {
          questionId: {
            type: 'integer'
          },
          order: {
            type: 'integer'
          },
          questionText: {
            type: 'string'
          },
          correctCount: {
            type: 'integer'
          },
          incorrectCount: {
            type: 'integer'
          },
          totalAnswers: {
            type: 'integer'
          },
          correctPercent: {
            type: 'integer',
            minimum: 0,
            maximum: 100
          }
        }
      },
      TestStatistics: {
        type: 'object',
        properties: {
          testId: {
            type: 'integer'
          },
          totalAttempts: {
            type: 'integer'
          },
          averageScore: {
            type: 'integer'
          },
          averagePercent: {
            type: 'integer',
            minimum: 0,
            maximum: 100
          },
          averageDurationSeconds: {
            type: 'integer',
            nullable: true
          },
          questionStats: {
            type: 'array',
            items: ref('QuestionStatistics')
          },
          results: {
            type: 'array',
            items: ref('TestResult')
          }
        }
      },
      UpdateUserRoleRequest: {
        type: 'object',
        properties: {
          role: ref('Role')
        },
        required: ['role']
      },
      UserMutationResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string'
          },
          user: ref('User')
        },
        required: ['message', 'user']
      },
      UpdateTestModerationRequest: {
        type: 'object',
        properties: {
          isActive: {
            type: 'boolean'
          }
        },
        required: ['isActive']
      },
      UpdateSettingsRequest: {
        type: 'object',
        properties: {
          settings: {
            type: 'object',
            properties: {
              platformName: {
                type: 'string',
                minLength: 1,
                maxLength: 100
              },
              publicRegistrationEnabled: {
                type: 'boolean'
              },
              teacherTestsRequireModeration: {
                type: 'boolean'
              }
            }
          }
        },
        required: ['settings']
      },
      SettingsMutationResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string'
          },
          settings: {
            type: 'array',
            items: ref('SystemSetting')
          }
        },
        required: ['message', 'settings']
      }
    }
  }
};

const setupSwagger = (app) => {
  app.get('/api/docs.json', (req, res) => {
    res.json(openApiDocument);
  });

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'Test Constructor API Docs',
      swaggerOptions: {
        persistAuthorization: true
      }
    })
  );
};

module.exports = {
  openApiDocument,
  setupSwagger
};
