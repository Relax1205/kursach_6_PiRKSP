require('dotenv').config();
const { sequelize, User, Test, Question } = require('../models');

const demoTests = [
  {
    title: 'Тест по РБД',
    description: 'Базовые вопросы по реляционным базам данных',
    questions: [
      {
        question: 'Что в терминологии реляционной модели данных соответствует понятию «кортеж»?',
        options: [
          'Строка таблицы',
          'Множество всех таблиц в базе данных',
          'Заголовок столбца',
          'Программный интерфейс доступа к данным'
        ],
        correct: [0]
      },
      {
        question: 'Какие результаты могут принимать логические выражения в SQL в связи с поддержкой NULL-значений?',
        type: 'multiple',
        options: [
          'UNKNOWN (неизвестно)',
          'VOID (пустота)',
          'FALSE (ложь)',
          'TRUE (истина)'
        ],
        correct: [0, 2, 3]
      },
      {
        question: 'В чем заключается особенность использования ROWS при определении границ окна?',
        options: [
          'Позволяет изменять данные в таблице через оконный интерфейс',
          'Основывается на физическом положении строк относительно текущей строки',
          'Включает в себя значения в определенном диапазоне значений столбца сортировки',
          'Автоматически удаляет пустые строки из текущего окна'
        ],
        correct: [1]
      },
      {
        question: 'Какие условия обязательны для того, чтобы представление было автоматически изменяемым?',
        type: 'multiple',
        options: [
          'Обязательное наличие оператора GROUP BY в определении',
          'Отсутствие агрегатных функций в списке выборки',
          'Использование оператора DISTINCT на верхнем уровне',
          'Список FROM содержит одну таблицу или изменяемое представление'
        ],
        correct: [1, 3]
      },
      {
        question: 'Установите соответствие между категорией оконной функции и её основным назначением.',
        type: 'matching',
        left: [
          'Выполняют арифметические вычисления на наборе данных',
          'Ранжируют значение для каждой строки в окне',
          'Позволяют обращаться к разным строкам окна'
        ],
        right: [
          '1. Агрегатные',
          '2. Ранжирующие',
          '3. Функции смещения'
        ],
        correct: [0, 1, 2]
      }
    ]
  },
  {
    title: 'Основы SQL',
    description: 'Короткая проверка операторов, фильтрации и группировки данных',
    questions: [
      {
        question: 'Какой оператор используется для выборки данных из таблицы?',
        options: ['SELECT', 'INSERT', 'UPDATE', 'DROP'],
        correct: [0]
      },
      {
        question: 'Какие конструкции относятся к фильтрации или ограничению выборки?',
        type: 'multiple',
        options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'],
        correct: [0, 1, 3]
      },
      {
        question: 'Установите соответствие между SQL-конструкцией и назначением.',
        type: 'matching',
        left: [
          'Фильтрует строки до группировки',
          'Сортирует результат',
          'Группирует строки по общему признаку'
        ],
        right: ['WHERE', 'ORDER BY', 'GROUP BY'],
        correct: [0, 1, 2]
      }
    ]
  },
  {
    title: 'Проектирование БД',
    description: 'Мини-тест по связям, ключам и нормализации',
    questions: [
      {
        question: 'Что обычно обеспечивает внешний ключ?',
        options: [
          'Связь между таблицами и ссылочную целостность',
          'Шифрование всех строк таблицы',
          'Автоматическое создание резервной копии',
          'Сортировку данных по умолчанию'
        ],
        correct: [0]
      },
      {
        question: 'Какие признаки относятся к третьей нормальной форме?',
        type: 'multiple',
        options: [
          'Нет транзитивных зависимостей неключевых атрибутов',
          'Все атрибуты зависят от ключа',
          'Все данные хранятся в одной таблице',
          'Повторяющиеся группы вынесены из строк'
        ],
        correct: [0, 1, 3]
      },
      {
        question: 'Сопоставьте элемент модели данных с примером.',
        type: 'matching',
        left: ['Таблица', 'Первичный ключ', 'Атрибут'],
        right: ['students', 'student_id', 'email'],
        correct: [0, 1, 2]
      }
    ]
  },
  {
    title: 'Git и Docker',
    description: 'Практический минимум по контролю версий и контейнерам',
    questions: [
      {
        question: 'Какая команда фиксирует подготовленные изменения в Git?',
        options: ['git commit', 'git push', 'git clone', 'git status'],
        correct: [0]
      },
      {
        question: 'Какие файлы обычно относятся к Docker-развёртыванию приложения?',
        type: 'multiple',
        options: ['Dockerfile', 'docker-compose.yml', '.gitignore', 'package-lock.json'],
        correct: [0, 1]
      },
      {
        question: 'Установите соответствие между командой и действием.',
        type: 'matching',
        left: [
          'Показывает состояние рабочей директории',
          'Собирает образ из Dockerfile',
          'Запускает сервисы compose'
        ],
        right: ['git status', 'docker build', 'docker compose up'],
        correct: [0, 1, 2]
      }
    ]
  },
  {
    title: '12 факторов приложения',
    description: 'Короткий тест по конфигурации, зависимостям и процессам',
    questions: [
      {
        question: 'Где по методологии 12 факторов рекомендуется хранить конфигурацию?',
        options: [
          'В переменных окружения',
          'В исходном коде',
          'В комментариях README',
          'В названии ветки Git'
        ],
        correct: [0]
      },
      {
        question: 'Какие идеи относятся к методологии 12 факторов?',
        type: 'multiple',
        options: [
          'Явное объявление зависимостей',
          'Разделение build, release и run',
          'Хранение состояния в процессе приложения',
          'Логи как поток событий'
        ],
        correct: [0, 1, 3]
      },
      {
        question: 'Сопоставьте фактор с практическим примером.',
        type: 'matching',
        left: [
          'Зависимости описаны в manifest-файле',
          'Настройки передаются через env',
          'Приложение пишет события в stdout'
        ],
        right: ['Зависимости', 'Конфигурация', 'Логи'],
        correct: [0, 1, 2]
      }
    ]
  }
];

const legacyTitles = new Map([
  ['Тест по РБД', `${String.fromCodePoint(0x1f4ca)} Тест по РБД`]
]);

async function upsertDemoTest(demoTest, authorId) {
  const legacyTitle = legacyTitles.get(demoTest.title);
  const existingTest = await Test.findOne({ where: { title: demoTest.title } }) ||
    (legacyTitle ? await Test.findOne({ where: { title: legacyTitle } }) : null);

  const test = existingTest ||
    await Test.create({
      title: demoTest.title,
      description: demoTest.description,
      authorId,
      isActive: true
    });

  await test.update({
    title: demoTest.title,
    description: demoTest.description,
    authorId,
    isActive: true
  });

  for (let index = 0; index < demoTest.questions.length; index++) {
    const question = demoTest.questions[index];
    const [questionRecord, created] = await Question.findOrCreate({
      where: {
        testId: test.id,
        questionText: question.question
      },
      defaults: {
        testId: test.id,
        type: question.type || 'single',
        questionText: question.question,
        options: question.options || null,
        left: question.left || null,
        right: question.right || null,
        correct: question.correct,
        order: index
      }
    });

    if (!created) {
      await questionRecord.update({
        type: question.type || 'single',
        options: question.options || null,
        left: question.left || null,
        right: question.right || null,
        correct: question.correct,
        order: index
      });
    }
  }

  return {
    test,
    questionCount: demoTest.questions.length
  };
}

async function seed() {
  try {
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synchronized');

    const demoUsers = [
      {
        email: 'admin@test.ru',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin'
      },
      {
        email: 'teacher@test.ru',
        password: 'teacher123',
        name: 'Teacher User',
        role: 'teacher'
      },
      {
        email: 'student@test.ru',
        password: 'student123',
        name: 'Student User',
        role: 'student'
      }
    ];

    for (const demoUser of demoUsers) {
      const [user, created] = await User.findOrCreate({
        where: { email: demoUser.email },
        defaults: demoUser
      });

      if (created) {
        console.log(`Created ${demoUser.role} user: ${demoUser.email}`);
      } else {
        await user.update({
          name: demoUser.name,
          role: demoUser.role
        });
      }
    }

    const teacherUser = await User.findOne({ where: { email: 'teacher@test.ru' } });
    let totalQuestions = 0;

    for (const demoTest of demoTests) {
      const result = await upsertDemoTest(demoTest, teacherUser.id);
      totalQuestions += result.questionCount;
      console.log(`Test ready: ${result.test.title} (${result.questionCount} questions)`);
    }

    console.log('Seed completed');
    console.log(`Total tests: ${demoTests.length}`);
    console.log(`Total questions: ${totalQuestions}`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
