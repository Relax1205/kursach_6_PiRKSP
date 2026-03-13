const axios = require('axios');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const RESULTS_DIR = './tests/fuzzing/results';

// Создание директории для результатов
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Векторы атак для fuzzing
const attackVectors = {
  sqlInjection: [
    "' OR '1'='1",
    "'; DROP TABLE users;--",
    "' UNION SELECT * FROM users--",
    "1; DELETE FROM tests--",
    "admin'--",
    "' OR 1=1--",
    "1' AND '1'='1",
    "'; EXEC xp_cmdshell('dir')--"
  ],
  xss: [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "\"><script>alert('XSS')</script>",
    "<svg onload=alert('XSS')>",
    "javascript:alert('XSS')",
    "<iframe src='javascript:alert(1)'>"
  ],
  pathTraversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "....//....//....//etc/passwd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
  ],
  commandInjection: [
    "; cat /etc/passwd",
    "| ls -la",
    "&& whoami",
    "$(id)",
    "`whoami`"
  ],
  bufferOverflow: [
    "A".repeat(1000),
    "A".repeat(5000),
    "A".repeat(10000),
    "A".repeat(50000)
  ],
  nullBytes: [
    "\x00",
    "test\x00admin",
    "%00",
    "admin%00"
  ]
};

// Результаты тестирования
const results = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  tests: []
};

// Функция для логирования результатов
function logResult(testName, endpoint, method, payload, statusCode, response) {
  const result = {
    testName,
    endpoint,
    method,
    payload: payload.substring(0, 100) + (payload.length > 100 ? '...' : ''),
    statusCode,
    response: response?.substring(0, 200),
    timestamp: new Date().toISOString(),
    vulnerability: statusCode < 500 && statusCode !== 400 && statusCode !== 401 && statusCode !== 403
  };
  
  results.tests.push(result);
  
  if (result.vulnerability) {
    console.log(`⚠️  POTENTIAL VULNERABILITY: ${testName} on ${endpoint}`);
  } else {
    console.log(`✅ Safe: ${testName} on ${endpoint} (${statusCode})`);
  }
}

// Тестирование SQL Injection
async function testSQLInjection() {
  console.log('\n🔍 Testing SQL Injection...\n');
  
  const endpoints = [
    { method: 'POST', url: '/api/auth/login', body: { email: '', password: 'test' } },
    { method: 'POST', url: '/api/auth/register', body: { email: '', password: 'test123', name: 'Test' } },
    { method: 'GET', url: '/api/tests/', params: {} }
  ];

  for (const vector of attackVectors.sqlInjection) {
    for (const endpoint of endpoints) {
      try {
        let config = {
          method: endpoint.method,
          url: `${BASE_URL}${endpoint.url}`,
          headers: { 'Content-Type': 'application/json' }
        };

        if (endpoint.method === 'POST') {
          config.data = { ...endpoint.body, email: `test${vector}@test.com` };
        } else {
          config.url += encodeURIComponent(vector);
        }

        const response = await axios(config);
        logResult('SQL Injection', endpoint.url, endpoint.method, vector, response.status, response.data);
      } catch (error) {
        logResult('SQL Injection', endpoint.url, endpoint.method, vector, error.response?.status || 'ERROR', error.message);
      }
    }
  }
}

// Тестирование XSS
async function testXSS() {
  console.log('\n🔍 Testing XSS...\n');
  
  for (const vector of attackVectors.xss) {
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, {
        email: `test${Date.now()}@test.com`,
        password: 'test123',
        name: vector
      });
      logResult('XSS', '/api/auth/register', 'POST', vector, response.status, response.data);
    } catch (error) {
      logResult('XSS', '/api/auth/register', 'POST', vector, error.response?.status || 'ERROR', error.message);
    }
  }
}

// Тестирование авторизации
async function testAuth() {
  console.log('\n🔍 Testing Authentication...\n');
  
  const authTests = [
    { name: 'No Token', headers: {} },
    { name: 'Invalid Token', headers: { Authorization: 'Bearer invalid_token_here' } },
    { name: 'Empty Token', headers: { Authorization: 'Bearer ' } },
    { name: 'Malformed Token', headers: { Authorization: 'NotBearer token' } }
  ];

  for (const test of authTests) {
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/profile`, {
        headers: test.headers
      });
      logResult('Auth', '/api/auth/profile', 'GET', test.name, response.status, response.data);
    } catch (error) {
      logResult('Auth', '/api/auth/profile', 'GET', test.name, error.response?.status || 'ERROR', error.message);
    }
  }
}

// Тестирование ролевой модели
async function testRBAC(token, role) {
  console.log(`\n🔍 Testing RBAC for ${role}...\n`);
  
  const tests = [
    { name: 'Create Test (Teacher Only)', method: 'POST', url: '/api/tests', expected: role === 'teacher' || role === 'admin' ? [201, 200] : [403] },
    { name: 'Delete Test (Teacher Only)', method: 'DELETE', url: '/api/tests/999', expected: role === 'teacher' || role === 'admin' ? [404, 403, 200] : [403] }
  ];

  for (const test of tests) {
    try {
      const response = await axios({
        method: test.method,
        url: `${BASE_URL}${test.url}`,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { title: 'Test', description: 'Test' }
      });
      logResult('RBAC', test.url, test.method, test.name, response.status, response.data);
    } catch (error) {
      logResult('RBAC', test.url, test.method, test.name, error.response?.status || 'ERROR', error.message);
    }
  }
}

// Тестирование Buffer Overflow
async function testBufferOverflow() {
  console.log('\n🔍 Testing Buffer Overflow...\n');
  
  for (const vector of attackVectors.bufferOverflow) {
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, {
        email: `${vector}@test.com`,
        password: 'test123',
        name: vector.substring(0, 100)
      });
      logResult('Buffer Overflow', '/api/auth/register', 'POST', `Length: ${vector.length}`, response.status, response.data);
    } catch (error) {
      logResult('Buffer Overflow', '/api/auth/register', 'POST', `Length: ${vector.length}`, error.response?.status || 'ERROR', error.message);
    }
  }
}

// Запуск всех тестов
async function runAllTests() {
  console.log('🚀 Starting Fuzzing Tests...\n');
  console.log(`Target: ${BASE_URL}\n`);
  
  await testSQLInjection();
  await testXSS();
  await testAuth();
  await testBufferOverflow();
  
  // Сохранение результатов
  const fileName = `${RESULTS_DIR}/fuzzing-report-${Date.now()}.json`;
  fs.writeFileSync(fileName, JSON.stringify(results, null, 2));
  
  console.log(`\n📊 Results saved to: ${fileName}`);
  console.log(`\n✅ Fuzzing tests completed!`);
  
  // Summary
  const vulnerabilities = results.tests.filter(t => t.vulnerability);
  console.log(`\n⚠️  Potential vulnerabilities found: ${vulnerabilities.length}`);
  console.log(`✅ Safe tests: ${results.tests.length - vulnerabilities.length}`);
}

runAllTests().catch(console.error);