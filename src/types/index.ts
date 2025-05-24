
export interface Question {
  id: string;
  text: string;
  totalMarks: number;
  modelAnswer: string;
  questionPaper?: string; // Text content of the question paper
  questionPaperImageUrl?: string; // URL to the question paper image if uploaded
}

export interface StudentAnswer {
  questionId: string;
  answerText: string;
  imageUrl?: string;
}

export interface EvaluationResult {
  marksAwarded: number;
  performanceLabel: 'Poor' | 'Average' | 'Good' | 'Excellent';
  feedbackSummary: string[];
  handwritingFeedback?: string[];
  // Keep these for backward compatibility
  keyPointsCovered: string[];
  keyPointsMissing: string[];
  evaluationReason: string;
}

export interface HandwritingFeedback {
  category: string;
  score: number;
  feedback: string;
  suggestions: string[];
}

export interface HandwritingAnalysisResult {
  overallScore: number;
  feedbackItems: HandwritingFeedback[];
  conciseFeedback?: string[];
}

export type AppStep = 'scanQuestion' | 'manualAnswer' | 'scanAnswer' | 'evaluate' | 'handwritingStats' | 'results';
