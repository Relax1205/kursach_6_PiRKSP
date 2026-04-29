const ROLES = Object.freeze({
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin'
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

const isAdmin = (user) => user?.role === ROLES.ADMIN;

const canManageTest = (user, test) => {
  if (!user || !test) {
    return false;
  }

  return isAdmin(user) || (user.role === ROLES.TEACHER && test.authorId === user.id);
};

const canAccessTest = (user, test) => {
  if (!test) {
    return false;
  }

  return test.isActive || canManageTest(user, test);
};

module.exports = {
  ROLES,
  ROLE_VALUES,
  isAdmin,
  canManageTest,
  canAccessTest
};
