const {
  ROLE_VALUES,
  ROLES,
  canAccessTest,
  canManageTest,
  isAdmin,
} = require('../src/constants/roles');

describe('roles constants and helpers', () => {
  test('exports role values', () => {
    expect(ROLES).toEqual({
      STUDENT: 'student',
      TEACHER: 'teacher',
      ADMIN: 'admin',
    });
    expect(ROLE_VALUES).toEqual(['student', 'teacher', 'admin']);
  });

  test('checks admin users', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true);
    expect(isAdmin({ role: 'teacher' })).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  test('checks test management access', () => {
    expect(canManageTest(null, { authorId: 1 })).toBe(false);
    expect(canManageTest({ role: 'teacher', id: 1 }, null)).toBe(false);
    expect(canManageTest({ role: 'admin', id: 2 }, { authorId: 1 })).toBe(true);
    expect(canManageTest({ role: 'teacher', id: 1 }, { authorId: 1 })).toBe(true);
    expect(canManageTest({ role: 'teacher', id: 2 }, { authorId: 1 })).toBe(false);
  });

  test('checks test viewing access', () => {
    expect(canAccessTest({ role: 'student' }, null)).toBe(false);
    expect(canAccessTest(null, { isActive: true })).toBe(true);
    expect(canAccessTest(null, { isActive: false, authorId: 1 })).toBe(false);
    expect(canAccessTest({ role: 'teacher', id: 1 }, { isActive: false, authorId: 1 })).toBe(true);
  });
});
