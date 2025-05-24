/**
 * Model API Service
 * This service handles interactions with the Model API for generating model answers
 * This is a wrapper around the OpenAI service for backward compatibility
 */

import { DEFAULT_MODEL } from '@/config/apiConfig';
import { generateOpenAIAnswer } from './openaiService';

/**
 * Generate a model answer for a given question using the OpenAI API
 * @param question The question to generate an answer for
 * @param model Optional model to use (defaults to DEFAULT_MODEL from config)
 * @returns The generated model answer
 */
export async function generateModelAnswer(question: string, model: string = DEFAULT_MODEL): Promise<string> {
  try {
    console.log(`Generating model answer with question: ${question.substring(0, 100)}...`);

    // Use OpenAI to generate the answer (OpenAI service handles caching internally)
    return await generateOpenAIAnswer(question);
  } catch (error) {
    console.error('Error generating model answer:', error);

    // Return a default answer for the question type
    if (isMultipleChoiceQuestion(question)) {
      return "Unable to determine the correct answer. Please try again later.";
    } else {
      return "Unable to generate an answer at this time. Please try again later.";
    }
  }
}

/**
 * Generate model answers for multiple questions
 * @param questions Array of questions to generate answers for
 * @param model Optional model to use
 * @returns Array of generated model answers
 */
export async function generateBatchModelAnswers(questions: string[], model: string = DEFAULT_MODEL): Promise<string[]> {
  try {
    console.log(`Generating batch model answers for ${questions.length} questions`);

    // Initialize answers array with placeholders
    const answers: string[] = new Array(questions.length).fill('');

    // Process questions in batches to avoid overwhelming the API
    const BATCH_SIZE = 5; // Process 5 questions at a time

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(questions.length/BATCH_SIZE)}`);

      // Process batch in parallel
      const batchPromises = batch.map((question, batchIndex) =>
        generateOpenAIAnswer(question)
          .then(answer => {
            return { index: i + batchIndex, answer };
          })
          .catch(error => {
            console.error(`Error generating answer for question ${i + batchIndex + 1}:`, error);
            return { index: i + batchIndex, answer: `[Error generating answer for question ${i + batchIndex + 1}]` };
          })
      );

      // Wait for all promises to resolve
      const batchResults = await Promise.all(batchPromises);

      // Update answers array with batch results
      batchResults.forEach(result => {
        answers[result.index] = result.answer;
      });

      // Add a small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return answers;
  } catch (error) {
    console.error('Error generating batch model answers:', error);
    return questions.map(() => 'Error generating model answer');
  }
}

/**
 * Checks if a question is a multiple-choice question
 * @param question The question text to check
 * @returns True if the question is a multiple-choice question, false otherwise
 */
function isMultipleChoiceQuestion(question: string): boolean {
  if (!question) return false;

  // Check for common multiple-choice patterns
  const mcqPatterns = [
    /\bA\).*\bB\).*\bC\).*\bD\)/i,  // A) option B) option C) option D) option
    /\bA\..*\bB\..*\bC\..*\bD\./i,  // A. option B. option C. option D. option
    /\b\(A\).*\b\(B\).*\b\(C\).*\b\(D\)/i,  // (A) option (B) option (C) option (D) option
    /\b\[A\].*\b\[B\].*\b\[C\].*\b\[D\]/i,  // [A] option [B] option [C] option [D] option
    /\ba\).*\bb\).*\bc\).*\bd\)/i,  // a) option b) option c) option d) option
    /\ba\..*\bb\..*\bc\..*\bd\./i,  // a. option b. option c. option d. option
  ];

  // Check if any of the patterns match
  return mcqPatterns.some(pattern => pattern.test(question));
}
