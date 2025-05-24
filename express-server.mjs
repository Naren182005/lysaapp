// Express server for Grade Scan Scribe AI using ES modules
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

/**
 * Removes <think>...</think> tags and their content from the model's response
 * @param {string} text The text to process
 * @returns {string} The cleaned text without thinking tags
 */
function removeThinkingTags(text) {
  if (!text) return text;

  // Remove <think>...</think> tags and their content
  let cleanedText = text.replace(/<think>[\s\S]*?<\/think>/g, '');

  // Also handle cases where the closing tag might be malformed or missing
  cleanedText = cleanedText.replace(/<think>[\s\S]*/g, '');

  // Remove any leading/trailing whitespace that might be left after tag removal
  cleanedText = cleanedText.trim();

  // If the text was completely wrapped in think tags and is now empty, return the original
  // but with a warning message
  if (cleanedText === '' && text.includes('<think>')) {
    console.warn('Model response contained only thinking tags, returning a default message');
    return 'Unable to generate a direct answer. Please try again.';
  }

  return cleanedText;
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001; // Changed to 3001 to avoid potential conflicts

// API keys from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OCR_API_KEY = process.env.OCR_API_KEY || '256DF5A5-1D99-45F9-B165-1888C6EB734B';

// Log environment variables (without showing full values)
console.log('Environment variables loaded:');
console.log('OPENAI_API_KEY:', OPENAI_API_KEY ? 'Set ✓' : 'Not set ✗');
console.log('OCR_API_KEY:', OCR_API_KEY ? 'Set ✓' : 'Not set ✗');

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cors());

/**
 * Checks if a question is a multiple-choice question
 * @param question The question text to check
 * @returns True if the question is a multiple-choice question, false otherwise
 */
function isMultipleChoiceQuestion(question) {
  if (!question) return false;

  // Preprocess the question to fix common OCR issues
  const preprocessedQuestion = question
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase letters
    .replace(/\s*\)\s*/g, ') ') // Normalize spacing around closing parentheses
    .replace(/\s*\.\s*/g, '. '); // Normalize spacing around periods

  console.log("Checking if MCQ:", preprocessedQuestion.substring(0, 100) + '...');

  // Check for common multiple-choice patterns with more flexible spacing
  const mcqPatterns = [
    /\bA\).*\bB\).*\bC\).*\bD\)/i,  // A) option B) option C) option D) option (flexible spacing)
    /\bA\..*\bB\..*\bC\..*\bD\./i,  // A. option B. option C. option D. option (flexible spacing)
    /\b\(A\).*\b\(B\).*\b\(C\).*\b\(D\)/i,  // (A) option (B) option (C) option (D) option (flexible spacing)
    /\b\[A\].*\b\[B\].*\b\[C\].*\b\[D\]/i,  // [A] option [B] option [C] option [D] option (flexible spacing)
    /\ba\).*\bb\).*\bc\).*\bd\)/i,  // a) option b) option c) option d) option (flexible spacing)
    /\ba\..*\bb\..*\bc\..*\bd\./i,  // a. option b. option c. option d. option (flexible spacing)

    // Also check for options on separate lines
    /\bA\)[^\n]*\n[^\n]*\bB\)[^\n]*\n[^\n]*\bC\)[^\n]*\n[^\n]*\bD\)/i,
    /\bA\.[^\n]*\n[^\n]*\bB\.[^\n]*\n[^\n]*\bC\.[^\n]*\n[^\n]*\bD\./i,

    // Check for options without spaces (common OCR issue)
    /A\).*B\).*C\).*D\)/i,
    /A\..*B\..*C\..*D\./i,
    /a\).*b\).*c\).*d\)/i,
    /a\..*b\..*c\..*d\./i
  ];

  // Check if any of the patterns match
  const isMCQ = mcqPatterns.some(pattern => pattern.test(preprocessedQuestion));

  if (isMCQ) {
    console.log("Detected as MCQ question");
  } else {
    console.log("Not detected as MCQ question");
  }

  return isMCQ;
}

/**
 * Post-processes OCR text to improve quality
 * @param text The raw OCR text
 * @param isQuestionPaper Whether the text is from a question paper
 * @returns The processed text
 */
function postProcessOCRText(text, isQuestionPaper) {
  if (!text) return text;

  // Preserve original text for debugging
  console.log("Original OCR text:", text);

  // First, fix missing spaces between words (common OCR issue)
  let processedText = text.replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between lowercase and uppercase letters

  // Then normalize whitespace (but don't remove all spaces)
  processedText = processedText.replace(/\s{2,}/g, ' '); // Replace multiple spaces with a single space

  // Fix common OCR errors
  processedText = processedText
    .replace(/[|]l/g, 'I') // Fix pipe character and lowercase L to uppercase I
    .replace(/[0O]/g, (match) => /[a-z]/i.test(processedText[processedText.indexOf(match) - 1] || '') ? 'o' : match) // Fix 0 to o when in words
    .replace(/[1]/g, (match) => /[a-z]/i.test(processedText[processedText.indexOf(match) - 1] || '') ? 'l' : match) // Fix 1 to l when in words
    .replace(/\b[0O]ne\b/g, 'One')
    .replace(/\b[0O]f\b/g, 'of')
    .replace(/\b[1I]n\b/g, 'In')
    .replace(/\b[1I]s\b/g, 'is')
    .replace(/\b[1I]t\b/g, 'it')
    .replace(/\b[1I]f\b/g, 'if')
    .replace(/\b[5S]o\b/g, 'So')
    .replace(/\b[5S]e\b/g, 'Se')
    .replace(/\b[8B]e\b/g, 'Be')
    .replace(/\b[8B]y\b/g, 'By');

  // Fix punctuation spacing
  processedText = processedText
    .replace(/\s+([.,;:?!])/g, '$1')
    .replace(/([.,;:?!])([a-zA-Z])/g, '$1 $2');

  // Fix paragraph breaks
  processedText = processedText.replace(/([a-z])\s+([A-Z])/g, '$1\n\n$2');

  // Special processing for question papers
  if (isQuestionPaper) {
    // Fix question numbering
    processedText = processedText
      .replace(/(\d+)\s*\.\s*/g, '$1. ') // Ensure proper spacing after question numbers
      .replace(/Q\s*(\d+)/gi, 'Q$1') // Fix spacing in question markers
      .replace(/Q(\d+)/g, 'Q$1. '); // Add period after question numbers

    // Fix MCQ options
    processedText = processedText
      .replace(/([A-D])\s*\)\s*/g, '$1) ') // Fix spacing in MCQ options with parentheses
      .replace(/([A-D])\s*\.\s*/g, '$1. '); // Fix spacing in MCQ options with periods

    // Fix common OCR errors in MCQ options
    processedText = processedText
      .replace(/\b([A-D])\s*[\-—]\s*/g, '$1) ') // Convert dashes to parentheses in options
      .replace(/\b([A-D])l/g, '$1)'); // Fix 'A)' misread as 'Al'
  } else {
    // For answer sheets, preserve line breaks which are important for handwriting
    processedText = processedText.replace(/\n+/g, '\n');
  }

  return processedText;
}

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API routes

// Connectivity check endpoint
app.get('/api/connectivity', (req, res) => {
  res.json({ connected: true });
});

// OpenAI API endpoint has been completely removed

// HuggingFace API endpoint has been completely removed

// OCR API endpoint
app.post('/api/ocr', async (req, res) => {
  try {
    console.log('OCR request received');

    // Extract the image data and parameters from the request
    const imageData = req.body.image;
    const isQuestionPaper = req.body.isQuestionPaper === true;

    console.log(`Processing ${isQuestionPaper ? 'question paper' : 'answer sheet'} image`);

    if (!imageData) {
      console.error('No image data provided');
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Check if API key is available
    if (!OCR_API_KEY) {
      console.error('OCR_API_KEY is not set');
      return res.status(500).json({ error: 'OCR API key not configured' });
    }

    console.log('Using OCR API key:', OCR_API_KEY);
    console.log('Processing image for OCR...');

    // Preprocess the image data to improve OCR results
    // 1. Remove the data URL prefix
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

    // Prepare the form data for the OCR API with optimized parameters
    const formData = new URLSearchParams();
    // Format the API key correctly - remove hyphens if present
    const formattedApiKey = OCR_API_KEY.replace(/-/g, '');
    console.log("Using formatted API key:", formattedApiKey);
    formData.append('apikey', formattedApiKey);
    formData.append('base64Image', base64Image);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy

    // Add parameters specific to the type of document
    if (isQuestionPaper) {
      // For question papers, use table detection and structured output
      formData.append('isTable', 'true');
      formData.append('detectTables', 'true');
    } else {
      // For answer sheets, optimize for handwriting
      formData.append('isTable', 'false');
      formData.append('ocrMode', 'textbox'); // Better for handwritten text
    }

    // Add additional parameters to improve OCR quality
    formData.append('filetype', 'png');
    formData.append('detectCheckbox', 'true'); // Helpful for MCQ detection
    formData.append('scale', 'true');
    formData.append('pagerange', 'all');

    // Create a controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Make the request to the OCR API
      console.log('Sending request to OCR API...');
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check if the request was successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OCR API error: ${response.status} ${response.statusText}`);
        console.error('Error response:', errorText);
        return res.status(response.status).json({ error: `OCR API error: ${response.status} ${response.statusText}` });
      }

      // Get response data
      console.log('OCR API response received, parsing JSON...');
      const data = await response.json();
      console.log('OCR processing completed successfully');

      // Check if the OCR was successful
      if (data.IsErroredOnProcessing === false && data.ParsedResults && data.ParsedResults.length > 0) {
        // Get the extracted text
        let extractedText = data.ParsedResults[0].ParsedText;

        // Log the original extracted text for debugging
        console.log('Original OCR text:', extractedText);

        // Post-process the extracted text to improve quality
        extractedText = postProcessOCRText(extractedText, isQuestionPaper);

        // Update the response with the post-processed text
        data.ParsedResults[0].ParsedText = extractedText;

        // Log the post-processed text
        console.log('Post-processed OCR text:', extractedText);
      } else {
        console.error('OCR API Error:', data.ErrorMessage || 'Unknown error');
      }

      // Send the OCR API response with the post-processed text
      res.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      console.error('Fetch error:', fetchError.message);

      // Handle timeout or network errors
      if (fetchError.name === 'AbortError') {
        return res.status(504).json({ error: 'Request timed out' });
      }

      // Handle other fetch errors
      return res.status(500).json({ error: fetchError.message });
    }
  } catch (error) {
    console.error('Error processing OCR request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OpenAI API endpoint
app.post('/api/openai', async (req, res) => {
  try {
    console.log('OpenAI API request received');

    // Check if API key is available
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return res.status(500).json({
        error: 'API key not configured',
        text: 'Error: OpenAI API key not configured'
      });
    }

    console.log('Using OpenAI API key:', OPENAI_API_KEY ? 'Set ✓' : 'Not set ✗');

    // Check if this is a batch request (array of prompts)
    const isBatchRequest = Array.isArray(req.body.prompts);

    if (isBatchRequest) {
      console.log(`Processing batch request with ${req.body.prompts.length} questions...`);

      // Get the model from the request or use default
      const model = req.body.model || 'gemini-1.5-pro';
      console.log('Using model:', model);

      // Process each prompt in the batch
      const prompts = req.body.prompts;
      const batchResults = [];

      // Detect if all prompts are MCQs by checking for option patterns
      const mcqPatterns = [
        /\([A-Da-d]\)/, // (A), (B), etc.
        /[A-Da-d]\)/, // A), B), etc.
        /[A-Da-d]\.\s/, // A. , B. , etc.
        /option\s+[A-Da-d]/i, // Option A, Option B, etc.
        /choice\s+[A-Da-d]/i, // Choice A, Choice B, etc.
        /^\s*[A-Da-d]\s+[^A-Da-d]/, // A [text], B [text], etc. at the start of a line
        /\b[A-Da-d]\s*[\.\)]\s*[A-Za-z0-9]/, // A. text or A) text at word boundary
        /^[A-Da-d]\.\s+[A-Za-z0-9]/m, // A. text at start of line
        /^[A-Da-d]\)\s+[A-Za-z0-9]/m, // A) text at start of line
        /\bA\).*\bB\).*\bC\).*\bD\)/i, // A) option B) option C) option D) option
        /\bA\..*\bB\..*\bC\..*\bD\./i, // A. option B. option C. option D. option
      ];

      const isMCQ = (text) => {
        return mcqPatterns.some(pattern => pattern.test(text));
      };

      const allMCQs = prompts.every(prompt => isMCQ(prompt));
      console.log(`Detected ${allMCQs ? 'all MCQs' : 'mixed or non-MCQ questions'}`);

      // Prepare the system prompt based on question types
      const systemPrompt = req.body.systemPrompt || (allMCQs
        ? "You are an expert AI exam assistant. For each multiple-choice question, carefully analyze the question and all options. Your task is to determine the correct answer for each question. Provide ONLY the letter of the correct option (A, B, C, or D) without any explanation, workings, or additional text. Just the single letter of the correct answer for each question. If the options are labeled with lowercase letters (a, b, c, d), convert your answer to uppercase. For example, if the answer is option B, respond with just 'B'."
        : "You are an expert AI exam assistant. Answer each question directly and concisely. If it's a multiple-choice question, provide ONLY the letter of the correct option (A, B, C, or D) without any explanation. For other questions, provide a brief, direct answer focusing on key concepts, definitions, and important facts. Include only the essential information needed to answer each question correctly. DO NOT include any explanations, reasoning, or unnecessary details.");

      // Process prompts in sequence to avoid rate limiting
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        console.log(`Processing question ${i+1}/${prompts.length}: ${prompt.substring(0, 50)}...`);

        // Clean up the prompt to improve processing
        const cleanedPrompt = prompt
          .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase letters
          .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
          .trim();

        // Determine if this specific prompt is an MCQ
        const isMCQPrompt = isMCQ(cleanedPrompt);

        // Prepare the request body with appropriate settings for the question type
        const requestBody = {
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: cleanedPrompt }
          ],
          temperature: isMCQPrompt ? 0.1 : 0.3, // Lower temperature for MCQs for more deterministic answers
          max_tokens: isMCQPrompt ? 50 : 150, // Shorter output for MCQs
          top_p: 0.95
        };

        // Create a controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
          // Make the request to the OpenAI API
          console.log(`Sending request to OpenAI API for question ${i+1}...`);
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          // Check if the request was successful
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`OpenAI API error for question ${i+1}: ${response.status} ${response.statusText}`);
            console.error('Error response:', errorText);

            // Add error result to batch results
            batchResults.push({
              error: `Error processing question ${i+1}: ${response.status} ${response.statusText}`,
              text: `Error: Failed to generate answer for question ${i+1}`
            });

            // Continue with the next prompt
            continue;
          }

          // Get response data
          console.log(`OpenAI API response received for question ${i+1}, parsing JSON...`);
          const data = await response.json();

          // Extract the generated text from the response (OpenAI format)
          let generatedText = '';
          if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            generatedText = data.choices[0].message.content || '';
          }

          // Process the response to remove any thinking tags
          generatedText = removeThinkingTags(generatedText);

          // For MCQs, extract just the letter if there's additional text
          if (isMCQPrompt) {
            const letterMatch = generatedText.match(/^[A-Da-d](?:\.|$|\s)/);
            if (letterMatch) {
              generatedText = letterMatch[0].charAt(0).toUpperCase();
            } else {
              // If no letter pattern found, check if the first character is a valid option
              const firstChar = generatedText.trim().charAt(0).toUpperCase();
              if (['A', 'B', 'C', 'D'].includes(firstChar)) {
                generatedText = firstChar;
              }
            }
          }

          // Log a sample of the response
          console.log(`Generated content for question ${i+1}:`, generatedText);

          // Add result to batch results with the extracted text
          batchResults.push({
            ...data,
            text: generatedText
          });

          // Add a small delay to avoid rate limiting
          if (i < prompts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);

          console.error(`Fetch error for question ${i+1}:`, fetchError.message);

          // Add error result to batch results
          if (fetchError.name === 'AbortError') {
            batchResults.push({
              error: 'Request timed out',
              text: `Error: The request for question ${i+1} took too long to complete.`
            });
          } else {
            batchResults.push({
              error: fetchError.message,
              text: `Error: ${fetchError.message}`
            });
          }
        }
      }

      // Send the batch results
      console.log(`Sending batch results for ${batchResults.length} questions`);
      res.json({ results: batchResults });
    } else {
      // Handle single prompt request
      const prompt = req.body.prompt || 'Unknown question';
      console.log('Prompt:', prompt.substring(0, 50) + '...');

      // Use a unified approach for all question types
      console.log('Processing single question...');

      // Get the model from the request or use default
      const model = req.body.model || 'gpt-3.5-turbo';
      console.log('Using model:', model);

      // Clean up the prompt to improve processing
      const cleanedPrompt = prompt
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase letters
        .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
        .trim();

      // Detect if this is an MCQ by checking for option patterns
      const mcqPatterns = [
        /\([A-Da-d]\)/, // (A), (B), etc.
        /[A-Da-d]\)/, // A), B), etc.
        /[A-Da-d]\.\s/, // A. , B. , etc.
        /option\s+[A-Da-d]/i, // Option A, Option B, etc.
        /choice\s+[A-Da-d]/i, // Choice A, Choice B, etc.
        /^\s*[A-Da-d]\s+[^A-Da-d]/, // A [text], B [text], etc. at the start of a line
        /\b[A-Da-d]\s*[\.\)]\s*[A-Za-z0-9]/, // A. text or A) text at word boundary
        /^[A-Da-d]\.\s+[A-Za-z0-9]/m, // A. text at start of line
        /^[A-Da-d]\)\s+[A-Za-z0-9]/m, // A) text at start of line
        /\bA\).*\bB\).*\bC\).*\bD\)/i, // A) option B) option C) option D) option
        /\bA\..*\bB\..*\bC\..*\bD\./i, // A. option B. option C. option D. option
      ];

      const isMCQ = mcqPatterns.some(pattern => pattern.test(cleanedPrompt));
      console.log(`Detected ${isMCQ ? 'MCQ' : 'non-MCQ'} question`);

      // Prepare the system prompt based on question type
      const systemPrompt = req.body.systemPrompt || (isMCQ
        ? "You are an expert AI exam assistant. For this multiple-choice question, carefully analyze the question and all options. Your task is to determine the correct answer. Provide ONLY the letter of the correct option (A, B, C, or D) without any explanation, workings, or additional text. Just the single letter of the correct answer. If the options are labeled with lowercase letters (a, b, c, d), convert your answer to uppercase. For example, if the answer is option B, respond with just 'B'."
        : "You are an expert AI exam assistant. Answer the question directly and concisely. Provide a brief, direct answer focusing on key concepts, definitions, and important facts. Include only the essential information needed to answer the question correctly. DO NOT include any explanations, reasoning, or unnecessary details.");

      const requestBody = {
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: cleanedPrompt }
        ],
        temperature: isMCQ ? 0.1 : 0.3, // Lower temperature for MCQs for more deterministic answers
        max_tokens: isMCQ ? 50 : 150, // Shorter output for MCQs
        top_p: 0.95
      };

      // Create a controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        // Make the request to the OpenAI API
        console.log('Sending request to OpenAI API...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GEMINI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Check if the request was successful
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
          console.error('Error response:', errorText);
          return res.status(response.status).json({
            error: `OpenAI API error: ${response.status} ${response.statusText}`,
            text: `Error: Failed to generate answer`
          });
        }

        // Get response data
        console.log('OpenAI API response received, parsing JSON...');
        const data = await response.json();

        // Extract the generated text from the response (OpenAI format)
        let generatedText = '';
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
          generatedText = data.choices[0].message.content || '';
        }

        // Process the response to remove any thinking tags
        generatedText = removeThinkingTags(generatedText);

        // For MCQs, extract just the letter if there's additional text
        if (isMCQ) {
          const letterMatch = generatedText.match(/^[A-Da-d](?:\.|$|\s)/);
          if (letterMatch) {
            generatedText = letterMatch[0].charAt(0).toUpperCase();
          } else {
            // If no letter pattern found, check if the first character is a valid option
            const firstChar = generatedText.trim().charAt(0).toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(firstChar)) {
              generatedText = firstChar;
            }
          }
        }

        // Log a sample of the response
        console.log('Generated content:', generatedText);

        // Send the response with the extracted text
        res.json({
          ...data,
          text: generatedText
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);

        console.error('Fetch error:', fetchError.message);

        // Handle timeout or network errors
        if (fetchError.name === 'AbortError') {
          return res.status(504).json({
            error: 'Request timed out',
            text: 'Error: The request took too long to complete.'
          });
        }

        // Handle other fetch errors
        return res.status(500).json({
          error: fetchError.message,
          text: `Error: ${fetchError.message}`
        });
      }
    }
  } catch (error) {
    console.error('Error processing OpenAI API request:', error);
    res.status(500).json({
      error: 'Internal server error',
      text: `Error: ${error.message}`
    });
  }
});



// Answer evaluation endpoint
app.post('/api/evaluate-answer', async (req, res) => {
  try {
    console.log('Answer evaluation request received');

    // Extract the model answer and student answer from the request
    const { modelAnswer, studentAnswer } = req.body;

    // Log the request body for debugging
    console.log('Request body:', req.body);

    // Validate the request
    if (!modelAnswer) {
      console.error('No model answer provided');
      return res.status(400).json({ error: 'No model answer provided' });
    }

    if (!studentAnswer) {
      console.error('No student answer provided');
      return res.status(400).json({ error: 'No student answer provided' });
    }

    // Log the extracted values (truncated for readability)
    console.log('Model answer:', modelAnswer.substring(0, 100) + (modelAnswer.length > 100 ? '...' : ''));
    console.log('Student answer:', studentAnswer.substring(0, 100) + (studentAnswer.length > 100 ? '...' : ''));

    // Extract keywords from the model answer
    // For MCQ questions, the model answer is just a letter (A, B, C, or D)
    const isMCQ = /^[A-Da-d]$/.test(modelAnswer.trim());

    if (isMCQ) {
      console.log('Processing MCQ answer evaluation');

      // For MCQs, just check if the answers match (case-insensitive)
      const normalizedModelAnswer = modelAnswer.trim().toUpperCase();
      const normalizedStudentAnswer = studentAnswer.trim().toUpperCase();

      // Extract just the first letter if the student wrote more than one character
      const studentAnswerLetter = normalizedStudentAnswer.match(/^[A-D]/)?.[0] || normalizedStudentAnswer;

      const isCorrect = studentAnswerLetter === normalizedModelAnswer;
      const totalMarks = 1;
      const obtainedMarks = isCorrect ? 1 : 0;

      console.log(`MCQ evaluation result: ${isCorrect ? 'Correct' : 'Incorrect'}`);
      console.log(`Model answer: ${normalizedModelAnswer}, Student answer: ${studentAnswerLetter}`);

      return res.json({
        totalMarks,
        obtainedMarks,
        matchCount: obtainedMarks,
        keywordsMatched: isCorrect ? [normalizedModelAnswer] : [],
        isCorrect,
        answerType: 'mcq'
      });
    } else {
      console.log('Processing open-ended answer evaluation');

      // For open-ended questions, extract keywords from the model answer
      // First, check if the model answer is already a comma-separated list of keywords
      let modelKeywords;

      if (modelAnswer.includes(',')) {
        // If the model answer contains commas, assume it's already a list of keywords
        modelKeywords = modelAnswer
          .split(',')
          .map(keyword => keyword.trim().toLowerCase())
          .filter(keyword => keyword.length > 0);
      } else {
        // Otherwise, extract keywords by splitting on spaces and removing common words
        modelKeywords = modelAnswer
          .toLowerCase()
          .replace(/[^\w\s]/g, '') // Remove punctuation
          .split(/\s+/)
          .filter(word =>
            word.length > 2 && // Only words longer than 2 characters
            !['the', 'and', 'for', 'are', 'this', 'that', 'with', 'from', 'have', 'has'].includes(word) // Remove common words
          );
      }

      // Remove duplicates from model keywords
      modelKeywords = [...new Set(modelKeywords)];

      console.log('Extracted model keywords:', modelKeywords);

      // Extract keywords from the student answer
      const studentKeywords = studentAnswer
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 2); // Only words longer than 2 characters

      console.log('Extracted student keywords:', studentKeywords);

      // Count matching keywords
      let matchCount = 0;
      const keywordsMatched = [];

      modelKeywords.forEach(keyword => {
        if (studentKeywords.includes(keyword)) {
          matchCount++;
          keywordsMatched.push(keyword);
        }
      });

      // Calculate marks
      const totalMarks = modelKeywords.length;
      const obtainedMarks = matchCount;
      const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;

      // Determine the result based on the percentage
      let result;
      if (percentage >= 70) {
        result = 'good';
      } else if (percentage >= 40) {
        result = 'average';
      } else {
        result = 'poor';
      }

      console.log(`Evaluation result: ${matchCount} out of ${totalMarks} keywords matched (${percentage.toFixed(2)}%)`);
      console.log(`Result: ${result}`);

      return res.json({
        totalMarks,
        obtainedMarks,
        matchCount,
        keywordsMatched,
        percentage: parseFloat(percentage.toFixed(2)),
        result,
        answerType: 'open-ended'
      });
    }
  } catch (error) {
    console.error('Error evaluating answer:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log('===========================================');
  console.log(`Express server running at http://localhost:${PORT}/`);
  console.log('===========================================');
  console.log('Available endpoints:');
  console.log('- GET  /api/connectivity');
  console.log('- POST /api/gemini (using OpenAI)');
  console.log('- POST /api/ocr');
  console.log('- POST /api/evaluate-answer');
  console.log('===========================================');
});
