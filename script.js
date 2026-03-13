function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shuffleMatchingQuestion(q) {
  const shuffled = { ...q };

  const leftIndices = q.left.map((_, i) => i);
  const shuffledLeftIndices = shuffle(leftIndices);
  shuffled.left = shuffledLeftIndices.map(i => q.left[i]);
  const oldIndexToNewIndex = {};
  shuffledLeftIndices.forEach((oldIdx, newIdx) => {
    oldIndexToNewIndex[oldIdx] = newIdx;
  });

  shuffled.correct = q.correct.map(oldLeftIndex => oldIndexToNewIndex[oldLeftIndex]);

  return shuffled;
}

let questions = [];
let currentQuestion = 0;
let mode = 'main';
let correctCount = 0;
let wrongQuestions = [];

const quizDiv = document.getElementById("quiz");
const scoreDiv = document.getElementById("score");

window.onload = () => {
  startQuiz();
};

function startQuiz() {
  mode = 'main';
  questions = shuffle(Questions).map(q => 
    q.type === "matching" ? shuffleMatchingQuestion(q) : { ...q }
  );
  currentQuestion = 0;
  correctCount = 0;
  updateScoreDisplay();
  loadQuestion();
}

function showWrong() {
  if (wrongQuestions.length === 0) {
    alert("Вы пока не допустили ошибок.");
    return;
  }
  mode = 'wrong';
  questions = wrongQuestions.map(q => 
    q.type === "matching" ? shuffleMatchingQuestion(q) : { ...q }
  );
  currentQuestion = 0;
  scoreDiv.textContent = `Вы допустили ${questions.length} ошибок. Исправьте их.`;
  loadQuestion();
}

function updateScoreDisplay() {
  const totalQuestions = Questions.length;
  const answered = currentQuestion + 1;
  scoreDiv.textContent = `Пройдено вопросов: ${answered} / ${totalQuestions}`;
}

function loadQuestion() {
  if (questions.length === 0) {
    showFinalScreen();
    return;
  }

  const q = questions[currentQuestion];
  let content = '';

  if (q.type === "matching") {
    const matchingHtml = q.right.map((item, idx) => `
      <div style="margin: 8px 0; display: flex; align-items: center; flex-wrap: wrap;">
        <span style="margin-right: 10px; min-width: 300px;">${item}</span>
        <select data-right-index="${idx}">
          <option value="">--</option>
          ${q.left.map((desc, i) => `<option value="${i}">${desc}</option>`).join('')}
        </select>
      </div>
    `).join('');

    content = `
      <div class="question-block">
        <h3>${q.question}</h3>
        <div><strong>Сопоставьте:</strong></div>
        ${matchingHtml}
        <button onclick="checkAnswer()">Проверить</button>
        <div class="result" id="result"></div>
        <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button onclick="nextQuestion()">➡ Вперёд</button>
          <button onclick="prevQuestion()">⬅ Назад</button>
        </div>
      </div>
    `;
  } else {
    const isSingleAnswer = q.correct.length === 1;
    const optionIndices = q.options.map((_, i) => i);
    const shuffledIndices = shuffle(optionIndices);

    let errorInfo = '';
    if (mode === 'wrong') {
      errorInfo = `
        <div style="text-align:center; margin: 10px 0; font-weight:bold;">
          Ошибка ${currentQuestion + 1} из ${questions.length}
        </div>
      `;
    }

    content = `
      <div class="question-block">
        ${errorInfo}
        <h3>${q.question}</h3>
        <div class="options">
          ${shuffledIndices.map(i => `
            <label>
              ${isSingleAnswer ? 
                `<input type="radio" name="answer" data-index="${i}">` : 
                `<input type="checkbox" data-index="${i}">`}
              ${q.options[i]}
            </label>`).join('')}
        </div>
        <button onclick="checkAnswer()">Проверить</button>
        <div class="result" id="result"></div>
        <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button onclick="nextQuestion()">➡ Вперёд</button>
          <button onclick="prevQuestion()">⬅ Назад</button>
        </div>
      </div>
    `;
  }

  quizDiv.innerHTML = content;
}

function checkAnswer() {
  const q = questions[currentQuestion];
  const resultDiv = document.getElementById("result");

  if (q.type === "matching") {
    const selects = document.querySelectorAll('select[data-right-index]');
    let selected = Array(q.right.length).fill(null);

    let allFilled = true;
    selects.forEach(sel => {
      const idx = parseInt(sel.getAttribute("data-right-index"));
      const val = sel.value;
      if (val === "") {
        allFilled = false;
      } else {
        selected[idx] = parseInt(val);
      }
    });

    if (!allFilled) {
      resultDiv.innerHTML = '<span class="incorrect">❌ Заполните все поля.</span>';
      return;
    }

    const isCorrect = selected.every((leftIdx, rightIdx) => leftIdx === q.correct[rightIdx]);

    if (isCorrect) {
      resultDiv.innerHTML = '<span class="correct">✅ Правильно!</span>';
      if (mode === 'main') correctCount++;
      if (mode === 'wrong') {
        const indexInWrong = wrongQuestions.findIndex(item => item.question === q.question);
        if (indexInWrong > -1) wrongQuestions.splice(indexInWrong, 1);
      }
    } else {
      resultDiv.innerHTML = '<span class="incorrect">❌ Неправильно.</span>';
      if (mode === 'main' && !wrongQuestions.some(item => item.question === q.question)) {
        wrongQuestions.push({...q});
      }
    }
  } else {
    const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    let selected = [];

    inputs.forEach(el => {
      if (el.checked) {
        selected.push(parseInt(el.getAttribute("data-index")));
      }
    });

    const correctSet = new Set(q.correct);
    const selectedSet = new Set(selected);

    if (arraysEqual([...selected].sort(), [...q.correct].sort())) {
      resultDiv.innerHTML = '<span class="correct">✅ Правильно!</span>';
      if (mode === 'main') correctCount++;
      if (mode === 'wrong') {
        const indexInWrong = wrongQuestions.findIndex(item => item.question === q.question);
        if (indexInWrong > -1) {
          wrongQuestions.splice(indexInWrong, 1);
        }
      }
    } else {
      resultDiv.innerHTML = '<span class="incorrect">❌ Неправильно.</span><br>';
      if (mode === 'main') {
        if (!wrongQuestions.some(item => item.question === q.question)) {
          wrongQuestions.push({...q});
        }
      }
      inputs.forEach(el => {
        const idx = parseInt(el.getAttribute("data-index"));
        if (correctSet.has(idx)) el.parentElement.style.color = 'green';
        else if (selectedSet.has(idx)) el.parentElement.style.color = 'red';
      });
    }
  }

  updateScoreDisplay();
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((val, i) => val === b[i]);
}

function nextQuestion() {
  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    loadQuestion();
  } else {
    currentQuestion++;
    loadQuestion();
  }
}

function prevQuestion() {
  if (currentQuestion > 0) {
    currentQuestion--;
    loadQuestion();
  }
}

function showFinalScreen() {
  const total = Questions.length;
  const percent = Math.round((correctCount / total) * 100);

  let resultText = "";
  if (percent >= 90) {
    resultText = "Отлично! Вы отлично знаете материал.";
  } else if (percent >= 70) {
    resultText = "Хорошо! Знания на высоте.";
  } else if (percent >= 50) {
    resultText = "Удовлетворительно. Есть над чем поработать.";
  } else {
    resultText = "Нужно больше учиться. Попробуйте ещё раз!";
  }

  quizDiv.innerHTML = `
    <div class="question-block" style="text-align: center;">
      <h2>Тест завершён!</h2>
      <p style="font-size: 20px;">Вы ответили правильно на <strong>${correctCount} из ${total}</strong> вопросов</p>
      <p style="font-size: 18px;">(${percent}% правильных ответов)</p>
      <p style="font-size: 16px;">${resultText}</p>
      <button onclick="showWrong()" style="margin: 10px; background-color:#000; color:white;">🔁 Повторить ошибки</button>
      <button onclick="startQuiz()" style="margin: 10px; background-color:#000; color:white;">🔄 Пройти тест заново</button>
    </div>
  `;
}