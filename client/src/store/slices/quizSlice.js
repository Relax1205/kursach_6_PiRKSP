import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Начальное состояние
const initialState = {
  questions: [],
  currentQuestion: 0,
  correctCount: 0,
  wrongQuestions: [],
  mode: 'main',
  isFinished: false,
  userAnswers: [],
  isLoading: false,
  error: null,
};

// Асинхронный thunk для загрузки вопросов с сервера
export const fetchQuestions = createAsyncThunk(
  'quiz/fetchQuestions',
  async (testId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/tests/${testId}/questions`);
      console.log('📥 API Response:', response.data); // 🔍 ОТЛАДКА
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Ошибка загрузки вопросов');
    }
  }
);

// Асинхронный thunk для сохранения результатов
export const saveResults = createAsyncThunk(
  'quiz/saveResults',
  async ({ testId, score, total, answers }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/results', {
        testId,
        score,
        total,
        answers,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Ошибка сохранения результатов');
    }
  }
);

export const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    setQuestions: (state, action) => {
      state.questions = action.payload.map(q =>
        q.type === 'matching' ? shuffleMatchingQuestion(q) : { ...q }
      );
      state.currentQuestion = 0;
      state.correctCount = 0;
      state.wrongQuestions = [];
      state.isFinished = false;
      state.userAnswers = [];
      state.error = null;
    },
    nextQuestion: (state) => {
      if (state.currentQuestion < state.questions.length - 1) {
        state.currentQuestion += 1;
      } else {
        state.isFinished = true;
      }
    },
    prevQuestion: (state) => {
      if (state.currentQuestion > 0) {
        state.currentQuestion -= 1;
      }
    },
    addCorrect: (state) => {
      state.correctCount += 1;
    },
    addWrong: (state, action) => {
      const exists = state.wrongQuestions.some(
        q => q.question === action.payload.question
      );
      if (!exists) {
        state.wrongQuestions.push(action.payload);
      }
    },
    removeWrong: (state, action) => {
      state.wrongQuestions = state.wrongQuestions.filter(
        q => q.question !== action.payload.question
      );
    },
    setModeWrong: (state) => {
      state.mode = 'wrong';
      state.questions = state.wrongQuestions.map(q =>
        q.type === 'matching' ? shuffleMatchingQuestion(q) : { ...q }
      );
      state.currentQuestion = 0;
      state.isFinished = false;
    },
    resetQuiz: (state) => {
      return initialState;
    },
    setUserAnswer: (state, action) => {
      const { questionIndex, answer } = action.payload;
      const existingIndex = state.userAnswers.findIndex(
        a => a.questionIndex === questionIndex
      );
      if (existingIndex >= 0) {
        state.userAnswers[existingIndex] = { questionIndex, answer };
      } else {
        state.userAnswers.push({ questionIndex, answer });
      }
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuestions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuestions.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // 🔍 ОТЛАДКА: Проверяем данные
        console.log('📊 Всего вопросов:', action.payload.length);
        console.log('📊 Matching вопросов:', action.payload.filter(q => q.type === 'matching').length);
        
        // 1. Маппинг вопросов
        let questions = action.payload.map(q => {
          const mapped = {
            ...q,
            question: q.questionText || q.question,
            type: q.type || 'single',
            options: q.options || [],
            left: q.left || [],        // ✅ Важно
            right: q.right || [],      // ✅ Важно
            correct: q.correct || []
          };
          
          // 🔍 ОТЛАДКА для matching
          if (mapped.type === 'matching') {
            console.log('🎯 Matching вопрос:', {
              id: mapped.id,
              question: mapped.question?.substring(0, 50),
              left: mapped.left,
              right: mapped.right,
              correct: mapped.correct
            });
          }
          
          return mapped;
        });
        
        // 2. Перемешиваем порядок вопросов
        questions = shuffle(questions);
        
        // 3. Перемешиваем варианты внутри вопросов
        questions = questions.map(q => {
          if (q.type === 'matching') {
            const shuffled = shuffleMatchingQuestion(q);
            console.log('🔀 После перемешивания:', {
              question: shuffled.question?.substring(0, 30),
              left: shuffled.left,
              right: shuffled.right,
              correct: shuffled.correct
            });
            return shuffled;
          } else if (q.options && q.options.length > 0) {
            return shuffleQuestionWithOptions(q);
          }
          return q;
        });
        
        state.questions = questions;
        state.userAnswers = [];
        
        console.log('✅ Вопросы загружены в Redux:', state.questions.length);
      })
      .addCase(fetchQuestions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

// Функция перемешивания вопросов с вариантами ответов
function shuffleQuestionWithOptions(q) {
  const shuffled = { ...q };
  if (q.options && q.options.length > 0 && q.correct && q.correct.length > 0) {
    const indices = q.options.map((_, i) => i);
    const shuffledIndices = shuffle(indices);
    shuffled.options = shuffledIndices.map(i => q.options[i]);
    const oldToNewIndex = {};
    shuffledIndices.forEach((oldIdx, newIdx) => {
      oldToNewIndex[oldIdx] = newIdx;
    });
    shuffled.correct = q.correct.map(oldIdx => oldToNewIndex[oldIdx]);
  }
  return shuffled;
}

// Функция перемешивания для matching вопросов
function shuffleMatchingQuestion(q) {
  const shuffled = { ...q };
  if (q.left && q.left.length > 0 && q.right && q.right.length > 0) {
    const leftIndices = q.left.map((_, i) => i);
    const shuffledLeftIndices = shuffle(leftIndices);
    shuffled.left = shuffledLeftIndices.map(i => q.left[i]);
    const oldIndexToNewIndex = {};
    shuffledLeftIndices.forEach((oldIdx, newIdx) => {
      oldIndexToNewIndex[oldIdx] = newIdx;
    });
    shuffled.correct = q.correct.map(
      oldLeftIndex => oldIndexToNewIndex[oldLeftIndex]
    );
  }
  return shuffled;
}

// Алгоритм Фишера-Йетса
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const {
  setQuestions,
  nextQuestion,
  prevQuestion,
  addCorrect,
  addWrong,
  removeWrong,
  setModeWrong,
  resetQuiz,
  setUserAnswer,
  setLoading,
  setError,
} = quizSlice.actions;

export default quizSlice.reducer;