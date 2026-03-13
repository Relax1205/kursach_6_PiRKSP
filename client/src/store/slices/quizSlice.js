import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Начальное состояние
const initialState = {
    questions: [],
    currentQuestion: 0,
    correctCount: 0,
    wrongQuestions: [],
    mode: 'main', // 'main' | 'wrong'
    isFinished: false,
    userAnswers: [], // ✅ Хранение ответов пользователя: [{ questionIndex, answer }]
    isLoading: false,
    error: null,
};

// Асинхронный thunk для загрузки вопросов с сервера
export const fetchQuestions = createAsyncThunk(
    'quiz/fetchQuestions',
    async (testId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/api/tests/${testId}/questions`);
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
        // Установка вопросов (для локального тестирования)
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
        // Переход к следующему вопросу
        nextQuestion: (state) => {
            if (state.currentQuestion < state.questions.length - 1) {
                state.currentQuestion += 1;
            } else {
                state.isFinished = true;
            }
        },
        // Переход к предыдущему вопросу
        prevQuestion: (state) => {
            if (state.currentQuestion > 0) {
                state.currentQuestion -= 1;
            }
        },
        // Добавление правильного ответа
        addCorrect: (state) => {
            state.correctCount += 1;
        },
        // Добавление вопроса в ошибки
        addWrong: (state, action) => {
            const exists = state.wrongQuestions.some(
                q => q.question === action.payload.question
            );
            if (!exists) {
                state.wrongQuestions.push(action.payload);
            }
        },
        // Удаление вопроса из ошибок
        removeWrong: (state, action) => {
            state.wrongQuestions = state.wrongQuestions.filter(
                q => q.question !== action.payload.question
            );
        },
        // Режим повторения ошибок
        setModeWrong: (state) => {
            state.mode = 'wrong';
            state.questions = state.wrongQuestions.map(q =>
                q.type === 'matching' ? shuffleMatchingQuestion(q) : { ...q }
            );
            state.currentQuestion = 0;
            state.isFinished = false;
        },
        // Сброс теста
        resetQuiz: (state) => {
            return initialState;
        },
        // ✅ Сохранение ответа пользователя
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
        // Установка состояния загрузки
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },
        // Установка ошибки
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
                // 🔧 Маппинг: questionText → question для совместимости
                state.questions = action.payload.map(q => ({
                    ...q,
                    question: q.questionText || q.question,
                    type: q.type || 'single',
                    options: q.options || [],
                    correct: q.correct || []
                })).map(q =>
                    q.type === 'matching' ? shuffleMatchingQuestion(q) : q
                );
                state.userAnswers = []; // ✅ Сброс ответов при новой загрузке
            })
            .addCase(fetchQuestions.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

// Функция перемешивания для matching вопросов
function shuffleMatchingQuestion(q) {
    const shuffled = { ...q };
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
    return shuffled;
}

// Алгоритм Фишера-Йетса для перемешивания
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