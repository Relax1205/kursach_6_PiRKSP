const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const RESULTS_DIR = path.join(__dirname, 'results');

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const attackVectors = {
  sqlInjection: [
    "' OR '1'='1",
    "'; DROP TABLE users;--",
    "' UNION SELECT * FROM users--",
    "admin'--",
    "' OR 1=1--"
  ],
  xss: [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "<svg onload=alert('XSS')>"
  ],
  pathTraversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
  ],
  commandInjection: [
    "; cat /etc/passwd",
    "&& whoami",
    "$(id)"
  ],
  bufferOverflow: [
    "A".repeat(1000),
    "A".repeat(5000),
    "A".repeat(10000)
  ],
  nullBytes: [
    "\x00",
    "test\x00admin",
    "%00"
  ]
};

const demoUsers = [
  { role: 'admin', email: 'admin@test.ru', password: 'admin123' },
  { role: 'teacher', email: 'teacher@test.ru', password: 'teacher123' },
  { role: 'student', email: 'student@test.ru', password: 'student123' }
];

const results = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  tests: []
};

function normalizePayload(payload) {
  return JSON.stringify(payload).slice(0, 200);
}

function logResult({ testName, endpoint, method, payload, statusCode, response, expectedStatuses }) {
  const normalizedStatus = typeof statusCode === 'number' ? statusCode : 'ERROR';
  const passed = expectedStatuses.includes(normalizedStatus);

  const result = {
    testName,
    endpoint,
    method,
    payload: normalizePayload(payload),
    statusCode: normalizedStatus,
    response: String(response).slice(0, 300),
    expectedStatuses,
    passed,
    timestamp: new Date().toISOString()
  };

  results.tests.push(result);

  if (passed) {
    console.log(`PASS ${testName} -> ${endpoint} (${normalizedStatus})`);
  } else {
    console.log(`WARN ${testName} -> ${endpoint} (${normalizedStatus})`);
  }
}

async function requestWithLog({ testName, endpoint, method, payload, expectedStatuses, headers = {} }) {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      validateStatus: () => true
    });

    logResult({
      testName,
      endpoint,
      method,
      payload,
      statusCode: response.status,
      response: response.data,
      expectedStatuses
    });

    return response;
  } catch (error) {
    logResult({
      testName,
      endpoint,
      method,
      payload,
      statusCode: error.response?.status || 'ERROR',
      response: error.message,
      expectedStatuses
    });

    return null;
  }
}

async function login(email, password) {
  const response = await requestWithLog({
    testName: 'Auth Login',
    endpoint: '/api/auth/login',
    method: 'POST',
    payload: { email, password },
    expectedStatuses: [200]
  });

  return response?.data?.token || null;
}

async function ensureApiIsAvailable() {
  try {
    const response = await axios.get(`${BASE_URL}/api/health`, {
      timeout: 5000,
      validateStatus: () => true
    });

    if (response.status === 200) {
      return true;
    }

    console.error(`ERROR API healthcheck returned ${response.status}.`);
  } catch (error) {
    console.error(`ERROR API is unavailable at ${BASE_URL}: ${error.message}`);
  }

  console.error('\nStart the backend before fuzzing, for example:');
  console.error('  docker compose --env-file .env.example up -d --build backend');
  console.error('  docker compose --env-file .env.example exec -T backend npm run seed\n');
  process.exitCode = 1;
  return false;
}

async function testSQLInjection() {
  console.log('\nTesting SQL injection...\n');

  for (const vector of attackVectors.sqlInjection) {
    await requestWithLog({
      testName: 'SQL Injection Login',
      endpoint: '/api/auth/login',
      method: 'POST',
      payload: { email: `test${vector}@test.ru`, password: 'test123' },
      expectedStatuses: [400, 401]
    });

    await requestWithLog({
      testName: 'SQL Injection Route',
      endpoint: `/api/tests/${encodeURIComponent(vector)}`,
      method: 'GET',
      payload: vector,
      expectedStatuses: [400, 404]
    });
  }
}

async function testXSS() {
  console.log('\nTesting XSS payload handling...\n');

  for (const vector of attackVectors.xss) {
    await requestWithLog({
      testName: 'XSS Register Payload',
      endpoint: '/api/auth/register',
      method: 'POST',
      payload: {
        email: `xss${Date.now()}@test.ru`,
        password: 'test123',
        name: vector
      },
      expectedStatuses: [201]
    });
  }
}

async function testAuthGuards() {
  console.log('\nTesting authentication guards...\n');

  const authHeaders = [
    {},
    { Authorization: 'Bearer invalid_token_here' },
    { Authorization: 'Bearer ' },
    { Authorization: 'NotBearer token' }
  ];

  for (const headers of authHeaders) {
    await requestWithLog({
      testName: 'Protected Profile Access',
      endpoint: '/api/auth/profile',
      method: 'GET',
      payload: headers,
      headers,
      expectedStatuses: [401]
    });
  }
}

async function testTraversalAndCommandPayloads() {
  console.log('\nTesting path traversal, command injection and null bytes...\n');

  const combinedVectors = [
    ...attackVectors.pathTraversal,
    ...attackVectors.commandInjection,
    ...attackVectors.nullBytes
  ];

  for (const vector of combinedVectors) {
    await requestWithLog({
      testName: 'Traversal/Command Route Probe',
      endpoint: `/api/tests/${encodeURIComponent(vector)}/questions`,
      method: 'GET',
      payload: vector,
      expectedStatuses: [400, 404]
    });
  }
}

async function testBufferOverflow() {
  console.log('\nTesting large payloads...\n');

  for (const vector of attackVectors.bufferOverflow) {
    await requestWithLog({
      testName: 'Large Payload Register',
      endpoint: '/api/auth/register',
      method: 'POST',
      payload: {
        email: `buffer${Date.now()}@test.ru`,
        password: 'test123',
        name: vector
      },
      expectedStatuses: [201, 400]
    });
  }
}

async function testRBAC() {
  console.log('\nTesting RBAC...\n');

  const tokens = {};

  for (const demoUser of demoUsers) {
    tokens[demoUser.role] = await login(demoUser.email, demoUser.password);
  }

  for (const demoUser of demoUsers) {
    const token = tokens[demoUser.role];

    if (!token) {
      console.log(`WARN Skip RBAC checks for ${demoUser.role}: login failed`);
      continue;
    }

    const createResponse = await requestWithLog({
      testName: `RBAC Create Test (${demoUser.role})`,
      endpoint: '/api/tests',
      method: 'POST',
      payload: {
        title: `RBAC ${demoUser.role} ${Date.now()}`,
        description: 'Fuzzing test',
        questions: []
      },
      headers: { Authorization: `Bearer ${token}` },
      expectedStatuses: demoUser.role === 'student' ? [403] : [201]
    });

    if ((demoUser.role === 'teacher' || demoUser.role === 'admin') && createResponse?.status === 201) {
      await requestWithLog({
        testName: `RBAC Delete Test (${demoUser.role})`,
        endpoint: `/api/tests/${createResponse.data.test.id}`,
        method: 'DELETE',
        payload: { id: createResponse.data.test.id },
        headers: { Authorization: `Bearer ${token}` },
        expectedStatuses: [200]
      });
    }
  }
}

async function runAllTests() {
  console.log('Starting fuzzing tests...\n');
  console.log(`Target: ${BASE_URL}\n`);

  const isApiAvailable = await ensureApiIsAvailable();
  if (!isApiAvailable) {
    return;
  }

  await testSQLInjection();
  await testXSS();
  await testAuthGuards();
  await testTraversalAndCommandPayloads();
  await testBufferOverflow();
  await testRBAC();

  const reportFile = `${RESULTS_DIR}/fuzzing-report-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));

  const failedChecks = results.tests.filter((test) => !test.passed);

  console.log(`\nResults saved to: ${reportFile}`);
  console.log(`Passed checks: ${results.tests.length - failedChecks.length}`);
  console.log(`Failed checks: ${failedChecks.length}`);

  if (failedChecks.length > 0) {
    process.exitCode = 1;
  }
}

runAllTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
