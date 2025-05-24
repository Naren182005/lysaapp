/**
 * Answer Comparison Service
 *
 * This service compares student answers with model answers and calculates scores
 * based on keyword matching and similarity.
 */

import { findMatchingKeywords, calculateSimilarity, normalizeText } from './keywordExtractor';

/**
 * Checks if a string is a single-letter MCQ answer (A, B, C, or D)
 * @param text The text to check
 * @returns True if the text is a single-letter MCQ answer
 */
export function isMCQAnswer(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  return /^[A-Da-d]$/.test(trimmed);
}

/**
 * Compares MCQ answers (single letters A, B, C, or D)
 * @param modelAnswer The model answer (should be a single letter)
 * @param studentAnswer The student answer (should be a single letter)
 * @returns True if the answers match (case-insensitive)
 */
export function compareMCQAnswers(modelAnswer: string, studentAnswer: string): boolean {
  if (!modelAnswer || !studentAnswer) return false;

  // Normalize both answers to uppercase single letters
  const normalizedModel = modelAnswer.trim().toUpperCase();
  const normalizedStudent = studentAnswer.trim().toUpperCase();

  // Check if both are valid MCQ answers
  if (!/^[A-D]$/.test(normalizedModel) || !/^[A-D]$/.test(normalizedStudent)) {
    return false;
  }

  // Direct comparison
  return normalizedModel === normalizedStudent;
}

/**
 * Represents the result of comparing a student answer with a model answer
 */
export interface AnswerComparisonResult {
  questionNumber: number;
  questionText: string;
  modelAnswer: string;
  studentAnswer: string;
  matchingKeywords: string[];
  matchingPhrases: string[];
  similarityScore: number;
  marksAwarded: number;
  totalMarks: number;
  feedback: string;
}

/**
 * Compares a student answer with a model answer and calculates a score
 * with a focus on content rather than formatting
 * @param questionNumber The question number
 * @param questionText The text of the question
 * @param modelAnswer The model answer
 * @param studentAnswer The student's answer
 * @param totalMarks The total marks available for the question
 * @returns An AnswerComparisonResult object
 */
export function compareAnswers(
  questionNumber: number,
  questionText: string,
  modelAnswer: string,
  studentAnswer: string,
  totalMarks: number
): AnswerComparisonResult {
  console.log(`Comparing answers for question ${questionNumber}:`);
  console.log(`Model answer: ${modelAnswer.substring(0, 100)}${modelAnswer.length > 100 ? '...' : ''}`);
  console.log(`Student answer: ${studentAnswer.substring(0, 100)}${studentAnswer.length > 100 ? '...' : ''}`);

  // Normalize both answers to handle different formatting styles
  const normalizedModelAnswer = modelAnswer.trim();
  const normalizedStudentAnswer = studentAnswer.trim();

  let matchingKeywords: string[] = [];
  let matchingPhrases: string[] = [];
  let similarity = 0;
  let marksAwarded = 0;
  let feedback = '';

  // Check if this is an MCQ answer (single letter A, B, C, or D)
  const isModelMCQ = isMCQAnswer(normalizedModelAnswer);

  // For MCQ questions, we need to be more flexible with format detection
  if (isModelMCQ) {
    console.log("Detected MCQ model answer");

    // Try to extract MCQ option from student answer regardless of format
    // This handles various formats like "A", "a", "1. A", "1) A", etc.
    const mcqOptionMatch = normalizedStudentAnswer.match(/\b[A-Da-d]\b/);

    if (mcqOptionMatch) {
      const extractedOption = mcqOptionMatch[0];
      console.log(`Extracted MCQ option from student answer: ${extractedOption}`);

      const isCorrect = compareMCQAnswers(normalizedModelAnswer, extractedOption);

      if (isCorrect) {
        matchingKeywords = [normalizedModelAnswer]; // Use the answer as the matching keyword
        similarity = 1.0;
        marksAwarded = totalMarks;
        feedback = 'Good';
      } else {
        matchingKeywords = [];
        similarity = 0.0;
        marksAwarded = 0;
        feedback = `Incorrect answer. The correct answer is ${normalizedModelAnswer.trim().toUpperCase()}.`;
      }
    } else {
      // Try to match the entire answer text for cases where the student wrote out the full answer
      // instead of just the option letter

      // Use our enhanced keyword matching to find content matches regardless of format
      const result = findMatchingKeywords(normalizedModelAnswer, normalizedStudentAnswer);
      matchingKeywords = result.matchingKeywords;
      matchingPhrases = result.matchingPhrases;
      similarity = result.similarity;

      // Award full marks if any keyword matches
      const hasMatchingKeywords = matchingKeywords.length > 0;
      marksAwarded = hasMatchingKeywords ? totalMarks : 0;

      if (hasMatchingKeywords) {
        feedback = 'Good';
      } else {
        feedback = `Incorrect answer. The correct answer is ${normalizedModelAnswer.trim().toUpperCase()}.`;
      }
    }
  } else {
    // For non-MCQ answers, use our enhanced content-focused keyword matching
    // This will focus on the presence of essential concepts rather than formatting
    const result = findMatchingKeywords(normalizedModelAnswer, normalizedStudentAnswer);
    matchingKeywords = result.matchingKeywords;
    matchingPhrases = result.matchingPhrases;
    similarity = result.similarity;

    // Award full marks if any essential concept is present
    // This ensures that students get credit for having the right content
    // regardless of how it's formatted or expressed
    const hasMatchingContent = matchingKeywords.length > 0 || matchingPhrases.length > 0;

    if (hasMatchingContent) {
      marksAwarded = totalMarks;
      feedback = 'Good';

      console.log("Content match found! Awarding full marks.");
      console.log("Matching keywords:", matchingKeywords);
      console.log("Matching phrases:", matchingPhrases);
    } else {
      // Check if there's any partial content match
      // This is a more lenient check for answers that might have the right idea
      // but don't match our keyword extraction exactly

      // Normalize both answers for direct content comparison
      const cleanModelAnswer = normalizeText(modelAnswer);
      const cleanStudentAnswer = normalizeText(studentAnswer);

      // Check if any significant words from the model answer appear in the student answer
      const modelWords = cleanModelAnswer.split(/\s+/).filter(w => w.length > 3);
      const studentWords = cleanStudentAnswer.split(/\s+/).filter(w => w.length > 3);

      const commonWords = modelWords.filter(mw => studentWords.includes(mw));

      if (commonWords.length > 0) {
        // Some content overlap exists, award partial marks
        console.log("Partial content match found:", commonWords);
        marksAwarded = totalMarks; // Award full marks as per requirements
        matchingKeywords = commonWords;
        feedback = 'Good';
      } else {
        marksAwarded = 0;
        feedback = 'Incorrect answer. Your answer did not include any of the required concepts.';
      }
    }
  }

  return {
    questionNumber,
    questionText,
    modelAnswer,
    studentAnswer,
    matchingKeywords,
    matchingPhrases,
    similarityScore: similarity,
    marksAwarded,
    totalMarks,
    feedback
  };
}

/**
 * Compares multiple student answers with model answers
 * @param questions Array of question objects
 * @param modelAnswers Array of model answers
 * @param studentAnswers Array of student answers
 * @returns Array of AnswerComparisonResult objects
 */
export function compareMultipleAnswers(
  questions: { number: number; text: string; marks: number }[],
  modelAnswers: string[],
  studentAnswers: string[]
): AnswerComparisonResult[] {
  const results: AnswerComparisonResult[] = [];

  // Ensure we have the same number of questions, model answers, and student answers
  const count = Math.min(questions.length, modelAnswers.length, studentAnswers.length);

  for (let i = 0; i < count; i++) {
    const result = compareAnswers(
      questions[i].number,
      questions[i].text,
      modelAnswers[i],
      studentAnswers[i],
      questions[i].marks
    );

    results.push(result);
  }

  return results;
}

/**
 * Calculates the total score from a set of comparison results
 * @param results Array of AnswerComparisonResult objects
 * @returns Object with total marks awarded and total marks available
 */
export function calculateTotalScore(results: AnswerComparisonResult[]): {
  totalMarksAwarded: number;
  totalMarksAvailable: number;
  percentage: number;
} {
  const totalMarksAwarded = results.reduce((sum, result) => sum + result.marksAwarded, 0);
  const totalMarksAvailable = results.reduce((sum, result) => sum + result.totalMarks, 0);

  // Calculate percentage
  const percentage = totalMarksAvailable > 0
    ? (totalMarksAwarded / totalMarksAvailable) * 100
    : 0;

  return {
    totalMarksAwarded,
    totalMarksAvailable,
    percentage
  };
}

export default {
  compareAnswers,
  compareMultipleAnswers,
  calculateTotalScore
};
