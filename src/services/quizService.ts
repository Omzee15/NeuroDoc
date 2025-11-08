import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI with PDF Chat API key for quiz generation
const apiKey = import.meta.env.VITE_PDF_CHAT_GEMINI_API;
if (!apiKey) {
  console.error('VITE_PDF_CHAT_GEMINI_API environment variable is not set');
} else {
  console.log('Quiz service Gemini API key loaded successfully');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

// Quiz interfaces and types
export interface MCQQuestion {
  id: string;
  type: 'mcq';
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option (0-3)
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SubjectiveQuestion {
  id: string;
  type: 'subjective';
  question: string;
  modelAnswer: string;
  keyPoints?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export type Question = MCQQuestion | SubjectiveQuestion;

export interface Quiz {
  id: string;
  title: string;
  pdfId: string;
  pdfName: string;
  type: 'mcq' | 'subjective' | 'mixed';
  questions: Question[];
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
  totalQuestions: number;
}

export interface QuizGenerationOptions {
  type: 'mcq' | 'subjective';
  numberOfQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
  pdfContent: string;
  pdfTitle: string;
  pdfId: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  answers: Record<string, string>; // questionId -> answer/optionId
  score?: number;
  completedAt?: string;
  timeSpent?: number; // in seconds
}

export class QuizService {
  private model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  /**
   * Generate MCQ questions using Gemini
   */
  async generateMCQQuestions(
    content: string,
    numberOfQuestions: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<MCQQuestion[]> {
    const difficultyDescription = {
      easy: 'simple recall and basic understanding questions',
      medium: 'application and analysis questions requiring deeper understanding',
      hard: 'complex synthesis and evaluation questions requiring critical thinking'
    };

    const prompt = `You are an expert quiz generator. Based on the following PDF content, generate exactly ${numberOfQuestions} multiple-choice questions.

CONTENT:
${content.substring(0, 8000)} ${content.length > 8000 ? '...[truncated]' : ''}

REQUIREMENTS:
- Difficulty level: ${difficulty} (${difficultyDescription[difficulty]})
- Generate exactly ${numberOfQuestions} questions
- Each question must have exactly 4 options (A, B, C, D)
- Only ONE option should be correct
- Include a brief explanation for the correct answer
- Focus on key concepts, important facts, and main ideas from the content
- Make questions clear and unambiguous
- Avoid trick questions or overly complex wording

Return your response as a JSON object with the following structure:
{
  "questions": [
    {
      "id": "1",
      "question": "Question text here",
      "options": [
        "Option A text",
        "Option B text", 
        "Option C text",
        "Option D text"
      ],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this answer is correct",
      "difficulty": "${difficulty}"
    }
  ]
}

Where correctAnswer is the index (0-3) of the correct option in the options array.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const jsonResponse = JSON.parse(response.text());
      
      return jsonResponse.questions.map((q: any, index: number) => ({
        id: `mcq_${Date.now()}_${index}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        type: 'mcq' as const
      }));
    } catch (error) {
      console.error('Error generating MCQ questions:', error);
      throw new Error('Failed to generate MCQ questions. Please try again.');
    }
  }

  /**
   * Generate subjective questions using Gemini
   */
  async generateSubjectiveQuestions(
    content: string,
    numberOfQuestions: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<SubjectiveQuestion[]> {
    const difficultyDescription = {
      easy: 'straightforward questions requiring basic explanation and recall',
      medium: 'questions requiring detailed explanation and analysis',
      hard: 'complex questions requiring critical analysis, synthesis, and evaluation'
    };

    const prompt = `You are an expert quiz generator. Based on the following PDF content, generate exactly ${numberOfQuestions} subjective (essay-type) questions with detailed answers.

CONTENT:
${content.substring(0, 8000)} ${content.length > 8000 ? '...[truncated]' : ''}

REQUIREMENTS:
- Difficulty level: ${difficulty} (${difficultyDescription[difficulty]})
- Generate exactly ${numberOfQuestions} questions
- Each question should encourage detailed, thoughtful responses
- Provide comprehensive model answers (200-400 words each)
- Include 3-5 key points that should be covered in each answer
- Focus on understanding, analysis, and application of concepts
- Make questions open-ended but specific enough to guide answers

Return your response as a JSON object with the following structure:
{
  "questions": [
    {
      "id": "1",
      "question": "Question text here",
      "modelAnswer": "Comprehensive model answer here, 200-400 words",
      "keyPoints": [
        "Key point 1",
        "Key point 2", 
        "Key point 3",
        "Key point 4",
        "Key point 5"
      ],
      "difficulty": "${difficulty}"
    }
  ]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const jsonResponse = JSON.parse(response.text());
      
      return jsonResponse.questions.map((q: any, index: number) => ({
        id: `subjective_${Date.now()}_${index}`,
        question: q.question,
        modelAnswer: q.modelAnswer,
        keyPoints: q.keyPoints,
        difficulty: q.difficulty,
        type: 'subjective' as const
      }));
    } catch (error) {
      console.error('Error generating subjective questions:', error);
      throw new Error('Failed to generate subjective questions. Please try again.');
    }
  }

  /**
   * Generate a complete quiz based on options
   */
  async generateQuiz(options: QuizGenerationOptions): Promise<Quiz> {
    let questions: Question[] = [];

    if (options.type === 'mcq') {
      questions = await this.generateMCQQuestions(
        options.pdfContent,
        options.numberOfQuestions,
        options.difficulty
      );
    } else {
      questions = await this.generateSubjectiveQuestions(
        options.pdfContent,
        options.numberOfQuestions,
        options.difficulty
      );
    }

    const quiz: Quiz = {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${options.pdfTitle} - ${options.type.toUpperCase()} Quiz`,
      pdfId: options.pdfId,
      pdfName: options.pdfTitle,
      type: options.type,
      questions,
      difficulty: options.difficulty,
      createdAt: new Date().toISOString(),
      totalQuestions: questions.length
    };

    return quiz;
  }

  /**
   * Calculate score for MCQ quiz attempt
   */
  calculateMCQScore(quiz: Quiz, answers: Record<string, string>): number {
    if (quiz.type !== 'mcq') return 0;

    let correct = 0;
    const mcqQuestions = quiz.questions as MCQQuestion[];

    mcqQuestions.forEach(question => {
      const userAnswer = parseInt(answers[question.id]); // User answer as option index
      
      if (!isNaN(userAnswer) && userAnswer === question.correctAnswer) {
        correct++;
      }
    });

    return Math.round((correct / mcqQuestions.length) * 100);
  }

  /**
   * Validate subjective answers (basic word count and keyword presence)
   */
  validateSubjectiveAnswers(quiz: Quiz, answers: Record<string, string>): Record<string, any> {
    if (quiz.type !== 'subjective') return {};

    const validation: Record<string, any> = {};
    const subjectiveQuestions = quiz.questions as SubjectiveQuestion[];

    subjectiveQuestions.forEach(question => {
      const userAnswer = answers[question.id] || '';
      const wordCount = userAnswer.trim().split(/\s+/).length;
      
      // Check if key points are mentioned
      const keyPointsMatched = question.keyPoints?.filter(point => 
        userAnswer.toLowerCase().includes(point.toLowerCase())
      ) || [];

      validation[question.id] = {
        wordCount,
        minWordsExpected: question.difficulty === 'easy' ? 50 : question.difficulty === 'medium' ? 100 : 150,
        keyPointsMatched: keyPointsMatched.length,
        totalKeyPoints: question.keyPoints?.length || 0,
        completenessScore: Math.min(100, (wordCount / (question.difficulty === 'easy' ? 50 : question.difficulty === 'medium' ? 100 : 150)) * 100)
      };
    });

    return validation;
  }
}

export const quizService = new QuizService();