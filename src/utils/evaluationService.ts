import { EvaluationResult, HandwritingAnalysisResult, HandwritingFeedback } from "@/types";
import {
  OCR_API_KEY,
  API_ENDPOINTS,
  AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_DEPLOYMENT,
  AZURE_OPENAI_API_VERSION
} from '@/config/apiConfig';
import { dataURLtoBlob, enhanceImageForOCR, compressImage, segmentImage, ImageSegment } from '@/utils/imageUtils';
import { compareAnswers, compareMultipleAnswers, calculateTotalScore, AnswerComparisonResult } from './answerComparisonService';
import { formatMCQQuestion } from './questionUtils';
import { shouldUseOnlineServices } from './onlineOfflineMode';
import { OCRTextSegment, reconstructTextFromSegments } from './textUtils';
import { applyDomainDictionaryCorrections, applyOCRErrorPatternCorrections } from './ocrCorrections';

/**
 * Checks if a question is a multiple-choice question
 * @param question The question text to check
 * @returns True if the question is a multiple-choice question, false otherwise
 */
export const isMultipleChoiceQuestion = (question: string): boolean => {
  if (!question) return false;

  // Check for common multiple-choice patterns
  const mcqPatterns = [
    /\bA\).*\bB\).*\bC\).*\bD\)/i,  // A) option B) option C) option D) option
    /\bA\..*\bB\..*\bC\..*\bD\./i,  // A. option B. option C. option D. option
    /\b\(A\).*\b\(B\).*\b\(C\).*\b\(D\)/i,  // (A) option (B) option (C) option (D) option
    /\b\[A\].*\b\[B\].*\b\[C\].*\b\[D\]/i,  // [A] option [B] option [C] option [D] option
    /\ba\).*\bb\).*\bc\).*\bd\)/i,  // a) option b) option c) option d) option
    /\ba\..*\bb\..*\bc\..*\bd\./i,  // a. option b. option c. option d. option
    /option\s+[A-Da-d][\s:)]/i,    // Option A, Option B, etc.
    /choice\s+[A-Da-d][\s:)]/i,    // Choice A, Choice B, etc.
    /\b[A-Da-d]\s*[.]\s*[A-Za-z0-9]/,  // A. text at word boundary
    /\b[A-Da-d]\s*[)]\s*[A-Za-z0-9]/,  // A) text at word boundary
    /^[A-Da-d]\.\s+[A-Za-z0-9]/m,   // A. text at start of line
    /^[A-Da-d]\)\s+[A-Za-z0-9]/m,   // A) text at start of line
    /choose\s+(one|the\s+correct|the\s+best)/i,  // "Choose one" or "Choose the correct"
    /select\s+(one|the\s+correct|the\s+best)/i,  // "Select one" or "Select the correct"
  ];

  // Check if any of the patterns match
  return mcqPatterns.some(pattern => pattern.test(question));
};

/**
 * Evaluates a student's answer against a model answer using keyword matching
 * @param studentAnswer The student's answer text
 * @param modelAnswer The model answer text
 * @param questionText The question text
 * @param questionNumber The question number
 * @param totalMarks The total marks available for the question
 * @returns An evaluation result with score and feedback
 */
export const evaluateAnswerWithKeywords = async (
  studentAnswer: string,
  modelAnswer: string,
  questionText: string,
  questionNumber: number,
  totalMarks: number
): Promise<AnswerComparisonResult> => {
  console.log(`Evaluating answer for question ${questionNumber}:`);
  console.log(`Student answer: ${studentAnswer.substring(0, 100)}...`);
  console.log(`Model answer: ${modelAnswer.substring(0, 100)}...`);

  // Use the keyword-based comparison to evaluate the answer
  const result = compareAnswers(
    questionNumber,
    questionText,
    modelAnswer,
    studentAnswer,
    totalMarks
  );

  console.log(`Evaluation result for question ${questionNumber}:`, result);
  return result;
};

/**
 * Evaluates multiple student answers against model answers using keyword matching
 * @param studentAnswers Array of student answers
 * @param modelAnswers Array of model answers
 * @param questions Array of question objects with text and marks
 * @returns Array of evaluation results
 */
export const evaluateMultipleAnswersWithKeywords = async (
  studentAnswers: string[],
  modelAnswers: string[],
  questions: { number: number; text: string; marks: number }[]
): Promise<{
  results: AnswerComparisonResult[];
  totalScore: {
    totalMarksAwarded: number;
    totalMarksAvailable: number;
    percentage: number;
  };
}> => {
  console.log(`Evaluating ${studentAnswers.length} answers against ${modelAnswers.length} model answers`);

  // Use the keyword-based comparison to evaluate multiple answers
  const results = compareMultipleAnswers(
    questions,
    modelAnswers,
    studentAnswers
  );

  // Calculate the total score
  const totalScore = calculateTotalScore(results);

  console.log('Evaluation complete. Total score:', totalScore);
  return { results, totalScore };
};

/**
 * Evaluates a student's answer against model answer keywords using the server API
 * @param answerText The student's answer text
 * @param questionKeywords Array of keywords from the model answer
 * @returns An object with evaluation results including total marks, obtained marks, and matched keywords
 */
export const evaluateAnswerWithServer = async (
  answerText: string,
  questionKeywords: string[]
): Promise<{
  totalMarks: number;
  obtainedMarks: number;
  matchCount: number;
  keywordsMatched: string[];
}> => {
  console.log(`Evaluating answer with server API`);
  console.log(`Student answer: ${answerText.substring(0, 100)}...`);
  console.log(`Question keywords: ${questionKeywords.join(', ')}`);

  try {
    // Call the server API endpoint
    const response = await fetch(API_ENDPOINTS.EVALUATE_ANSWER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        questionKeywords,
        answerText
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server evaluation failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Parse the response
    const result = await response.json();
    console.log('Server evaluation result:', result);
    return result;
  } catch (error) {
    console.error('Error evaluating answer with server:', error);
    // Return a default result in case of error
    return {
      totalMarks: questionKeywords.length,
      obtainedMarks: 0,
      matchCount: 0,
      keywordsMatched: []
    };
  }
};

/**
 * Evaluates a student's answer against a model answer
 * @param questionText The text of the question
 * @param totalMarks The total marks available for the question
 * @param modelAnswer The model answer to compare against
 * @param studentAnswer The student's answer
 * @returns An evaluation result with marks awarded and feedback
 */
export const evaluateAnswer = async (
  questionText: string,
  totalMarks: number,
  modelAnswer: string,
  studentAnswer: string
): Promise<EvaluationResult> => {
  console.log("Evaluating answer for question:", questionText);
  console.log("Model answer:", modelAnswer);
  console.log("Student answer:", studentAnswer);
  console.log("Total marks:", totalMarks);

  // Format MCQ questions for better display in the evaluation part
  let formattedQuestionText = questionText;
  if (isMultipleChoiceQuestion(questionText)) {
    formattedQuestionText = formatMCQQuestion(questionText);
    console.log("Formatted MCQ question:", formattedQuestionText);
  }

  // Import the MCQ evaluation service
  const { evaluateMCQAndGetResult } = await import('./mcqEvaluationService');

  // Check if this is an MCQ question/answer
  const isMCQ = isMultipleChoiceQuestion(questionText) ||
                (modelAnswer && /^[A-Da-d]$/.test(modelAnswer.trim()));

  // Use the formatted question text for evaluation
  questionText = formattedQuestionText;

  console.log("Is MCQ question:", isMCQ);

  if (isMCQ) {
    console.log("Evaluating as MCQ answer with user-provided total marks:", totalMarks);
    try {
      // Use our local MCQ evaluation service and pass the user-provided total marks
      const result = evaluateMCQAndGetResult(modelAnswer, studentAnswer, totalMarks);
      console.log("MCQ evaluation result:", result);
      return result;
    } catch (error) {
      console.error("Error evaluating MCQ answer:", error);
      // Fall through to server evaluation or fallback
    }
  }

  try {
    // Check if we should use online services based on the online/offline mode
    const useOnlineServices = await shouldUseOnlineServices();

    if (useOnlineServices) {
      // Try to use the server API endpoint for answer evaluation
      console.log("Using online mode: Trying server API for evaluation");
      console.log("API endpoint:", API_ENDPOINTS.EVALUATE_ANSWER);
      const response = await fetch(API_ENDPOINTS.EVALUATE_ANSWER || 'http://localhost:3001/api/evaluate-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modelAnswer,
          studentAnswer
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server evaluation failed: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Server evaluation failed: ${response.status} ${response.statusText}`);
      }

      // Parse the response
      const result = await response.json();
      console.log('Server evaluation result:', result);

      // For MCQ questions
      if (result.answerType === 'mcq') {
        const isCorrect = result.isCorrect;
        // Ensure obtainedMarks is a valid number
        const obtainedMarks = typeof result.obtainedMarks === 'number' && !isNaN(result.obtainedMarks)
          ? result.obtainedMarks
          : (isCorrect ? totalMarks : 0);

        // Create a properly formatted evaluation result
        return {
          marksAwarded: obtainedMarks,
          performanceLabel: isCorrect ? 'Good' : 'Poor',
          feedbackSummary: isCorrect
            ? ["Correct answer selected."]
            : ["Incorrect answer selected. Review the material and try again."],
          keyPointsCovered: isCorrect ? ["Correct option identified"] : [],
          keyPointsMissing: isCorrect ? [] : ["Correct option not identified"],
          evaluationReason: isCorrect
            ? "The selected answer is correct."
            : "The selected answer is incorrect."
        };
      }
      // For open-ended questions
      else {
        // Ensure obtainedMarks is a valid number
        const obtainedMarks = typeof result.obtainedMarks === 'number' && !isNaN(result.obtainedMarks)
          ? result.obtainedMarks
          : Math.round(totalMarks * 0.5); // Default to 50% if invalid

        // Ensure totalMarks is a valid number
        const resultTotalMarks = typeof result.totalMarks === 'number' && !isNaN(result.totalMarks)
          ? result.totalMarks
          : totalMarks; // Use the passed totalMarks parameter if invalid

        const matchCount = typeof result.matchCount === 'number' && !isNaN(result.matchCount)
          ? result.matchCount
          : 0;

        const keywordsMatched = result.keywordsMatched || [];

        // Calculate percentage safely
        const percentage = result.percentage ||
          (resultTotalMarks > 0 ? (obtainedMarks / resultTotalMarks) * 100 : 50); // Default to 50% if division by zero

        // Determine performance label based on percentage
        let performanceLabel: 'Poor' | 'Average' | 'Good' | 'Excellent';
        // Ensure percentage is a valid number
        const validPercentage = !isNaN(percentage) ? percentage : 50;

        if (validPercentage >= 85) {
          performanceLabel = 'Excellent';
        } else if (validPercentage >= 70) {
          performanceLabel = 'Good';
        } else if (validPercentage >= 50) {
          performanceLabel = 'Average';
        } else {
          performanceLabel = 'Poor';
        }

        // Generate feedback based on the result
        let feedbackSummary: string[] = [];

        if (validPercentage >= 85) {
          feedbackSummary = ["Excellent understanding of the topic demonstrated."];
          if (keywordsMatched && keywordsMatched.length > 0) {
            feedbackSummary.push(`Successfully covered key concepts: ${keywordsMatched.slice(0, 3).join(', ')}${keywordsMatched.length > 3 ? '...' : ''}`);
          }
        } else if (validPercentage >= 70) {
          feedbackSummary = ["Good understanding of the topic demonstrated."];
          if (keywordsMatched && keywordsMatched.length > 0) {
            feedbackSummary.push(`Successfully covered key concepts: ${keywordsMatched.slice(0, 3).join(', ')}${keywordsMatched.length > 3 ? '...' : ''}`);
          }
        } else if (validPercentage >= 50) {
          feedbackSummary = ["Adequate understanding of the topic."];
          if (keywordsMatched && keywordsMatched.length > 0) {
            feedbackSummary.push(`Covered some key concepts: ${keywordsMatched.slice(0, 2).join(', ')}${keywordsMatched.length > 2 ? '...' : ''}`);
          }
          feedbackSummary.push("Include more specific details and examples in your answers.");
        } else {
          feedbackSummary = ["Limited understanding of the topic demonstrated."];
          feedbackSummary.push("Review the material and include more key concepts in your answer.");
        }

        // Create a properly formatted evaluation result with all required fields
        return {
          marksAwarded: obtainedMarks,
          performanceLabel,
          feedbackSummary,
          keyPointsCovered: Array.isArray(keywordsMatched) ? keywordsMatched : [],
          keyPointsMissing: [], // We don't have this information from the server
          evaluationReason: `The answer covers ${matchCount} out of ${resultTotalMarks} key concepts.`
        };
      }
    } else {
      // In offline mode, throw an error to use the local fallback
      console.log("Using offline mode: Skipping server API, using local evaluation");
      throw new Error("Offline mode enabled, using local evaluation");
    }
  } catch (error) {
    console.error("Error evaluating answer with server:", error);

    // Try to use local keyword-based comparison as a fallback
    try {
      console.log("Using local keyword-based comparison as fallback");
      const { compareAnswers } = await import('./answerComparisonService');

      const result = compareAnswers(
        1, // Default question number
        questionText,
        modelAnswer,
        studentAnswer,
        totalMarks
      );

      console.log("Local comparison result:", result);

      // Convert the comparison result to an evaluation result
      return {
        marksAwarded: result.marksAwarded,
        performanceLabel: result.marksAwarded >= totalMarks * 0.7 ? 'Good' :
                         result.marksAwarded >= totalMarks * 0.5 ? 'Average' : 'Poor',
        feedbackSummary: [result.feedback],
        keyPointsCovered: result.matchingKeywords,
        keyPointsMissing: [],
        evaluationReason: `The answer matches ${result.matchingKeywords.length} keywords from the model answer.`
      };
    } catch (fallbackError) {
      console.error("Error with fallback evaluation:", fallbackError);

      // Return a default evaluation in case all methods fail
      // Ensure all required fields are present and properly formatted
      const defaultMarksAwarded = Math.round(totalMarks * 0.5); // Default to 50%
      return {
        marksAwarded: defaultMarksAwarded,
        performanceLabel: 'Average',
        feedbackSummary: ["Improve subject knowledge and conceptual clarity.", "Add more specific examples to support your answers."],
        keyPointsCovered: ["Basic understanding demonstrated"],
        keyPointsMissing: ["Detailed analysis could not be performed"],
        evaluationReason: "An error occurred during evaluation. A default score has been assigned."
      };
    }
  }
};

// Removed unused isCommonWord function

/**
 * Specialized function to process MCQ options text
 * @param text The raw OCR text containing MCQ options
 * @returns The processed MCQ options text
 */
const processMCQOptionsText = (text: string): string => {
  if (!text) return text;

  console.log("Processing MCQ options text:", text);

  // First, normalize the text
  let processedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // Special handling for numbered MCQ options (1. A, 2. B, etc.)
  // Look for patterns like "1 A", "1. A", "1) A", etc.
  const numberedOptionPattern = /(\d+)[\s.)]*\s*([A-Da-d])/g;
  processedText = processedText.replace(numberedOptionPattern, '$1. $2');

  // Handle cases where OCR might have misread "1" as "I" or "l"
  processedText = processedText.replace(/[Il][\s.)]*\s*([A-Da-d])/g, '1. $1');

  // Handle cases where OCR might have misread "2" as "Z" or "z"
  processedText = processedText.replace(/[Zz][\s.)]*\s*([A-Da-d])/g, '2. $1');

  // Handle cases where OCR might have misread "3" as "B" or "E"
  processedText = processedText.replace(/[BE][\s.)]*\s*([A-Da-d])/g, '3. $1');

  // Handle cases where OCR might have misread "4" as "A" or "q"
  processedText = processedText.replace(/[Aq][\s.)]*\s*([A-Da-d])/g, '4. $1');

  // Ensure consistent spacing
  processedText = processedText.replace(/(\d+)\.\s*([A-Da-d])/g, '$1. $2');

  console.log("Processed MCQ options text:", processedText);
  return processedText;
}

/**
 * Post-processes OCR text to improve quality with advanced formatting preservation and error correction
 * @param text The OCR text to process
 * @param isQuestionPaper Whether the text is from a question paper
 * @param isModelAnswer Whether the text is from a model answer
 * @param isMCQOptions Whether the text contains MCQ options
 * @returns The processed text
 */
const postProcessOCRText = (
  text: string,
  isQuestionPaper: boolean = false,
  isModelAnswer: boolean = false,
  isMCQOptions: boolean = false
): string => {
  // Handle empty or invalid text with more detailed guidance
  if (!text || text.trim().length === 0) {
    return isQuestionPaper
      ? "No text could be extracted from the question paper. Please try again with a clearer image. For best results, ensure good lighting, avoid shadows, and keep the paper flat without folds."
      : isModelAnswer
        ? "No text could be extracted from the model answer. Please try again with a clearer image. For best results, ensure good lighting and that the text is clearly visible."
        : isMCQOptions
          ? "No MCQ options could be extracted. Please try again with a clearer image. Make sure all options (A, B, C, D) are clearly visible."
          : "No text could be extracted. Please try again with a clearer image. For handwritten text, ensure the writing is clear and the image is well-lit.";
  }

  // Apply domain-specific corrections from ocrCorrections.ts

  // Special handling for MCQ options with enhanced processing
  if (isMCQOptions) {
    return processMCQOptionsText(text);
  }

  // Determine document type
  const isStudentAnswer = !isQuestionPaper && !isModelAnswer;

  // Preserve original text for debugging
  console.log("Original OCR text:", text.substring(0, 200) + "...");

  // Step 1: Basic cleanup for all text types
  let processedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Step 2: Apply document-specific formatting preservation
  if (isQuestionPaper) {
    // For question papers, preserve more of the original formatting
    processedText = processedText
      .replace(/\n{4,}/g, '\n\n\n') // Only normalize excessive newlines (4+)
      .replace(/\s{3,}/g, '  ') // Normalize multiple spaces but preserve indentation
      .replace(/\n\s{10,}/g, '\n  ') // Normalize excessive indentation
      .replace(/\s+\n/g, '\n') // Remove spaces at the end of lines
      // Improve question numbering detection
      .replace(/(\d+)\s*\.\s*/g, '\n$1. ') // Ensure question numbers start on new lines
      .replace(/\b([Qq]uestion|Q)\s*(\d+)/g, '\nQuestion $2') // Format "Question X" consistently
      .replace(/\n{3,}/g, '\n\n'); // Clean up any resulting excessive newlines
  } else if (isModelAnswer) {
    // For model answers, preserve more of the original formatting
    processedText = processedText
      .replace(/\n{4,}/g, '\n\n\n') // Only normalize excessive newlines (4+)
      .replace(/\s{3,}/g, '  ') // Normalize multiple spaces but preserve indentation
      .replace(/\n\s{10,}/g, '\n  ') // Normalize excessive indentation
      .replace(/\s+\n/g, '\n') // Remove spaces at the end of lines
      // Preserve mathematical expressions
      .replace(/([0-9])\s*\+\s*([0-9])/g, '$1 + $2') // Fix spacing in addition
      .replace(/([0-9])\s*-\s*([0-9])/g, '$1 - $2') // Fix spacing in subtraction
      .replace(/([0-9])\s*\*\s*([0-9])/g, '$1 × $2') // Fix spacing in multiplication
      .replace(/([0-9])\s*\/\s*([0-9])/g, '$1 ÷ $2'); // Fix spacing in division
  } else {
    // For student answers, apply more intelligent normalization
    processedText = processedText
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
      .replace(/\n\s+/g, '\n') // Remove spaces at the beginning of lines
      .replace(/\s+\n/g, '\n'); // Remove spaces at the end of lines

    // For handwritten text, apply additional processing to handle common handwriting OCR issues
    if (isStudentAnswer) {
      processedText = processedText
        // Fix split characters in handwriting
        .replace(/([0-9])\s+([0-9])/g, '$1$2') // Fix split numbers
        .replace(/([lI])\s+([lI])/g, 'H') // Fix misrecognized 'H' as 'I I' or 'l l'
        .replace(/([rn])\s+([rn])/g, 'm') // Fix misrecognized 'm' as 'r n' or 'n r'
        .replace(/([c])\s+([l])/g, 'd') // Fix misrecognized 'd' as 'c l'
        .replace(/([v])\s+([v])/g, 'w'); // Fix misrecognized 'w' as 'v v'
    }
  }

  // Step 3: Fix common OCR errors - enhanced patterns
  processedText = processedText
    // Fix common character confusions
    .replace(/[|]l/g, 'I') // Fix pipe character and lowercase L to uppercase I
    .replace(/\b[|]I\b/g, 'I') // Fix pipe character to uppercase I
    .replace(/\brn\b/g, 'm') // Fix 'rn' misread as 'm'
    .replace(/\bvv\b/g, 'w') // Fix 'vv' misread as 'w'
    .replace(/([a-z])l([a-z])/g, '$1i$2') // Fix 'l' misread as 'i' in words
    .replace(/([0-9])l([0-9])/g, '$1$2') // Fix 'l' between numbers (like 1l0 → 10)
    .replace(/([0-9])I([0-9])/g, '$1$2') // Fix 'I' between numbers (like 1I0 → 10)
    .replace(/([0-9])o([0-9])/g, '$10$2') // Fix 'o' misread as '0' (like 1o → 10)
    .replace(/([0-9])O([0-9])/g, '$10$2') // Fix 'O' misread as '0' (like 1O → 10)

    // Fix spacing issues
    .replace(/([A-Za-z]),([A-Za-z])/g, '$1, $2') // Add space after comma between words
    .replace(/([A-Za-z]);([A-Za-z])/g, '$1; $2') // Add space after semicolon between words
    .replace(/([A-Za-z]):([A-Za-z])/g, '$1: $2') // Add space after colon between words
    .replace(/([.!?])([A-Z])/g, '$1 $2') // Add space after sentence ending punctuation

    // Fix common word errors
    .replace(/\b[0O]ne\b/g, 'One')
    .replace(/\b[0O]f\b/g, 'of')
    .replace(/\b[1I]n\b/g, 'In')
    .replace(/\b[1I]s\b/g, 'is')
    .replace(/\b[1I]t\b/g, 'it')
    .replace(/\b[1I]f\b/g, 'if')
    .replace(/\bTne\b/g, 'The')
    .replace(/\btne\b/g, 'the')
    .replace(/\bana\b/g, 'and')
    .replace(/\bAna\b/g, 'And')
    .replace(/\bwitn\b/g, 'with')
    .replace(/\bWitn\b/g, 'With')
    .replace(/\btnat\b/g, 'that')
    .replace(/\bTnat\b/g, 'That')
    .replace(/\bwnicn\b/g, 'which')
    .replace(/\bWnicn\b/g, 'Which')
    .replace(/\bwnen\b/g, 'when')
    .replace(/\bWnen\b/g, 'When')
    .replace(/\bwnat\b/g, 'what')
    .replace(/\bWnat\b/g, 'What')
    .replace(/\bwnere\b/g, 'where')
    .replace(/\bWnere\b/g, 'Where');

  // Step 4: Apply domain-specific corrections from ocrCorrections.ts
  processedText = applyDomainDictionaryCorrections(processedText);
  processedText = applyOCRErrorPatternCorrections(processedText);

  // Log the corrections for debugging
  console.log("Applied OCR corrections to improve text quality");

  // Special processing for question papers
  if (isQuestionPaper) {
    // Improve question numbering detection and formatting
    processedText = processedText
      // Fix question numbering
      .replace(/(\d+)\s*\.\s*/g, '\n$1. ')
      .replace(/\b([Qq]uestion|Q)\s*(\d+)/g, '\nQuestion $2')
      .replace(/\b([Qq]uestion|Q)\.?\s*(\d+)/g, '\nQuestion $2')

      // Improve MCQ option formatting
      .replace(/\b([A-D])\s*\)\s*/g, '$1) ') // Normalize MCQ option formatting with parenthesis
      .replace(/\b([A-D])\s*\.\s*/g, '$1. ') // Normalize MCQ option formatting with periods

      // Fix marks formatting
      .replace(/(\d+)\s*marks/gi, '$1 marks')
      .replace(/(\d+)\s*mark/gi, '$1 mark')
      .replace(/\[\s*(\d+)\s*marks\s*\]/gi, '[$1 marks]')
      .replace(/\[\s*(\d+)\s*mark\s*\]/gi, '[$1 mark]')
      .replace(/\(\s*(\d+)\s*marks\s*\)/gi, '($1 marks)')
      .replace(/\(\s*(\d+)\s*mark\s*\)/gi, '($1 mark)');
  }
  // Special processing for model answers
  else if (isModelAnswer) {
    // Preserve exact formatting for model answers
    processedText = processedText
      // Fix MCQ option formatting
      .replace(/\b([A-D])\s*\)\s*/g, '$1) ') // Normalize MCQ option formatting with parenthesis
      .replace(/\b([A-D])\s*\.\s*/g, '$1. ') // Normalize MCQ option formatting with periods

      // Preserve single-letter answers for MCQs
      .replace(/^([A-Da-d])\s*$/, '$1');
  }
  // Enhanced processing for student answers (handwritten text)
  else if (isStudentAnswer) {
    // First, detect if the text appears to be an MCQ answer
    const isMCQAnswer = /^[A-Da-d]$/.test(processedText.trim()) ||
                        /^(option|choice)\s+[A-Da-d]$/i.test(processedText.trim()) ||
                        /^(the answer is|answer:)\s+[A-Da-d]$/i.test(processedText.trim());

    if (isMCQAnswer) {
      // For MCQ answers, extract just the letter
      const mcqMatch = processedText.match(/[A-Da-d](?![a-z])/i);
      if (mcqMatch) {
        return mcqMatch[0].toUpperCase();
      }
    }

    // Improve handwritten text recognition with enhanced processing
    processedText = processedText
      // Fix common handwriting OCR errors
      .replace(/([0-9])\s+([0-9])/g, '$1$2') // Fix split numbers
      .replace(/([lI])\s+([lI])/g, 'H') // Fix misrecognized 'H' as 'I I' or 'l l'
      .replace(/([rn])\s+([rn])/g, 'm') // Fix misrecognized 'm' as 'r n' or 'n r'
      .replace(/([c])\s+([l])/g, 'd') // Fix misrecognized 'd' as 'c l'
      .replace(/([v])\s+([v])/g, 'w'); // Fix misrecognized 'w' as 'v v'
  }

  // Final cleanup
  processedText = processedText
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines again
    .replace(/\s{2,}/g, ' ') // Normalize multiple spaces again
    .trim();

  return processedText;
};

// Simple in-memory cache for OCR results
const ocrCache: Record<string, { text: string; timestamp: number }> = {};

/**
 * Process an image using Azure OpenAI for OCR with optimized performance
 * @param imageUrl The URL of the image to process
 * @param isQuestionPaper Whether the image is a question paper
 * @param isModelAnswer Whether the image is a model answer
 * @param isHandwritten Whether the image contains handwritten text
 * @returns The extracted text
 */
const processImageWithAzureOpenAI = async (
  imageUrl: string,
  isQuestionPaper: boolean = false,
  isModelAnswer: boolean = false,
  isHandwritten: boolean = false
): Promise<string> => {
  try {
    // Generate a cache key based on the image URL and document type
    const cacheKey = `${imageUrl.substring(0, 100)}_${isQuestionPaper ? 'qp' : ''}${isModelAnswer ? 'ma' : ''}${isHandwritten ? 'hw' : ''}`;

    // Check if we have a cached result (valid for 1 hour)
    const cachedResult = ocrCache[cacheKey];
    if (cachedResult && (Date.now() - cachedResult.timestamp) < 3600000) {
      console.log('Using cached OCR result');
      return cachedResult.text;
    }

    console.log('Processing image with Azure OpenAI for OCR...');

    // Convert the image URL to base64 (only the data part)
    const base64Image = imageUrl.split(',')[1];

    // Create concise system prompts for better performance
    let systemPrompt = "Extract all text from the image accurately.";

    if (isQuestionPaper) {
      systemPrompt = "Extract text from this question paper. Preserve formatting, question numbers, and options.";
    } else if (isModelAnswer) {
      systemPrompt = "Extract text from this answer sheet. Preserve formatting and mathematical formulas.";
    } else if (isHandwritten) {
      systemPrompt = "Extract handwritten text from this image. Focus on accuracy over formatting.";
    }

    // Create a concise user prompt
    const userPrompt = "Extract all text from this image.";

    // Prepare the request body with optimized parameters
    const requestBody = {
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.0 // Lower temperature for more deterministic results
    };

    // Create a controller for timeout (reduced from 60s to 30s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Make the request to Azure OpenAI API
      const response = await fetch(
        `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': AZURE_OPENAI_API_KEY
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        }
      );

      // Clear the timeout
      clearTimeout(timeoutId);

      // Check if the response is OK
      if (!response.ok) {
        await response.text(); // Read the response but don't store it to avoid unused variable
        console.error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
        throw new Error(`Azure OpenAI API error: ${response.status}`);
      }

      // Parse the response
      const result = await response.json();

      // Extract the generated text from the response
      const extractedText = result.choices?.[0]?.message?.content || '';

      if (extractedText.trim().length > 0) {
        console.log(`Azure OpenAI OCR successful, extracted ${extractedText.length} characters`);

        // Cache the result
        ocrCache[cacheKey] = {
          text: extractedText,
          timestamp: Date.now()
        };

        return extractedText;
      } else {
        throw new Error('Azure OpenAI returned empty text');
      }
    } catch (error) {
      // Clear the timeout if there was an error
      clearTimeout(timeoutId);

      // Log the error and rethrow
      console.error('Error processing image with Azure OpenAI:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in Azure OpenAI OCR processing:', error);
    throw error;
  }
};

/**
 * Extracts text from an image using OCR with Azure OpenAI or OCR.space API
 * @param imageUrl The URL of the image to extract text from
 * @param isQuestionPaper Whether the image is a question paper (true) or answer sheet (false)
 * @param isModelAnswer Whether the image is a model answer (true) or student answer (false)
 * @param isMCQOptions Whether the image contains MCQ options (true) or not (false)
 * @returns The extracted text
 */
export const extractTextFromImage = async (
  imageUrl: string,
  isQuestionPaper: boolean = false,
  isModelAnswer: boolean = false,
  isMCQOptions: boolean = false
): Promise<string> => {
  console.log(`Extracting text from ${isQuestionPaper ? 'question paper' : isModelAnswer ? 'model answer' : isMCQOptions ? 'MCQ options' : 'student answer'} image:`, imageUrl);

  try {
    // Check if we should use online services based on the online/offline mode
    const useOnlineServices = await shouldUseOnlineServices();

    // Log the document type for debugging
    console.log(`Extracting text from image - Document type: ${
      isQuestionPaper ? 'Question Paper' :
      isMCQOptions ? 'MCQ Options' :
      isModelAnswer ? 'Model Answer' :
      !isQuestionPaper && !isModelAnswer && !isMCQOptions ? 'Handwritten Text' :
      'Standard Document'
    }`);

    // Enhanced OCR API key validation and error handling
    if (useOnlineServices) {
      const apiKey = OCR_API_KEY.trim();

      // Comprehensive validation of API key format
      if (!apiKey) {
        console.error("OCR API key is missing");
        return "OCR processing failed: API key is missing. Please check your environment variables or configuration.";
      }

      if (apiKey.length < 8) {
        console.error("Invalid OCR API key format: Key is too short");
        return "OCR processing failed: Invalid API key format (too short). Please contact the administrator to update the OCR API key.";
      }

      // Check for common API key format patterns
      const validOCRSpaceKeyPattern = /^[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}$/i; // Format with hyphens
      const validOCRSpaceKeyPatternNoHyphens = /^[0-9A-F]{32}$/i; // Format without hyphens
      const validSimpleKeyPattern = /^[a-zA-Z0-9]{10,}$/; // Simple alphanumeric key

      const isValidFormat = validOCRSpaceKeyPattern.test(apiKey) ||
                           validOCRSpaceKeyPatternNoHyphens.test(apiKey) ||
                           validSimpleKeyPattern.test(apiKey);

      if (!isValidFormat) {
        console.warn("OCR API key format may be invalid. Will attempt to use it anyway.");
      }

      // Log API key information for debugging (don't log the actual key)
      console.log(`Using OCR API key (length: ${apiKey.length}, format: ${isValidFormat ? 'valid' : 'potentially invalid'})`);

      // Store the validated key format for later use
      const formattedApiKey = apiKey.replace(/-/g, '').trim();
      console.log(`Formatted OCR API key length: ${formattedApiKey.length}`);
    }

    // Determine if this is handwritten text (student answers)
    const isHandwritten = !isQuestionPaper && !isModelAnswer && !isMCQOptions;

    // Generate a cache key for this image
    const cacheKey = `ocr_${imageUrl.substring(0, 100)}_${isQuestionPaper ? 'qp' : ''}${isModelAnswer ? 'ma' : ''}${isMCQOptions ? 'mcq' : ''}`;

    // Check if we have a cached result (valid for 1 hour)
    const cachedResult = ocrCache[cacheKey];
    if (cachedResult && (Date.now() - cachedResult.timestamp) < 3600000) {
      console.log('Using cached OCR result for full image');
      return cachedResult.text;
    }

    // Optimize image processing based on document type
    let processedImageUrl = imageUrl;

    // Only enhance the image if necessary (skip for Azure OpenAI if online)
    if (!useOnlineServices || (useOnlineServices && !AZURE_OPENAI_API_KEY)) {
      console.log("Enhancing image for OCR processing...");
      processedImageUrl = await enhanceImageForOCR(
        imageUrl,
        isQuestionPaper,
        isMCQOptions,
        isHandwritten
      );
    } else {
      console.log("Skipping image enhancement for Azure OpenAI OCR");
    }

    // Array to store text segments with position information
    const textSegments: OCRTextSegment[] = [];

    // Try Azure OpenAI OCR first if online services are available
    if (useOnlineServices && AZURE_OPENAI_API_KEY) {
      try {
        console.log("Using Azure OpenAI for text extraction");

        // Process the image with Azure OpenAI (using original image for better results)
        const azureOcrText = await processImageWithAzureOpenAI(
          imageUrl, // Use original image for Azure OpenAI
          isQuestionPaper,
          isModelAnswer,
          isHandwritten
        );

        // If we got text, post-process it and return
        if (azureOcrText && azureOcrText.trim().length > 0) {
          console.log("Azure OpenAI OCR successful, post-processing text");

          // Apply OCR error pattern corrections first
          const patternCorrectedText = applyOCRErrorPatternCorrections(azureOcrText);

          // Then apply domain-specific dictionary corrections
          const correctedText = applyDomainDictionaryCorrections(patternCorrectedText);

          return correctedText;
        } else {
          console.log("Azure OpenAI OCR returned empty text, falling back to OCR.space API");
        }
      } catch (error) {
        console.error("Error with Azure OpenAI OCR:", error);
        console.log("Falling back to OCR.space API");
      }
    }

    // If Azure OpenAI OCR failed or is not available, try OCR.space API
    if (OCR_API_KEY && useOnlineServices) {
      console.log("Using OCR.space API for text extraction");

      // Segment the image for OCR.space API (only if Azure OpenAI failed)
      console.log("Segmenting image for OCR.space API processing...");
      const segments = await segmentImage(
        processedImageUrl,
        isQuestionPaper,
        isQuestionPaper ? 1200 : 800,  // Smaller segments for handwritten text
        isQuestionPaper ? 1200 : 800,
        0.1  // 10% overlap between segments
      );

      console.log(`Image segmented into ${segments.length} parts for OCR processing`);

      // Process each segment in parallel with the OCR API
      const segmentPromises = segments.map(async (segment, index: number) => {
        try {
          console.log(`Processing segment ${index + 1}/${segments.length} with OCR API`);

          // Determine document type for optimized compression
          let documentType: 'questionPaper' | 'mcqOptions' | 'handwritten' | 'standard' = 'standard';
          if (isQuestionPaper) documentType = 'questionPaper';
          else if (isMCQOptions) documentType = 'mcqOptions';
          else if (isHandwritten) documentType = 'handwritten';

          // Compress the segment with optimized settings for document type
          console.log(`Compressing segment ${index + 1} with optimized settings for ${documentType}`);
          const compressedSegmentUrl = await compressImage(
            segment.dataUrl,
            isHandwritten ? 2000 : isQuestionPaper ? 1800 : 1600, // Higher resolution for handwritten text
            isHandwritten ? 0.95 : isQuestionPaper ? 0.92 : 0.9,  // Higher quality for handwritten text
            documentType
          );

          // Convert the data URL to a Blob
          const blob = dataURLtoBlob(compressedSegmentUrl);

          // Create a FormData object to send the image to the OCR API with optimized parameters
          // Only use parameters that are officially supported by OCR.space API
          const formData = new FormData();

          // Add the API key - this is the most important parameter
          // Format the API key correctly - remove hyphens if present
          const formattedApiKey = OCR_API_KEY.replace(/-/g, '').trim();
          console.log(`Using OCR.space API key (length: ${formattedApiKey.length})`);
          formData.append('apikey', formattedApiKey);

          // Set language to English
          formData.append('language', 'eng');

          // Disable overlay for better performance
          formData.append('isOverlayRequired', 'false');

          // Enable automatic orientation detection
          formData.append('detectOrientation', 'true');

          // Optimize OCR engine and parameters based on document type
          if (isHandwritten) {
            // For handwritten text, use Engine 2 (Neural/ML) with optimized settings
            formData.append('OCREngine', '2'); // Neural engine is better for handwriting
            formData.append('scale', 'true');  // Enable scaling for better recognition
            formData.append('filetype', 'jpg'); // JPEG is better for handwritten content

            // Add additional parameters for handwritten text
            formData.append('detectCheckbox', 'true'); // Helps with form elements
            formData.append('ocrwords', 'true');       // Get word-level data
          }
          else if (isQuestionPaper) {
            // For question papers, use Engine 2 with specific settings for printed text
            formData.append('OCREngine', '2');
            formData.append('scale', 'true');
            formData.append('filetype', 'png'); // PNG is better for printed text

            // Add parameters specific to question papers
            formData.append('ocrwords', 'true');       // Get word-level data
            formData.append('isTable', 'true');        // Better handling of tabular data
          }
          else if (isMCQOptions) {
            // For MCQ options, use Engine 2 with settings optimized for options
            formData.append('OCREngine', '2');
            formData.append('scale', 'true');
            formData.append('filetype', 'png');

            // Add parameters specific to MCQ options
            formData.append('ocrwords', 'true');       // Get word-level data
          }
          else {
            // For other documents, use Engine 2 as default with balanced settings
            formData.append('OCREngine', '2');
            formData.append('scale', 'true');
            formData.append('filetype', 'png');
          }

          // Add the image file with a simplified name to avoid potential issues
          formData.append('file', blob, `segment_${index + 1}.png`);

          // Send the request to the OCR API with better error handling
          console.log(`Sending OCR request for segment ${index + 1}/${segments.length}`);

          // Create a controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

          try {
            // Make the API request with timeout handling
            const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
              method: 'POST',
              body: formData,
              signal: controller.signal
            });

            // Clear the timeout
            clearTimeout(timeoutId);

            // Check if the response is OK
            if (!ocrResponse.ok) {
              const errorText = await ocrResponse.text();
              console.error(`OCR API error: ${ocrResponse.status} ${ocrResponse.statusText}`);
              console.error('Error response:', errorText);
              console.error('OCR API key used:', OCR_API_KEY);

              // Try to parse the error response for more details
              try {
                const errorJson = JSON.parse(errorText);
                console.error('Detailed OCR API error:', JSON.stringify(errorJson, null, 2));
              } catch (e) {
                // If not JSON, just log the raw text
                console.error('Raw error text:', errorText);
              }

              throw new Error(`OCR API error: ${ocrResponse.status} ${ocrResponse.statusText}`);
            }

            // Parse the response
            const ocrResult = await ocrResponse.json();

            // Check if the OCR was successful
            if (ocrResult && ocrResult.IsErroredOnProcessing === false &&
                ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
              const extractedText = ocrResult.ParsedResults[0].ParsedText;

              // If text was extracted, add it to the segments array
              if (extractedText && extractedText.trim().length > 0) {
                console.log(`Segment ${index + 1} OCR successful, extracted ${extractedText.length} characters`);

                // Add the segment with position information
                textSegments.push({
                  text: extractedText,
                  x: segment.x,
                  y: segment.y,
                  width: segment.width,
                  height: segment.height
                });
              } else {
                console.log(`No text extracted from segment ${index + 1}`);

                // If this is a critical segment (like the first segment of a question paper),
                // try to recover it with enhanced OCR parameters
                if ((isQuestionPaper && index === 0) || (isModelAnswer && index === 0)) {
                  console.log(`Critical segment ${index + 1} failed, attempting recovery with enhanced OCR parameters`);

                  try {
                    // Create a new FormData with more aggressive parameters
                    const retryFormData = new FormData();
                    retryFormData.append('apikey', formattedApiKey);
                    retryFormData.append('language', 'eng');
                    retryFormData.append('isOverlayRequired', 'false');
                    retryFormData.append('detectOrientation', 'true');
                    retryFormData.append('OCREngine', '2');
                    retryFormData.append('scale', 'true');
                    retryFormData.append('filetype', 'png');

                    // Try with a higher quality image
                    const highQualitySegmentUrl = await compressImage(
                      segment.dataUrl,
                      2400, // Higher resolution
                      0.98, // Higher quality
                      isQuestionPaper ? 'questionPaper' : 'standard'
                    );

                    // Convert to blob
                    const highQualityBlob = dataURLtoBlob(highQualitySegmentUrl);
                    retryFormData.append('file', highQualityBlob, 'critical_segment.png');

                    // Make a retry request
                    console.log(`Retrying critical segment ${index + 1} with enhanced parameters`);
                    const retryResponse = await fetch('https://api.ocr.space/parse/image', {
                      method: 'POST',
                      body: retryFormData
                    });

                    if (retryResponse.ok) {
                      const retryResult = await retryResponse.json();

                      if (retryResult && retryResult.IsErroredOnProcessing === false &&
                          retryResult.ParsedResults && retryResult.ParsedResults.length > 0) {
                        const recoveredText = retryResult.ParsedResults[0].ParsedText;

                        if (recoveredText && recoveredText.trim().length > 0) {
                          console.log(`Recovered text from critical segment ${index + 1} with enhanced parameters`);

                          textSegments.push({
                            text: recoveredText,
                            x: segment.x,
                            y: segment.y,
                            width: segment.width,
                            height: segment.height,
                            isRecovered: true
                          });
                        }
                      }
                    }
                  } catch (recoveryError) {
                    console.error(`Error recovering critical segment ${index + 1}:`, recoveryError);
                  }
                }
              }
            } else {
              // Handle specific error codes
              const errorMessage = ocrResult.ErrorMessage || 'Unknown error';
              console.error(`OCR API Error for segment ${index + 1}:`, errorMessage);

              // Check for specific error types and provide more detailed logging
              if (typeof errorMessage === 'string') {
                if (errorMessage.includes('E202')) {
                  console.log('Detected OCR.space internal server error (E202), will retry with enhanced parameters');
                  // Store error for user feedback
                  segment.error = 'OCR.space internal server error (E202)';
                } else if (errorMessage.includes('E401')) {
                  console.error('OCR.space authentication error (E401): Invalid API key');
                  segment.error = 'Invalid API key (E401)';
                } else if (errorMessage.includes('E403')) {
                  console.error('OCR.space authorization error (E403): API key usage limit exceeded');
                  segment.error = 'API key usage limit exceeded (E403)';
                } else if (errorMessage.includes('E404')) {
                  console.error('OCR.space resource error (E404): Resource not found');
                  segment.error = 'Resource not found (E404)';
                } else if (errorMessage.includes('E413')) {
                  console.error('OCR.space file size error (E413): Image file too large');
                  segment.error = 'Image file too large (E413)';

                  // Try to compress the image further and retry
                  try {
                    const smallerSegmentUrl = await compressImage(
                      segment.dataUrl,
                      1200, // Smaller resolution
                      0.7,  // Lower quality
                      'standard'
                    );

                    // Convert to blob
                    const smallerBlob = dataURLtoBlob(smallerSegmentUrl);

                    // Create new FormData with smaller image
                    const retryFormData = new FormData();
                    retryFormData.append('apikey', formattedApiKey);
                    retryFormData.append('language', 'eng');
                    retryFormData.append('isOverlayRequired', 'false');
                    retryFormData.append('detectOrientation', 'true');
                    retryFormData.append('OCREngine', '2');
                    retryFormData.append('file', smallerBlob, 'smaller_image.png');

                    // Make a retry request
                    console.log(`Retrying segment ${index + 1} with smaller image`);
                    const retryResponse = await fetch('https://api.ocr.space/parse/image', {
                      method: 'POST',
                      body: retryFormData
                    });

                    if (retryResponse.ok) {
                      const retryResult = await retryResponse.json();

                      if (retryResult && retryResult.IsErroredOnProcessing === false &&
                          retryResult.ParsedResults && retryResult.ParsedResults.length > 0) {
                        const recoveredText = retryResult.ParsedResults[0].ParsedText;

                        if (recoveredText && recoveredText.trim().length > 0) {
                          console.log(`Recovered text from segment ${index + 1} with smaller image`);

                          textSegments.push({
                            text: recoveredText,
                            x: segment.x,
                            y: segment.y,
                            width: segment.width,
                            height: segment.height,
                            isRecovered: true
                          });
                        }
                      }
                    }
                  } catch (compressionError) {
                    console.error(`Error compressing image for retry:`, compressionError);
                  }
                } else if (errorMessage.includes('E429')) {
                  console.error('OCR.space rate limit error (E429): Too many requests');
                  segment.error = 'Too many requests (E429)';
                } else if (errorMessage.includes('E500')) {
                  console.error('OCR.space server error (E500): Internal server error');
                  segment.error = 'Internal server error (E500)';
                } else if (errorMessage.includes('E503')) {
                  console.error('OCR.space service error (E503): Service unavailable');
                  segment.error = 'Service unavailable (E503)';
                } else {
                  // Generic error
                  segment.error = `OCR error: ${errorMessage}`;
                }
              } else if (Array.isArray(errorMessage)) {
                if (errorMessage.some(msg => typeof msg === 'string' && msg.includes('E202'))) {
                  console.log('Detected OCR.space internal server error (E202) in array, will retry with enhanced parameters');
                  segment.error = 'OCR.space internal server error (E202)';
                }
              }

              if (ocrResult.OCRExitCode && ocrResult.OCRExitCode !== 1) {
                console.log(`OCR.space exit code ${ocrResult.OCRExitCode}, will retry with enhanced parameters`);
                segment.error = `OCR exit code: ${ocrResult.OCRExitCode}`;
              }

              // For critical segments, try recovery with enhanced OCR parameters
              if ((isQuestionPaper && index === 0) || (isModelAnswer && index === 0)) {
                console.log(`Critical segment ${index + 1} failed with OCR API, attempting recovery with enhanced parameters`);

                try {
                  // Create a new FormData with more aggressive parameters
                  const retryFormData = new FormData();
                  retryFormData.append('apikey', formattedApiKey);
                  retryFormData.append('language', 'eng');
                  retryFormData.append('isOverlayRequired', 'false');
                  retryFormData.append('detectOrientation', 'true');
                  retryFormData.append('OCREngine', '2');
                  retryFormData.append('scale', 'true');
                  retryFormData.append('filetype', 'png');

                  // Try with a higher quality image and different preprocessing
                  const highQualitySegmentUrl = await compressImage(
                    segment.dataUrl,
                    2400, // Higher resolution
                    0.99, // Highest quality
                    isQuestionPaper ? 'questionPaper' : isModelAnswer ? 'standard' : isHandwritten ? 'handwritten' : 'standard'
                  );

                  // Convert to blob
                  const highQualityBlob = dataURLtoBlob(highQualitySegmentUrl);
                  retryFormData.append('file', highQualityBlob, 'critical_segment_retry.png');

                  // Make a retry request
                  console.log(`Retrying critical segment ${index + 1} with enhanced parameters`);
                  const retryResponse = await fetch('https://api.ocr.space/parse/image', {
                    method: 'POST',
                    body: retryFormData
                  });

                  if (retryResponse.ok) {
                    const retryResult = await retryResponse.json();

                    if (retryResult && retryResult.IsErroredOnProcessing === false &&
                        retryResult.ParsedResults && retryResult.ParsedResults.length > 0) {
                      const recoveredText = retryResult.ParsedResults[0].ParsedText;

                      if (recoveredText && recoveredText.trim().length > 0) {
                        console.log(`Recovered text from critical segment ${index + 1} with enhanced parameters`);

                        textSegments.push({
                          text: recoveredText,
                          x: segment.x,
                          y: segment.y,
                          width: segment.width,
                          height: segment.height,
                          isRecovered: true
                        });
                      }
                    }
                  }
                } catch (recoveryError) {
                  console.error(`Error recovering critical segment ${index + 1}:`, recoveryError);
                }
              }
            }
          } catch (error) {
            console.error(`Error processing segment ${index + 1}:`, error);
          }
        } catch (error) {
          console.error(`Error processing segment ${index + 1}:`, error);
        }
      });

      // Wait for all segments to be processed
      await Promise.all(segmentPromises);

      // If we got text from at least some segments, reconstruct the text
      if (textSegments.length > 0) {
        console.log(`Successfully extracted text from ${textSegments.length}/${segments.length} segments`);

        // Reconstruct the text from all segments
        const reconstructedText = reconstructTextFromSegments(textSegments, isQuestionPaper, isModelAnswer);

        // Return the reconstructed text
        return reconstructedText;
      } else {
        console.log("No text extracted from any segment, OCR processing failed");
      }
    }

    // If online OCR failed or is not available, provide a helpful error message
    console.log(useOnlineServices ? "OCR API failed, providing detailed error message" : "Using offline mode: OCR API not available");

    // Check if we have any error messages from segments
    const errorMessages: string[] = [];

    // Collect unique error types
    const uniqueErrors = [...new Set(errorMessages)];

    // Add a debug message to show why we're failing
    if (useOnlineServices && OCR_API_KEY) {
      console.error("OCR API failed with key length:", OCR_API_KEY.length);
      console.error("This might be due to an invalid API key format or other API issues.");
      console.error("Check the console logs above for more details on the API error.");

      if (uniqueErrors.length > 0) {
        console.error("Specific OCR errors encountered:", uniqueErrors);
      }
    }

    // Provide a specific error message based on the errors encountered
    if (uniqueErrors.length > 0) {
      // Helper function to check if any error includes specific text
      const hasErrorType = (texts: string[]): boolean => {
        return uniqueErrors.some(err => {
          if (typeof err !== 'string') return false;
          return texts.some(text => err.includes(text));
        });
      };

      // Check for API key issues
      if (hasErrorType(['Invalid API key', 'E401'])) {
        console.error("OCR API key validation failed");
        return "OCR processing failed due to an invalid API key. Please contact the administrator to update the OCR API key. Error code: E401";
      }
      // Check for usage limits
      else if (hasErrorType(['usage limit', 'E403'])) {
        console.error("OCR API usage limit exceeded");
        return "OCR processing failed because the API usage limit has been exceeded. Please try again later or contact the administrator. Error code: E403";
      }
      // Check for file size issues
      else if (hasErrorType(['too large', 'E413'])) {
        console.error("OCR API file size limit exceeded");
        return "OCR processing failed because the image is too large. Please try again with a smaller image or resize the current one. Error code: E413";
      }
      // Check for rate limiting
      else if (hasErrorType(['Too many requests', 'E429'])) {
        console.error("OCR API rate limit exceeded");
        return "OCR processing failed due to rate limiting. Please wait a moment and try again. Error code: E429";
      }
      // Check for server errors
      else if (hasErrorType(['server error', 'E500', 'E503'])) {
        console.error("OCR API server error");
        return "OCR processing failed due to a server error. Please try again later. Error code: E500/E503";
      }
      // Check for timeout errors
      else if (hasErrorType(['timeout', 'aborted'])) {
        console.error("OCR API request timed out");
        return "OCR processing timed out. The server took too long to respond. Please try again with a smaller or simpler image.";
      }
      // Check for network errors
      else if (hasErrorType(['network', 'connection'])) {
        console.error("Network error during OCR API request");
        return "OCR processing failed due to a network error. Please check your internet connection and try again.";
      }
      // Other API errors
      else {
        console.error("Unknown OCR API error:", uniqueErrors);
        return `OCR processing failed with the following error(s): ${uniqueErrors.join(', ')}. Please try again or contact support.`;
      }
    }

    // Default error message if no specific error was identified
    return "OCR processing failed. Please check your internet connection and try again. If the problem persists, contact the administrator.";
  } catch (error) {
    console.error('OCR Error:', error);

    // Determine if this is a network error
    const isNetworkError = error instanceof TypeError &&
                          (error.message.includes('network') ||
                           error.message.includes('fetch') ||
                           error.message.includes('Failed to fetch'));

    // Determine if this is a timeout error
    const isTimeoutError = error.name === 'AbortError' ||
                          error.message.includes('timeout') ||
                          error.message.includes('aborted');

    // Create a detailed error message with error type information
    let errorPrefix = "";
    if (isNetworkError) {
      errorPrefix = "Network error: Please check your internet connection. ";
    } else if (isTimeoutError) {
      errorPrefix = "Request timeout: The OCR service took too long to respond. ";
    } else {
      errorPrefix = "Error: ";
    }

    // Return a more helpful fallback message based on document type
    if (isQuestionPaper) {
      return errorPrefix + "Could not process the question paper. Please try again with a clearer image. For best results:\n\n" +
        "• Ensure the image is properly focused and well-lit\n" +
        "• Avoid glare or shadows on the paper\n" +
        "• Make sure the paper is flat without folds\n" +
        "• Try using a higher resolution image\n" +
        "• Ensure the text is clearly visible and not blurry\n" +
        "• Try processing the image in smaller sections";
    } else if (isModelAnswer) {
      return errorPrefix + "Could not process the model answer. Please try again with a clearer image. For best results:\n\n" +
        "• Ensure the image is properly focused and well-lit\n" +
        "• Avoid glare or shadows on the paper\n" +
        "• Make sure the text is clearly visible\n" +
        "• Try using a higher resolution image\n" +
        "• Ensure the paper is flat and not crumpled\n" +
        "• Try processing the image in smaller sections";
    } else if (isMCQOptions) {
      return errorPrefix + "Could not process the MCQ options. Please try again with a clearer image. For best results:\n\n" +
        "• Ensure all options (A, B, C, D) are clearly visible\n" +
        "• Make sure the image is well-lit and in focus\n" +
        "• Try capturing just the options section for better results\n" +
        "• Ensure there is good contrast between text and background\n" +
        "• Avoid capturing at an angle - take the photo straight on\n" +
        "• Try cropping the image to include only the MCQ options";
    } else {
      return errorPrefix + "Could not process the handwritten answer. Please try again with a clearer image. For best results:\n\n" +
        "• Ensure handwriting is clear and legible\n" +
        "• Make sure the image is well-lit without shadows\n" +
        "• Avoid glare on the paper\n" +
        "• Try using a higher resolution image\n" +
        "• Make sure the paper is flat without folds\n" +
        "• Use dark ink on white paper for best contrast\n" +
        "• Try processing the image in smaller sections";
    }
  }
};

/**
 * Analyzes handwriting from an image
 * @param imageUrl The URL of the image to analyze
 * @returns A handwriting analysis result with overall score and feedback
 */


/**
 * Checks if a question is a multiple-choice question
 * @param question The question text to check
 * @returns True if the question is a multiple-choice question, false otherwise
 */
// The isMultipleChoiceQuestion function is already defined at the top of the file

/**
 * Extracts questions from question paper text
 * @param text The text of the question paper
 * @returns An array of question objects with text and marks
 */
export const extractQuestionsFromText = (text: string): { number: number; text: string; marks: number }[] => {
  console.log("Extracting questions from text:", text.substring(0, 100) + "...");

  // Split the text into lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  const questions: { number: number; text: string; marks: number }[] = [];
  let currentQuestionText = '';
  let currentQuestionNumber = 0;
  let currentMarks = 0;

  // Regular expressions for detecting question patterns
  const questionStartRegex = /^(?:Q|Question|Ques)\.?\s*(\d+)[.:]?\s*(.*)/i;
  const marksRegex = /\((\d+)\s*(?:marks|mark|points|point)\)/i;
  const standaloneNumberRegex = /^(\d+)[.:]?\s*(.*)/;

  // Special handling for MCQ-only papers
  // Check if this looks like an MCQ-only paper by scanning for option patterns
  let mcqCount = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^[A-D][.)]\s+/.test(lines[i])) {
      mcqCount++;
    }
  }

  // If we have a significant number of MCQ option lines, this is likely an MCQ paper
  const isMCQPaper = mcqCount > 5;

  // Special handling for MCQ papers
  if (isMCQPaper) {
    console.log("Detected MCQ-only paper, using specialized extraction");

    let currentQuestion = "";
    let questionNumber = 0;
    let collectingOptions = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this line starts a new question
      const questionMatch = line.match(questionStartRegex) || line.match(standaloneNumberRegex);

      if (questionMatch) {
        // If we were already processing a question, save it
        if (questionNumber > 0 && currentQuestion.length > 0) {
          // Check if we have collected a complete MCQ (question + options)
          if (isMultipleChoiceQuestion(currentQuestion)) {
            questions.push({
              number: questionNumber,
              text: currentQuestion.trim(),
              marks: 1 // Default to 1 mark per MCQ, but this will be overridden by user input
            });
          }
        }

        // Start a new question
        questionNumber = parseInt(questionMatch[1]);
        currentQuestion = questionMatch[2] || '';
        collectingOptions = true;
      }
      // Check if this is an option line (A, B, C, D)
      else if (collectingOptions && /^[A-D][.)]\s+/.test(line)) {
        // Add this option to the current question
        currentQuestion += '\n' + line;
      }
      // Check if this might be the end of options
      else if (collectingOptions && currentQuestion.length > 0) {
        // If we've already collected some options and this isn't an option line,
        // it might be the start of the next question without a clear number
        if (isMultipleChoiceQuestion(currentQuestion)) {
          // We have a complete MCQ, save it
          questions.push({
            number: questionNumber,
            text: currentQuestion.trim(),
            marks: 1 // Default to 1 mark for MCQs
          });

          // Start a new question (without a clear number)
          questionNumber = questions.length + 1;
          currentQuestion = line;
          collectingOptions = true;
        } else {
          // Still collecting the current question
          currentQuestion += '\n' + line;
        }
      } else {
        // If we're not collecting options yet, this might be the start of a question
        // without a clear number marker
        if (currentQuestion.length === 0) {
          questionNumber = 1;
          currentQuestion = line;
          collectingOptions = true;
        } else {
          // Otherwise, add to the current question
          currentQuestion += '\n' + line;
        }
      }
    }

    // Add the last question if there is one
    if (questionNumber > 0 && currentQuestion.length > 0) {
      if (isMultipleChoiceQuestion(currentQuestion)) {
        questions.push({
          number: questionNumber,
          text: currentQuestion.trim(),
          marks: 1 // Default to 1 mark for MCQs
        });
      }
    }
  }
  // Standard question extraction for non-MCQ papers
  else {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this line starts a new question
      const questionMatch = line.match(questionStartRegex) || line.match(standaloneNumberRegex);

      if (questionMatch) {
        // If we were already processing a question, save it
        if (currentQuestionNumber > 0 && currentQuestionText.length > 0) {
          questions.push({
            number: currentQuestionNumber,
            text: currentQuestionText.trim(),
            marks: currentMarks > 0 ? currentMarks : 5 // Default to 5 marks if not specified
          });
        }

        // Start a new question
        currentQuestionNumber = parseInt(questionMatch[1]);
        currentQuestionText = questionMatch[2] || '';

        // Check for marks in this line
        const marksMatch = line.match(marksRegex);
        currentMarks = marksMatch ? parseInt(marksMatch[1]) : 0;
      } else {
        // This line is part of the current question
        if (currentQuestionNumber > 0) {
          // Check if this line contains marks information
          const marksMatch = line.match(marksRegex);
          if (marksMatch && currentMarks === 0) {
            currentMarks = parseInt(marksMatch[1]);
          }

          // Add this line to the current question text
          currentQuestionText += ' ' + line;
        }
      }
    }

    // Add the last question if there is one
    if (currentQuestionNumber > 0 && currentQuestionText.length > 0) {
      questions.push({
        number: currentQuestionNumber,
        text: currentQuestionText.trim(),
        marks: currentMarks > 0 ? currentMarks : 5 // Default to 5 marks if not specified
      });
    }
  }

  // If no questions were found, try a simpler approach
  if (questions.length === 0) {
    console.log("No questions found with standard format, trying simpler approach");

    // Split by double newlines to separate paragraphs
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];

      // Check if this paragraph looks like a question
      if (paragraph.includes('?') || /\b(explain|describe|discuss|define|what|how|why)\b/i.test(paragraph)) {
        questions.push({
          number: i + 1,
          text: paragraph,
          marks: 5 // Default to 5 marks
        });
      } else if (isMultipleChoiceQuestion(paragraph)) {
        // This paragraph is an MCQ
        questions.push({
          number: i + 1,
          text: paragraph,
          marks: 1 // Default to 1 mark per MCQ, but this will be overridden by user input
        });
      }
    }
  }

  console.log(`Extracted ${questions.length} questions:`, questions);
  return questions;
};



/**
 * Import the template service for fallback answers
 */

// Create a stub for the template service if it doesn't exist
const getTemplateAnswer = async (questionText: string): Promise<string> => {
  console.log("Template service not implemented, using fallback");
  return `This is a placeholder answer for the question: "${questionText.substring(0, 50)}..."`;
};

/**
 * Generates a model answer for a question using OpenAI
 * For MCQ questions, returns only the letter of the correct answer
 * For non-MCQ questions, returns a concise answer
 * @param questionText The text of the question to generate an answer for
 * @returns The generated model answer
 */
export const generateModelAnswer = async (questionText: string): Promise<string> => {
  console.log("Generating model answer for question:", questionText);

  if (!questionText || questionText.trim().length === 0) {
    console.error("Empty question text provided to generateModelAnswer");
    return "Unable to generate an answer for an empty question. Please provide a valid question.";
  }

  // Check if this is an MCQ question
  const isMCQ = isMultipleChoiceQuestion(questionText);
  console.log(`Question type: ${isMCQ ? 'Multiple-choice' : 'Open-ended'}, generating answer`);

  // Try to generate an answer using OpenAI
  try {
    console.log("Generating answer with OpenAI API");

    // Enhanced OCR text cleanup for better question understanding
    let cleanedQuestionText = questionText
      // Basic formatting fixes
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase letters
      .replace(/([0-9])([a-zA-Z])/g, '$1 $2') // Add space between numbers and letters
      .replace(/([a-zA-Z])([0-9])/g, '$1 $2') // Add space between letters and numbers
      .replace(/\s{2,}/g, ' ') // Normalize multiple spaces
      .trim();

    // Fix common OCR errors in questions
    cleanedQuestionText = cleanedQuestionText
      // Fix common character confusions
      .replace(/[|]l/g, 'I') // Fix pipe character and lowercase L to uppercase I
      .replace(/\b[|]I\b/g, 'I') // Fix pipe character to uppercase I
      .replace(/\brn\b/g, 'm') // Fix 'rn' misread as 'm'
      .replace(/\bvv\b/g, 'w') // Fix 'vv' misread as 'w'
      .replace(/([a-z])l([a-z])/g, '$1i$2') // Fix 'l' misread as 'i' in words

      // Fix common word errors
      .replace(/\b[0O]ne\b/g, 'One')
      .replace(/\b[0O]f\b/g, 'of')
      .replace(/\b[1I]n\b/g, 'In')
      .replace(/\b[1I]s\b/g, 'is')
      .replace(/\b[1I]t\b/g, 'it')
      .replace(/\b[1I]f\b/g, 'if')
      .replace(/\bTne\b/g, 'The')
      .replace(/\btne\b/g, 'the')
      .replace(/\bana\b/g, 'and')
      .replace(/\bAna\b/g, 'And');

    // Format MCQ questions for better results
    let formattedQuestion = cleanedQuestionText;
    if (isMCQ) {
      // Enhanced MCQ option extraction
      // Try multiple patterns to extract options
      const optionPatterns = [
        /([A-Da-d])[.|)]\s*([^\n]+)/g,  // Standard A) or A. format
        /\b(Option|Choice)\s+([A-Da-d])\s*[:]\s*([^\n]+)/gi, // "Option A: text" format
        /\b([A-Da-d])\s*[-:]\s*([^\n]+)/g // A - text or A: text format
      ];

      let optionMatches = null;

      // Try each pattern until we find matches
      for (const pattern of optionPatterns) {
        optionMatches = cleanedQuestionText.match(pattern);
        if (optionMatches && optionMatches.length >= 2) {
          break;
        }
      }

      if (optionMatches && optionMatches.length >= 2) {
        // Extract the main question part (everything before the first option)
        // Try multiple splitting patterns
        let questionPart = "";
        const splitPatterns = [
          /[A-Da-d][.|)]/,
          /\b(Option|Choice)\s+[A-Da-d]\s*[:]/i,
          /\b[A-Da-d]\s*[-:]/
        ];

        for (const pattern of splitPatterns) {
          const parts = cleanedQuestionText.split(pattern);
          if (parts.length > 1) {
            questionPart = parts[0].trim();
            break;
          }
        }

        // If we couldn't extract the question part, use the first 1/3 of the text
        if (!questionPart) {
          const approxQuestionLength = Math.floor(cleanedQuestionText.length / 3);
          questionPart = cleanedQuestionText.substring(0, approxQuestionLength).trim();
        }

        // Format the question and options in a structured way
        formattedQuestion = `${questionPart}\n\nOptions:\n`;

        // Add each option on a new line with consistent formatting
        optionMatches.forEach((option: string) => {
          let optionLetter = '';
          let optionText = '';

          // Extract option letter and text based on the format
          if (option.match(/^[A-Da-d][.|)]/)) {
            optionLetter = option.match(/^([A-Da-d])[.|)]/)?.[1]?.toUpperCase() || '';
            optionText = option.replace(/^[A-Da-d][.|)]/, '').trim();
          } else if (option.match(/\b(Option|Choice)\s+[A-Da-d]\s*[:]/i)) {
            optionLetter = option.match(/\b(Option|Choice)\s+([A-Da-d])\s*[:]/i)?.[2]?.toUpperCase() || '';
            optionText = option.replace(/\b(Option|Choice)\s+[A-Da-d]\s*[:]/i, '').trim();
          } else if (option.match(/\b[A-Da-d]\s*[-:]/)) {
            optionLetter = option.match(/\b([A-Da-d])\s*[-:]/)?.[1]?.toUpperCase() || '';
            optionText = option.replace(/\b[A-Da-d]\s*[-:]/, '').trim();
          }

          if (optionLetter && optionText) {
            formattedQuestion += `${optionLetter}) ${optionText}\n`;
          }
        });
      }
    }

    // Import the OpenAI service
    const { generateOpenAIAnswer } = await import('@/services/openaiService');

    // Generate the answer using OpenAI with appropriate system prompt
    let systemPrompt: string;
    if (isMCQ) {
      systemPrompt = "You are an expert AI exam assistant. For the following multiple-choice question, carefully analyze the question and all options. Your task is to determine the correct answer. Provide ONLY the letter of the correct option (A, B, C, or D) without any explanation, workings, or additional text. Just the single letter of the correct answer. If the options are labeled with lowercase letters (a, b, c, d), convert your answer to uppercase. For example, if the answer is option B, respond with just 'B'.";
    } else {
      systemPrompt = "You are an expert AI exam assistant. For the following question, provide a brief, direct answer. Your answer should be concise and to the point. Focus on key concepts, definitions, and important facts. Include only the essential information needed to answer the question correctly. Do not include any explanations, reasoning, or unnecessary details.";
    }

    // Generate the answer using OpenAI
    const openaiAnswer = await generateOpenAIAnswer(formattedQuestion, undefined, systemPrompt);

    if (openaiAnswer && openaiAnswer.trim().length > 0) {
      console.log("Successfully generated answer with OpenAI API");
      return openaiAnswer;
    }

    throw new Error("OpenAI returned empty response");
  } catch (error) {
    console.error("Error with OpenAI API:", error);

    // Try template matching as fallback
    console.log("Trying template matching as fallback");
    const templateAnswer = getTemplateAnswer(questionText);
    if (templateAnswer) {
      console.log("Found matching template answer");
      return templateAnswer;
    }

    // Return a generic answer if all else fails
    console.log("All methods failed, returning generic answer");
    return `This is a model answer for the question: "${questionText.substring(0, 100)}${questionText.length > 100 ? '...' : ''}".

Unfortunately, we couldn't generate a specific answer at this time. Please try again later.

In a real exam, you would want to:
1. Understand the key concepts related to this topic
2. Provide clear explanations with relevant examples
3. Structure your answer logically with an introduction, body, and conclusion
4. Address all parts of the question
5. Use appropriate terminology and technical language

Please check your internet connection and try again, or consult your course materials for the correct answer.`;
  }
};





export const analyzeHandwriting = async (imageUrl: string): Promise<HandwritingAnalysisResult> => {
  console.log("Analyzing handwriting from image:", imageUrl);

  try {
    // First, extract text from the image using OCR
    const extractedText = await extractTextFromImage(imageUrl);

    // If text extraction failed, return a basic analysis
    if (!extractedText || extractedText.includes("Error processing") || extractedText.includes("No text could be extracted")) {
      return generateBasicHandwritingAnalysis();
    }

    // Analyze the extracted text for handwriting characteristics
    const analysis = analyzeHandwritingCharacteristics(extractedText, imageUrl);

    // Generate concise handwriting feedback for evaluation results
    analysis.conciseFeedback = generateConciseHandwritingFeedback(analysis.feedbackItems);

    return analysis;
  } catch (error) {
    console.error("Error analyzing handwriting:", error);

    // Return a fallback analysis in case of error
    return generateBasicHandwritingAnalysis();
  }
};

/**
 * Analyzes handwriting characteristics from extracted text and image
 * @param extractedText The text extracted from the image
 * @param imageUrl The URL of the image (for potential image-based analysis)
 * @returns A handwriting analysis result
 */
const analyzeHandwritingCharacteristics = (extractedText: string, _imageUrl: string): HandwritingAnalysisResult => {
  // Analyze text characteristics
  const lines = extractedText.split('\n').filter(line => line.trim().length > 0);

  // Check for common issues in OCR text that might indicate handwriting problems
  const inconsistentSpacing = /\s{3,}/.test(extractedText);
  const mixedCase = /[A-Z][a-z]+[A-Z]/.test(extractedText);
  const symbolNoise = (extractedText.match(/[^a-zA-Z0-9\s.,;:?!'"()-]/g) || []).length;
  const repeatedChars = /(.)\1{3,}/.test(extractedText);

  // Generate feedback items based on analysis
  const feedbackItems: HandwritingFeedback[] = [];

  // Legibility analysis
  const legibilityScore = calculateLegibilityScore(extractedText, symbolNoise);
  feedbackItems.push({
    category: "Legibility",
    score: legibilityScore,
    feedback: generateLegibilityFeedback(legibilityScore),
    suggestions: generateLegibilitySuggestions(legibilityScore, symbolNoise)
  });

  // Spacing analysis
  const spacingScore = calculateSpacingScore(extractedText, inconsistentSpacing);
  feedbackItems.push({
    category: "Spacing",
    score: spacingScore,
    feedback: generateSpacingFeedback(spacingScore, inconsistentSpacing),
    suggestions: generateSpacingSuggestions(spacingScore)
  });

  // Alignment analysis
  const alignmentScore = calculateAlignmentScore(lines);
  feedbackItems.push({
    category: "Alignment",
    score: alignmentScore,
    feedback: generateAlignmentFeedback(alignmentScore),
    suggestions: generateAlignmentSuggestions(alignmentScore)
  });

  // Letter formation analysis
  const letterFormationScore = calculateLetterFormationScore(extractedText, symbolNoise, mixedCase);
  feedbackItems.push({
    category: "Letter Formation",
    score: letterFormationScore,
    feedback: generateLetterFormationFeedback(letterFormationScore),
    suggestions: generateLetterFormationSuggestions(letterFormationScore, mixedCase)
  });

  // Consistency analysis
  const consistencyScore = calculateConsistencyScore(extractedText, mixedCase, repeatedChars);
  feedbackItems.push({
    category: "Consistency",
    score: consistencyScore,
    feedback: generateConsistencyFeedback(consistencyScore),
    suggestions: generateConsistencySuggestions(consistencyScore)
  });

  // Calculate overall score (weighted average of all categories)
  const weights = {
    Legibility: 0.3,
    Spacing: 0.2,
    Alignment: 0.15,
    "Letter Formation": 0.2,
    Consistency: 0.15
  };

  let weightedSum = 0;
  let totalWeight = 0;

  feedbackItems.forEach(item => {
    const weight = weights[item.category as keyof typeof weights] || 0.2;
    weightedSum += item.score * weight;
    totalWeight += weight;
  });

  const overallScore = Math.round(weightedSum / totalWeight);

  return {
    overallScore,
    feedbackItems
  };
};

/**
 * Generates a basic handwriting analysis when detailed analysis is not possible
 * @returns A basic handwriting analysis result
 */
const generateBasicHandwritingAnalysis = (): HandwritingAnalysisResult => {
  const feedbackItems: HandwritingFeedback[] = [
    {
      category: "Legibility",
      score: 6,
      feedback: "The handwriting appears to have some legibility issues.",
      suggestions: ["Practice writing more clearly", "Ensure proper letter formation"]
    },
    {
      category: "Spacing",
      score: 6,
      feedback: "Spacing between words and letters could be improved.",
      suggestions: ["Maintain consistent spacing between words", "Leave adequate space between letters"]
    },
    {
      category: "Alignment",
      score: 7,
      feedback: "Text alignment appears to be generally consistent.",
      suggestions: ["Practice writing on lined paper"]
    },
    {
      category: "Letter Formation",
      score: 6,
      feedback: "Some letters may be inconsistently formed.",
      suggestions: ["Practice forming letters consistently", "Pay attention to letter shapes"]
    },
    {
      category: "Consistency",
      score: 6,
      feedback: "The overall consistency of the handwriting could be improved.",
      suggestions: ["Maintain consistent style throughout writing", "Practice writing at a steady pace"]
    }
  ];

  const conciseFeedback = [
    "Work on handwriting clarity for better readability.",
    "Maintain consistent letter formation and spacing."
  ];

  return {
    overallScore: 6,
    feedbackItems,
    conciseFeedback
  };
};

/**
 * Generates concise handwriting feedback for evaluation results
 * @param feedbackItems The detailed handwriting feedback items
 * @returns An array of concise feedback points
 */
const generateConciseHandwritingFeedback = (feedbackItems: HandwritingFeedback[]): string[] => {
  const feedback: string[] = [];

  // Find the lowest scoring categories
  const sortedItems = [...feedbackItems].sort((a, b) => a.score - b.score);
  const lowestItems = sortedItems.slice(0, 2);

  // Add feedback for the lowest scoring categories
  lowestItems.forEach(item => {
    switch (item.category) {
      case "Legibility":
        if (item.score < 7) {
          feedback.push("Improve handwriting clarity for better readability.");
        }
        break;
      case "Spacing":
        if (item.score < 7) {
          feedback.push("Work on consistent spacing between words and letters.");
        }
        break;
      case "Alignment":
        if (item.score < 7) {
          feedback.push("Practice writing on lined paper to maintain straight lines.");
        }
        break;
      case "Letter Formation":
        if (item.score < 7) {
          feedback.push("Focus on forming letters consistently and clearly.");
        }
        break;
      case "Consistency":
        if (item.score < 7) {
          feedback.push("Maintain consistent handwriting style throughout your answers.");
        }
        break;
    }
  });

  // If we don't have enough feedback, add a general one
  if (feedback.length < 1) {
    feedback.push("Continue practicing your handwriting for optimal presentation.");
  }

  return feedback;
};

/**
 * Calculates a legibility score based on text characteristics
 */
const calculateLegibilityScore = (text: string, symbolNoise: number): number => {
  let score = 8; // Start with a good score

  // Deduct for issues that affect legibility
  if (symbolNoise > 10) score -= 3;
  else if (symbolNoise > 5) score -= 2;
  else if (symbolNoise > 0) score -= 1;

  // Check for other legibility issues
  if (/[0o1l|I]/.test(text)) score -= 1; // Commonly confused characters

  // Ensure score is within bounds
  return Math.max(1, Math.min(10, score));
};

/**
 * Generates feedback for legibility score
 */
const generateLegibilityFeedback = (score: number): string => {
  if (score >= 9) return "The handwriting is very clear and easily readable.";
  if (score >= 7) return "The handwriting is generally readable with minor clarity issues.";
  if (score >= 5) return "The handwriting is readable but some letters are difficult to distinguish.";
  if (score >= 3) return "The handwriting has significant legibility issues making some words difficult to read.";
  return "The handwriting is very difficult to read with major legibility problems.";
};

/**
 * Generates suggestions for improving legibility
 */
const generateLegibilitySuggestions = (score: number, symbolNoise: number): string[] => {
  const suggestions: string[] = [];

  if (score < 8) suggestions.push("Focus on forming clear, distinct letters");
  if (score < 6) suggestions.push("Practice writing more slowly to improve clarity");
  if (symbolNoise > 5) suggestions.push("Avoid unnecessary marks or corrections that can confuse readers");

  return suggestions.length > 0 ? suggestions : ["Maintain your current level of clarity"];
};

/**
 * Calculates a spacing score based on text characteristics
 */
const calculateSpacingScore = (text: string, inconsistentSpacing: boolean): number => {
  let score = 8; // Start with a good score

  // Deduct for spacing issues
  if (inconsistentSpacing) score -= 2;
  if (/\w\w\s\s\s\w/.test(text)) score -= 1; // Extra spaces
  if (/\w\w\w\w\w\w\w\w\w\w+/.test(text)) score -= 1; // Long words without spaces

  // Ensure score is within bounds
  return Math.max(1, Math.min(10, score));
};

/**
 * Generates feedback for spacing score
 */
const generateSpacingFeedback = (score: number, inconsistentSpacing: boolean): string => {
  if (score >= 9) return "Word and letter spacing is excellent and consistent.";
  if (score >= 7) return "Spacing is generally good with minor inconsistencies.";
  if (score >= 5) return "Word spacing is somewhat inconsistent, making some sentences harder to read.";
  if (inconsistentSpacing) return "Spacing between words and letters varies significantly, affecting readability.";
  return "Spacing issues make the text difficult to read and understand.";
};

/**
 * Generates suggestions for improving spacing
 */
const generateSpacingSuggestions = (score: number): string[] => {
  const suggestions: string[] = [];

  if (score < 8) suggestions.push("Maintain consistent word spacing");
  if (score < 6) suggestions.push("Leave adequate space between words");
  if (score < 4) suggestions.push("Practice writing on lined paper with word spacing guides");

  return suggestions.length > 0 ? suggestions : ["Continue maintaining good spacing between words and letters"];
};

/**
 * Calculates an alignment score based on text lines
 */
const calculateAlignmentScore = (lines: string[]): number => {
  let score = 8; // Start with a good score

  // Check for alignment issues
  if (lines.length < 2) return score; // Not enough lines to judge alignment

  const lineStarts = lines.map(line => line.search(/\S/)).filter(pos => pos >= 0);
  const avgStart = lineStarts.reduce((sum, pos) => sum + pos, 0) / lineStarts.length;
  const maxDeviation = Math.max(...lineStarts.map(pos => Math.abs(pos - avgStart)));

  // Deduct based on alignment deviation
  if (maxDeviation > 10) score -= 3;
  else if (maxDeviation > 5) score -= 2;
  else if (maxDeviation > 2) score -= 1;

  // Ensure score is within bounds
  return Math.max(1, Math.min(10, score));
};

/**
 * Generates feedback for alignment score
 */
const generateAlignmentFeedback = (score: number): string => {
  if (score >= 9) return "Text is excellently aligned with consistent margins and baselines.";
  if (score >= 7) return "Text is mostly well-aligned with only minor deviations from the baseline.";
  if (score >= 5) return "Text alignment is acceptable but shows some inconsistency.";
  if (score >= 3) return "Text alignment varies significantly, affecting the overall presentation.";
  return "Poor text alignment makes the writing appear disorganized.";
};

/**
 * Generates suggestions for improving alignment
 */
const generateAlignmentSuggestions = (score: number): string[] => {
  const suggestions: string[] = [];

  if (score < 8) suggestions.push("Practice writing on lined paper to maintain consistent alignment");
  if (score < 6) suggestions.push("Pay attention to starting each line at the same position");
  if (score < 4) suggestions.push("Use a guide sheet under your paper to help maintain straight lines");

  return suggestions.length > 0 ? suggestions : ["Continue maintaining good text alignment"];
};

/**
 * Calculates a letter formation score based on text characteristics
 */
const calculateLetterFormationScore = (text: string, symbolNoise: number, mixedCase: boolean): number => {
  let score = 8; // Start with a good score

  // Deduct for letter formation issues
  if (symbolNoise > 5) score -= 2;
  if (mixedCase) score -= 1;
  if (/[a-z][A-Z]/.test(text)) score -= 1; // Mixed case within words

  // Ensure score is within bounds
  return Math.max(1, Math.min(10, score));
};

/**
 * Generates feedback for letter formation score
 */
const generateLetterFormationFeedback = (score: number): string => {
  if (score >= 9) return "Letters are well-formed and consistent throughout the text.";
  if (score >= 7) return "Letter formation is generally good with minor inconsistencies.";
  if (score >= 5) return "Some letters are malformed or inconsistent in style.";
  if (score >= 3) return "Many letters are poorly formed, making the text difficult to read.";
  return "Letter formation is very inconsistent and affects overall readability.";
};

/**
 * Generates suggestions for improving letter formation
 */
const generateLetterFormationSuggestions = (score: number, mixedCase: boolean): string[] => {
  const suggestions: string[] = [];

  if (score < 8) suggestions.push("Practice consistent letter shapes");
  if (score < 6) suggestions.push("Focus on problematic letters that are difficult to read");
  if (mixedCase) suggestions.push("Maintain consistent case (uppercase or lowercase) within words");

  return suggestions.length > 0 ? suggestions : ["Continue forming letters clearly and consistently"];
};

/**
 * Calculates a consistency score based on text characteristics
 */
const calculateConsistencyScore = (text: string, mixedCase: boolean, repeatedChars: boolean): number => {
  let score = 8; // Start with a good score

  // Deduct for consistency issues
  if (mixedCase) score -= 1;
  if (repeatedChars) score -= 1;
  if (/[a-z][A-Z][a-z]/.test(text)) score -= 1; // Inconsistent capitalization

  // Ensure score is within bounds
  return Math.max(1, Math.min(10, score));
};

/**
 * Generates feedback for consistency score
 */
const generateConsistencyFeedback = (score: number): string => {
  if (score >= 9) return "The handwriting style is very consistent throughout the text.";
  if (score >= 7) return "The handwriting shows good consistency with minor variations.";
  if (score >= 5) return "The slant and size of letters varies throughout the text.";
  if (score >= 3) return "Significant inconsistency in handwriting style affects readability.";
  return "The handwriting lacks consistency, with major variations in style, size, and slant.";
};

/**
 * Generates suggestions for improving consistency
 */
const generateConsistencySuggestions = (score: number): string[] => {
  const suggestions: string[] = [];

  if (score < 8) suggestions.push("Maintain consistent slant");
  if (score < 6) suggestions.push("Keep letter sizes uniform");
  if (score < 4) suggestions.push("Practice writing at a steady pace to maintain consistency");

  return suggestions.length > 0 ? suggestions : ["Continue maintaining consistent handwriting style"];
};

/**
 * Analyzes handwriting from text
 * @param handwritingText The text to analyze
 * @returns A simple handwriting analysis with score and reason
 */
export const analyzeHandwritingFromText = (handwritingText: string): { neatness_score: number, reason: string } => {
  // Check for common issues in OCR text that might indicate messy handwriting
  const inconsistentSpacing = /\s{3,}/.test(handwritingText);
  const mixedCase = /[A-Z][a-z]+[A-Z]/.test(handwritingText);
  const symbolNoise = (handwritingText.match(/[^a-zA-Z0-9\s.,;:?!'"()-]/g) || []).length;

  // Analyze text structure
  const sentences = handwritingText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / (sentences.length || 1);
  const sentenceLengthVariability = sentences.reduce((sum, s) => sum + Math.abs(s.length - avgSentenceLength), 0) / (sentences.length || 1);

  // Calculate base score
  let score = 8; // Start with default good score

  // Deduct for issues
  if (inconsistentSpacing) score -= 1;
  if (mixedCase) score -= 1;
  if (symbolNoise > 5) score -= 2;
  else if (symbolNoise > 0) score -= 1;

  // Adjust for sentence structure
  if (sentenceLengthVariability > 20) score -= 1;

  // Ensure score is within bounds
  score = Math.max(1, Math.min(10, score));

  // Generate reason
  const reasons = [];
  if (score >= 9) reasons.push("The handwriting appears very neat and consistent.");
  else if (score >= 7) reasons.push("The handwriting is generally clear and legible.");
  else if (score >= 5) reasons.push("The handwriting is readable but shows some inconsistencies.");
  else reasons.push("The handwriting shows significant clarity issues.");

  if (inconsistentSpacing) reasons.push("Inconsistent spacing detected.");
  if (mixedCase) reasons.push("Irregular capitalization observed.");
  if (symbolNoise > 0) reasons.push("Some unusual symbols or corrections present.");

  return {
    neatness_score: score,
    reason: reasons.join(" ")
  };
};

/**
 * Generates JSON output for exam evaluation
 * @param marksAwarded The marks awarded
 * @param keyPointsCovered The key points covered
 * @param keyPointsMissing The key points missing
 * @param evaluationReason The evaluation reason
 * @returns A JSON string with the evaluation results
 */
export const generateAnswerEvaluationJSON = (
  marksAwarded: number,
  keyPointsCovered: string[],
  keyPointsMissing: string[],
  evaluationReason: string
): string => {
  return JSON.stringify({
    marks_awarded: marksAwarded.toString(),
    key_points_covered: keyPointsCovered,
    key_points_missing: keyPointsMissing,
    evaluation_reason: evaluationReason
  }, null, 2);
};

/**
 * Generates JSON output for handwriting analysis
 * @param neatnessScore The neatness score
 * @param reason The reason for the score
 * @returns A JSON string with the handwriting analysis
 */
export const generateHandwritingAnalysisJSON = (
  neatnessScore: number,
  reason: string
): string => {
  return JSON.stringify({
    neatness_score: neatnessScore.toString(),
    reason: reason
  }, null, 2);
};



