import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { resultsAPI, testsAPI } from '../../services/api';

const initialState = {
  questions: [],
  currentQuestion: 0,
  wrongQuestions: [],
  mode: 'main',
  isFinished: false,
  userAnswers: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  finalResult: null,
};

export const fetchQuestions = createAsyncThunk(
  'quiz/fetchQuestions',
  async (testId, { rejectWithValue }) => {
    try {
      const response = await testsAPI.getQuestions(testId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Ошибка загрузки вопросов');
    }
  }
);

export const submitResults = createAsyncThunk(
  'quiz/submitResults',
  async ({ testId, questionIds, answers, persistResult = true, durationSeconds = null }, { rejectWithValue }) => {
    try {
      const response = await testsAPI.submit(testId, {
        questionIds,
        answers,
        persistResult,
        durationSeconds,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Ошибка отправки результатов');
    }
  }
);

export const fetchMistakeQuestions = createAsyncThunk(
  'quiz/fetchMistakeQuestions',
  async (resultId, { rejectWithValue }) => {
    try {
      const response = await resultsAPI.getMistakes(resultId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Ошибка загрузки ошибок');
    }
  }
);

const prepareQuestion = (question) => {
  const mappedQuestion = {
    ...question,
    question: question.questionText || question.question,
    type: question.type || 'single',
    options: question.options || [],
    left: question.left || [],
    right: question.right || [],
    optionIndexMap: question.optionIndexMap || (question.options ? question.options.map((_, index) => index) : []),
    leftIndexMap: question.leftIndexMap || (question.left ? question.left.map((_, index) => index) : []),
  };

  if (mappedQuestion.type === 'matching') {
    return shuffleMatchingQuestion(mappedQuestion);
  }

  if (mappedQuestion.options.length > 0) {
    return shuffleQuestionWithOptions(mappedQuestion);
  }

  return mappedQuestion;
};

export const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    nextQuestion: (state) => {
      if (state.currentQuestion < state.questions.length - 1) {
        state.currentQuestion += 1;
      }
    },
    prevQuestion: (state) => {
      if (state.currentQuestion > 0) {
        state.currentQuestion -= 1;
      }
    },
    setModeWrong: (state) => {
      if (state.wrongQuestions.length === 0) {
        return;
      }

      state.mode = 'wrong';
      state.questions = state.wrongQuestions.map((question) => prepareQuestion(question));
      state.currentQuestion = 0;
      state.isFinished = false;
      state.userAnswers = [];
      state.error = null;
      state.finalResult = null;
    },
    resetQuiz: () => initialState,
    setUserAnswer: (state, action) => {
      const { questionId, answer } = action.payload;
      const existingAnswerIndex = state.userAnswers.findIndex(
        (userAnswer) => userAnswer.questionId === questionId
      );

      if (existingAnswerIndex >= 0) {
        state.userAnswers[existingAnswerIndex] = { questionId, answer };
        return;
      }

      state.userAnswers.push({ questionId, answer });
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
        state.questions = shuffle(action.payload.map((question) => prepareQuestion(question)));
        state.currentQuestion = 0;
        state.wrongQuestions = [];
        state.mode = 'main';
        state.isFinished = false;
        state.userAnswers = [];
        state.error = null;
        state.finalResult = null;
      })
      .addCase(fetchQuestions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchMistakeQuestions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMistakeQuestions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.questions = shuffle(action.payload.map((question) => prepareQuestion(question)));
        state.currentQuestion = 0;
        state.wrongQuestions = action.payload;
        state.mode = 'wrong';
        state.isFinished = false;
        state.userAnswers = [];
        state.error = null;
        state.finalResult = null;
      })
      .addCase(fetchMistakeQuestions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(submitResults.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitResults.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.isFinished = true;
        state.finalResult = action.payload;
        state.wrongQuestions = state.questions.filter((question) =>
          action.payload.incorrectQuestionIds.includes(question.id)
        );
      })
      .addCase(submitResults.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload;
      });
  },
});

function shuffleQuestionWithOptions(question) {
  const optionIndices = question.options.map((_, index) => index);
  const shuffledIndices = shuffle(optionIndices);

  return {
    ...question,
    options: shuffledIndices.map((index) => question.options[index]),
    optionIndexMap: shuffledIndices.map((index) => question.optionIndexMap[index]),
  };
}

function shuffleMatchingQuestion(question) {
  const leftIndices = question.left.map((_, index) => index);
  const shuffledLeftIndices = shuffle(leftIndices);

  return {
    ...question,
    left: shuffledLeftIndices.map((index) => question.left[index]),
    leftIndexMap: shuffledLeftIndices.map((index) => question.leftIndexMap[index]),
  };
}

function shuffle(array) {
  const clonedArray = [...array];

  for (let index = clonedArray.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [clonedArray[index], clonedArray[randomIndex]] = [clonedArray[randomIndex], clonedArray[index]];
  }

  return clonedArray;
}

export const {
  nextQuestion,
  prevQuestion,
  setModeWrong,
  resetQuiz,
  setUserAnswer,
} = quizSlice.actions;

export default quizSlice.reducer;
