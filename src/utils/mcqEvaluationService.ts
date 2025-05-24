/**
 * MCQ Evaluation Service
 *
 * This service provides functions for evaluating MCQ answers.
 */

import { EvaluationResult } from "@/types";

/**
 * Parses MCQ answers from a text string
 * The text can be in multiple formats:
 * 1. Each line contains a question number and answer: "1A", "2B", etc.
 * 2. Space-separated pairs: "1 A 2 B 3 C 4 D"
 *
 * @param {string} answerText The answer text to parse
 * @returns {Object} Dictionary mapping question numbers to answer options
 */
export function parseAnswerText(answerText: string): Record<string, string> {
  // Handle empty input
  if (!answerText) {
    return {};
  }

  const answers: Record<string, string> = {};

  // First, try to parse as newline-separated format (1A, 2B, etc.)
  if (answerText.includes('\n')) {
    const lines = answerText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim().toUpperCase();
      if (trimmed.length > 0) {
        // Extract question number and option
        // This handles formats like "1A", "1 A", etc.
        const match = trimmed.match(/^(\d+)\s*([A-D])$/);

        if (match) {
          const qNo = match[1];
          const option = match[2];
          answers[qNo] = option;
        } else {
          // Try to extract question number and option from the line
          const qNoMatch = trimmed.match(/(\d+)/);
          const optionMatch = trimmed.match(/([A-D])/);

          if (qNoMatch && optionMatch) {
            const qNo = qNoMatch[1];
            const option = optionMatch[1];
            answers[qNo] = option;
          }
        }
      }
    }
  }

  // If no answers were parsed from newlines, try space-separated format
  if (Object.keys(answers).length === 0) {
    // Replace newlines with spaces and trim whitespace
    const text = answerText.replace(/\n/g, ' ').trim().toUpperCase();

    // Split by whitespace
    const parts = text.split(/\s+/);

    // Process pairs of elements (question number and option)
    for (let i = 0; i < parts.length; i += 2) {
      // Make sure we have both question number and option
      if (i + 1 < parts.length) {
        const qNo = parts[i];
        const option = parts[i + 1];

        // Validate question number (should be a number)
        if (/^\d+$/.test(qNo)) {
          // Validate option (should be A, B, C, or D)
          if (/^[A-D]$/.test(option)) {
            answers[qNo] = option;
          }
        }
      }
    }
  }

  // If still no answers, try to parse as adjacent pairs (1A2B3C4D)
  if (Object.keys(answers).length === 0) {
    const text = answerText.toUpperCase();
    const matches = text.match(/(\d+)([A-D])/g) || [];

    for (const match of matches) {
      const qNo = match.match(/(\d+)/)![1];
      const option = match.match(/([A-D])/)![1];
      answers[qNo] = option;
    }
  }

  return answers;
}

/**
 * Evaluates MCQ answers by comparing model answers with student answers
 *
 * @param {string} modelAnswerText The model answer text
 * @param {string} studentAnswerText The student answer text
 * @returns {Object} Object containing score, total, and detailed results
 */
export function evaluateMCQ(modelAnswerText: string, studentAnswerText: string): {
  score: number;
  total: number;
  results: Record<string, { correctOption: string; studentOption: string | null; isCorrect: boolean }>;
} {
  // Parse the answers
  const modelAnswers = parseAnswerText(modelAnswerText);
  const studentAnswers = parseAnswerText(studentAnswerText);

  let score = 0;
  const total = Object.keys(modelAnswers).length;
  const results: Record<string, { correctOption: string; studentOption: string | null; isCorrect: boolean }> = {};

  // Compare answers for each question in the model answers
  for (const [qNo, correctOption] of Object.entries(modelAnswers)) {
    const studentOption = studentAnswers[qNo];

    // Check if student answered this question correctly
    if (studentOption === correctOption) {
      score += 1;
      results[qNo] = {
        correctOption,
        studentOption,
        isCorrect: true
      };
    } else {
      results[qNo] = {
        correctOption,
        studentOption: studentOption || null,
        isCorrect: false
      };
    }
  }

  return {
    score,
    total,
    results
  };
}

/**
 * Converts MCQ evaluation results to the standard EvaluationResult format
 *
 * @param {Object} mcqResult The result from evaluateMCQ
 * @param {number} userProvidedTotalMarks The total marks provided by the user
 * @returns {EvaluationResult} The standardized evaluation result
 */
export function convertMCQResultToEvaluationResult(
  mcqResult: {
    score: number;
    total: number;
    results: Record<string, { correctOption: string; studentOption: string | null; isCorrect: boolean }>;
  },
  userProvidedTotalMarks?: number
): EvaluationResult {
  const { score, total, results } = mcqResult;

  // Calculate the marks awarded based on the user-provided total marks if available
  const marksAwarded = userProvidedTotalMarks
    ? Math.round((score / total) * userProvidedTotalMarks)
    : score;

  // Calculate percentage based on the actual score and total questions
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  // Determine performance label
  let performanceLabel: 'Poor' | 'Average' | 'Good' | 'Excellent';
  if (percentage >= 85) {
    performanceLabel = 'Excellent';
  } else if (percentage >= 70) {
    performanceLabel = 'Good';
  } else if (percentage >= 50) {
    performanceLabel = 'Average';
  } else {
    performanceLabel = 'Poor';
  }

  // Generate feedback summary
  const feedbackSummary: string[] = [];

  if (score === total) {
    feedbackSummary.push('All answers are correct. Great job!');
  } else if (score > 0) {
    feedbackSummary.push(`You answered ${score} out of ${total} questions correctly.`);

    // Add specific feedback for incorrect answers
    const incorrectQuestions = Object.entries(results)
      .filter(([_, result]) => !result.isCorrect)
      .map(([qNo, result]) => `Question ${qNo}: Correct answer is ${result.correctOption}`);

    if (incorrectQuestions.length > 0) {
      feedbackSummary.push('Review the following questions:');
      feedbackSummary.push(...incorrectQuestions);
    }
  } else {
    feedbackSummary.push('None of the answers are correct. Please review the material and try again.');
  }

  return {
    marksAwarded,
    performanceLabel,
    feedbackSummary,
    keyPointsCovered: Object.entries(results)
      .filter(([_, result]) => result.isCorrect)
      .map(([qNo, _]) => `Question ${qNo}`),
    keyPointsMissing: Object.entries(results)
      .filter(([_, result]) => !result.isCorrect)
      .map(([qNo, _]) => `Question ${qNo}`),
    evaluationReason: `You scored ${score} out of ${total} questions correctly.`
  };
}

/**
 * Evaluates MCQ answers and returns a standardized evaluation result
 *
 * @param {string} modelAnswerText The model answer text
 * @param {string} studentAnswerText The student answer text
 * @param {number} userProvidedTotalMarks The total marks provided by the user
 * @returns {EvaluationResult} The standardized evaluation result
 */
export function evaluateMCQAndGetResult(
  modelAnswerText: string,
  studentAnswerText: string,
  userProvidedTotalMarks?: number
): EvaluationResult {
  const mcqResult = evaluateMCQ(modelAnswerText, studentAnswerText);
  return convertMCQResultToEvaluationResult(mcqResult, userProvidedTotalMarks);
}
