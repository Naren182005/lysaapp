/**
 * OpenAI Service
 * This service handles interactions with the OpenAI API for generating model answers
 * This is the primary service for generating answers in the application
 */

import { OPENAI_API_KEY, DEFAULT_OPENAI_MODEL, API_ENDPOINTS } from '@/config/apiConfig';

// Simple in-memory cache for answers to avoid redundant API calls
interface CacheEntry {
  answer: string;
  timestamp: number;
}

// Cache expiration time in milliseconds (24 hours)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

// In-memory cache
const answerCache: Record<string, CacheEntry> = {};

/**
 * Get a cached answer if available and not expired
 * @param question The question to get the cached answer for
 * @returns The cached answer or null if not available
 */
function getCachedAnswer(question: string): string | null {
  const normalizedQuestion = question.trim().toLowerCase();
  const cacheKey = normalizedQuestion;

  const cachedEntry = answerCache[cacheKey];
  if (cachedEntry) {
    const now = Date.now();
    if (now - cachedEntry.timestamp < CACHE_EXPIRATION) {
      return cachedEntry.answer;
    }
    // Entry expired, remove it
    delete answerCache[cacheKey];
  }
  return null;
}

/**
 * Cache an answer for future use
 * @param question The question to cache the answer for
 * @param answer The answer to cache
 */
function cacheAnswer(question: string, answer: string): void {
  const normalizedQuestion = question.trim().toLowerCase();
  const cacheKey = normalizedQuestion;

  answerCache[cacheKey] = {
    answer,
    timestamp: Date.now()
  };
}

/**
 * Remove <think>...</think> tags and their content from the model's response
 * @param text The text to process
 * @returns The cleaned text without thinking tags
 */
function removeThinkingTags(text: string): string {
  if (!text) return text;

  // Remove <think>...</think> tags and their content
  let cleanedText = text.replace(/<think>[\s\S]*?<\/think>/g, '');

  // Also handle cases where the closing tag might be malformed or missing
  cleanedText = cleanedText.replace(/<think>[\s\S]*/g, '');

  // Remove any leading/trailing whitespace that might be left after tag removal
  cleanedText = cleanedText.trim();

  return cleanedText;
}

/**
 * Call the OpenAI API directly
 * @param question The question to generate an answer for
 * @param systemPrompt The system prompt to use
 * @param model The model to use
 * @param retryCount Current retry count (for internal use in recursion)
 * @returns The generated answer
 */
async function callOpenAIDirectly(
  question: string,
  systemPrompt: string,
  model: string = DEFAULT_OPENAI_MODEL,
  retryCount: number = 0
): Promise<string> {
  // Maximum number of retries
  const MAX_RETRIES = 3;

  // If we've exceeded max retries, return default answer
  if (retryCount > MAX_RETRIES) {
    console.log('Max retries exceeded, returning default answer');
    return getDefaultAnswer(question);
  }

  console.log(`Making direct API call to OpenAI (model: ${model}, retry: ${retryCount})`);

  try {
    // Prepare the request body
    const requestBody = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      temperature: 0.3,
      max_tokens: 150
    };

    // Make the request to the OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      console.error('Error response:', errorText);

      // If we haven't exceeded max retries, try again with exponential backoff
      if (retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callOpenAIDirectly(question, systemPrompt, model, retryCount + 1);
      }

      // If we've exhausted retries, return default answer
      return getDefaultAnswer(question);
    }

    // Parse the response
    const result = await response.json();

    // Extract the generated answer from the response
    const generatedAnswer = result.choices?.[0]?.message?.content || '';

    // Clean up the answer
    const cleanedAnswer = removeThinkingTags(generatedAnswer);

    return cleanedAnswer;
  } catch (error) {
    console.error('Error making direct OpenAI API call:', error);

    // If we haven't exceeded max retries, try again with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callOpenAIDirectly(question, systemPrompt, model, retryCount + 1);
    }

    // If we've exhausted retries, return default answer
    return getDefaultAnswer(question);
  }
}

/**
 * Get a default answer for a question when all API calls fail
 * @param question The question to get a default answer for
 * @returns A default answer
 */
function getDefaultAnswer(question: string): string {
  // Import the template service for fallback answers
  const { getTemplateAnswer } = require('@/utils/templateService');

  // Try to get a template answer
  const templateAnswer = getTemplateAnswer(question);
  if (templateAnswer) {
    console.log('Using template answer as fallback');
    return templateAnswer;
  }

  // If no template is available, return a generic answer
  if (isMultipleChoiceQuestion(question)) {
    return "Unable to determine the correct answer due to API rate limits. Please try again later.";
  } else {
    return "Unable to generate an answer at this time due to API rate limits. Please try again later.";
  }
}

/**
 * Generate a model answer for a given question using the OpenAI API
 * @param question The question to generate an answer for
 * @param model Optional model to use (defaults to gpt-3.5-turbo)
 * @param systemPrompt Optional custom system prompt to use
 * @returns The generated model answer
 */
export async function generateOpenAIAnswer(
  question: string,
  model: string = DEFAULT_OPENAI_MODEL,
  systemPrompt?: string
): Promise<string> {
  try {
    console.log(`Generating OpenAI answer with question: ${question.substring(0, 100)}...`);

    // Check for cached answers first
    const cachedAnswer = getCachedAnswer(question);
    if (cachedAnswer) {
      console.log('Using cached answer');
      return cachedAnswer;
    }

    // Determine if this is a multiple-choice question
    const isMCQ = isMultipleChoiceQuestion(question);
    console.log(`Question type: ${isMCQ ? 'Multiple-choice' : 'Open-ended'}`);

    // Prepare the system prompt based on question type or use the provided one
    let finalSystemPrompt: string;
    if (systemPrompt) {
      // Use the provided system prompt
      finalSystemPrompt = systemPrompt;
    } else {
      // Use default system prompts based on question type
      if (isMCQ) {
        finalSystemPrompt = "You are an expert AI exam assistant. For the following multiple-choice question, carefully analyze the question and all options. Your task is to determine the correct answer. Provide ONLY the letter of the correct option (A, B, C, or D) without any explanation, workings, or additional text. Just the single letter of the correct answer. If the options are labeled with lowercase letters (a, b, c, d), convert your answer to uppercase. For example, if the answer is option B, respond with just 'B'.";
      } else {
        finalSystemPrompt = "You are an expert AI exam assistant. For the following question, provide a brief, direct answer. Your answer should be concise and to the point. Focus on key concepts, definitions, and important facts. Include only the essential information needed to answer the question correctly. Do not include any explanations, reasoning, or unnecessary details.";
      }
    }

    // First try using the server API endpoint
    try {
      console.log('Using server API endpoint for OpenAI');

      // Check if the server is available by making a connectivity check
      try {
        const connectivityCheck = await fetch(API_ENDPOINTS.CONNECTIVITY, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!connectivityCheck.ok) {
          console.warn('Server connectivity check failed, falling back to direct API call');
          throw new Error('Server connectivity check failed');
        }

        console.log('Server connectivity check passed, proceeding with server API call');
      } catch (connectivityError) {
        console.warn('Server connectivity check failed, falling back to direct API call');
        // Fall back to direct OpenAI API call
        return await callOpenAIDirectly(question, systemPrompt, model);
      }

      const response = await fetch(API_ENDPOINTS.OPENAI, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: question,
          model: model,
          systemPrompt: finalSystemPrompt,
          temperature: 0.3,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
        console.error('Error response:', errorText);

        // Check if this is a rate limit error (429)
        if (response.status === 429) {
          console.log('Server API rate limit exceeded, falling back to direct API call with retry logic');
          return await callOpenAIDirectly(question, finalSystemPrompt, model);
        }

        // Fall back to direct OpenAI API call for other errors
        console.log('Server API call failed, falling back to direct API call');
        return await callOpenAIDirectly(question, finalSystemPrompt, model);
      }

      // Parse the response
      const result = await response.json();

      let generatedAnswer: string;

      // Extract the generated answer from the response
      generatedAnswer = result.choices?.[0]?.message?.content || '';

      // Remove any <think>...</think> tags from the response
      generatedAnswer = removeThinkingTags(generatedAnswer);

      console.log(`Generated OpenAI answer (${generatedAnswer.length} chars): ${generatedAnswer.substring(0, 100)}...`);

      // Cache the answer for future use
      cacheAnswer(question, generatedAnswer);

      return generatedAnswer;
    } catch (error) {
      console.error('Error generating OpenAI answer with server API:', error);

      // Check if this is a rate limit error
      if (error instanceof Error && error.message.includes('429')) {
        console.log('Rate limit error detected, trying with retry logic');
        return await callOpenAIDirectly(question, finalSystemPrompt, model);
      }

      // For other errors, try direct API call
      console.log('Server API error, falling back to direct API call');
      return await callOpenAIDirectly(question, finalSystemPrompt, model);
    }
  } catch (error) {
    console.error('Error generating OpenAI answer:', error);

    // Try to get a template answer as a last resort
    const { getTemplateAnswer } = require('@/utils/templateService');
    const templateAnswer = getTemplateAnswer(question);
    if (templateAnswer) {
      console.log('Using template answer as fallback');
      return templateAnswer;
    }

    // Return a user-friendly error message
    if (isMultipleChoiceQuestion(question)) {
      return "Unable to determine the correct answer due to API rate limits. Please try again in a few minutes.";
    } else {
      return "Unable to generate an answer at this time due to API rate limits. Please try again in a few minutes.";
    }
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
    /option\s+[A-Da-d][\s\):]/i,    // Option A, Option B, etc.
    /choice\s+[A-Da-d][\s\):]/i,    // Choice A, Choice B, etc.
    /\b[A-Da-d]\s*[\.\)]\s*[A-Za-z0-9]/,  // A. text or A) text at word boundary
    /^[A-Da-d]\.\s+[A-Za-z0-9]/m,   // A. text at start of line
    /^[A-Da-d]\)\s+[A-Za-z0-9]/m,   // A) text at start of line
  ];

  // Check if any of the patterns match
  return mcqPatterns.some(pattern => pattern.test(question));
}
