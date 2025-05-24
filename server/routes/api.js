const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const FormData = require('form-data');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

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

// Check if OCR API key is set
if (!process.env.OCR_API_KEY) {
  console.error('ERROR: Missing OCR_API_KEY environment variable. Please check your .env file.');
  console.error('OCR_API_KEY:', process.env.OCR_API_KEY ? 'Set ✓' : 'Not set ✗');

  // Set default value for development if not set
  console.log('Setting default OCR_API_KEY for development');
  process.env.OCR_API_KEY = '256DF5A5-1D99-45F9-B165-1888C6EB734B';
}

/**
 * Post-processes OCR text to improve quality
 * @param {string} text - The OCR text to process
 * @param {boolean} isModelAnswer - Whether the text is a model answer
 * @param {boolean} isStudentAnswer - Whether the text is a student answer
 * @returns {string} - The processed text
 */
function postProcessOCRText(text, isModelAnswer = false, isStudentAnswer = false) {
  if (!text) return text;

  console.log('Post-processing OCR text...');
  console.log(`Document type: ${isModelAnswer ? 'Model Answer' : isStudentAnswer ? 'Student Answer' : 'Question Paper'}`);

  // For debugging purposes, save the original text
  const originalText = text;

  // Basic cleanup for all text types
  let processedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
    .replace(/\n\s+/g, '\n') // Remove spaces at the beginning of lines
    .replace(/\s+\n/g, '\n'); // Remove spaces at the end of lines

  // Fix common OCR errors for all document types
  processedText = processedText
    // Fix common character confusions
    .replace(/[|]l/g, 'I') // Fix pipe character and lowercase L to uppercase I
    .replace(/\b[|]I\b/g, 'I') // Fix pipe character to uppercase I
    .replace(/\brn\b/g, 'm') // Fix 'rn' misread as 'm'
    .replace(/\bvv\b/g, 'w') // Fix 'vv' misread as 'w'
    .replace(/([a-z])l([a-z])/g, '$1i$2') // Fix 'l' misread as 'i' in words
    .replace(/([A-Za-z])0([A-Za-z])/g, '$1o$2') // Fix '0' misread as 'o' in words
    .replace(/([A-Za-z])1([A-Za-z])/g, '$1l$2') // Fix '1' misread as 'l' in words
    .replace(/([A-Za-z])5([A-Za-z])/g, '$1s$2') // Fix '5' misread as 's' in words
    .replace(/([A-Za-z])8([A-Za-z])/g, '$1B$2') // Fix '8' misread as 'B' in words
    .replace(/([A-Za-z])9([A-Za-z])/g, '$1g$2') // Fix '9' misread as 'g' in words

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
    .replace(/\bTnat\b/g, 'That')
    .replace(/\btnat\b/g, 'that')
    .replace(/\bwitn\b/g, 'with')
    .replace(/\bWitn\b/g, 'With')
    .replace(/\bTnis\b/g, 'This')
    .replace(/\btnis\b/g, 'this');

  // Special processing for model answers (printed text)
  if (isModelAnswer) {
    // Preserve exact formatting for model answers
    processedText = processedText
      // Fix MCQ option formatting
      .replace(/\b([A-D])\s*\)\s*/g, '$1) ') // Normalize MCQ option formatting with parenthesis
      .replace(/\b([A-D])\s*\.\s*/g, '$1. ') // Normalize MCQ option formatting with periods
      .replace(/\b(Option|Choice)\s+([A-D])\s*[:\.]\s*/gi, '$2) ') // Convert "Option A:" format to "A)"

      // Preserve single-letter answers for MCQs
      .replace(/^([A-Da-d])\s*$/, '$1')

      // Fix common mathematical symbols
      .replace(/\bpi\b/g, 'π')
      .replace(/\+\-/g, '±')
      .replace(/\-\>/g, '→')
      .replace(/\<\-/g, '←')
      .replace(/([0-9])\s*\^\s*([0-9])/g, '$1^$2')

      // Fix common formatting issues in model answers
      .replace(/(\d+)\s*\.\s*([A-Za-z])/g, '$1. $2') // Add space after numbered points
      .replace(/([a-z])\s*\.\s*([A-Z])/g, '$1. $2') // Add space after sentence endings
      .replace(/([a-z])\s*\,\s*([a-z])/g, '$1, $2'); // Add space after commas
  }
  // Special processing for student answers (handwritten text)
  else if (isStudentAnswer) {
    // Improve handwritten text recognition
    processedText = processedText
      // Fix common handwriting OCR errors
      .replace(/([0-9])\s+([0-9])/g, '$1$2') // Fix split numbers
      .replace(/([a-zA-Z])\s+([a-zA-Z])/g, '$1$2') // Fix split words (cautiously)
      .replace(/([a-zA-Z])\s+([a-zA-Z])/g, '$1$2') // Apply twice for better results

      // Preserve single-letter answers for MCQs
      .replace(/^([A-Da-d])\s*$/, '$1')

      // Fix common mathematical symbols in handwritten answers
      .replace(/\bpi\b/g, 'π')
      .replace(/\+\-/g, '±')
      .replace(/\-\>/g, '→')
      .replace(/\<\-/g, '←');
  }
  // Special processing for question papers (printed text with structure)
  else {
    processedText = processedText
      // Fix question numbering
      .replace(/(\d+)\s*\.\s*([A-Za-z])/g, '$1. $2') // Add space after question numbers
      .replace(/([a-z])\s*\.\s*([A-Z])/g, '$1. $2') // Add space after sentence endings

      // Special handling for numbered MCQ options (1. A, 2. B, etc.)
      .replace(/(\d+)[\s\.\)]*\s*([A-Da-d])/g, '$1. $2')

      // Handle cases where OCR might have misread "1" as "I" or "l"
      .replace(/[Il][\s\.\)]*\s*([A-Da-d])/g, '1. $1')

      // Handle cases where OCR might have misread "2" as "Z" or "z"
      .replace(/[Zz][\s\.\)]*\s*([A-Da-d])/g, '2. $1')

      // Handle cases where OCR might have misread "3" as "B" or "E"
      .replace(/[BE][\s\.\)]*\s*([A-Da-d])/g, '3. $1')

      // Handle cases where OCR might have misread "4" as "A" or "q"
      .replace(/[Aq][\s\.\)]*\s*([A-Da-d])/g, '4. $1')

      // Ensure consistent spacing
      .replace(/(\d+)\.\s*([A-Da-d])/g, '$1. $2')

      // Fix MCQ option formatting
      .replace(/\b([A-D])\s*\)\s*/g, '$1) ') // Normalize MCQ option formatting with parenthesis
      .replace(/\b([A-D])\s*\.\s*/g, '$1. ') // Normalize MCQ option formatting with periods
      .replace(/\b(Option|Choice)\s+([A-D])\s*[:\.]\s*/gi, '$2) ') // Convert "Option A:" format to "A)"

      // Fix roman numeral formatting
      .replace(/\b(i{1,3}|iv|v|vi{1,3}|ix|x)\s*\.\s*/gi, '$1. ')

      // Fix common question paper structural elements
      .replace(/Time\s*[:=]\s*(\d+)[\s\.]*(\d*)\s*(?:hours|hrs|hr)/i, 'Time: $1:$2 hrs')
      .replace(/M[\.\s]*M[\.\s]*[:=]\s*(\d+)/i, 'M.M.: $1')
      .replace(/Total\s*marks\s*[:=]\s*(\d+)/i, 'Total Marks: $1')
      .replace(/\bSec(?:tion)?\s*([A-Z])\b/gi, 'Section $1');
  }

  // Final cleanup for all document types
  processedText = processedText
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines again
    .replace(/\s{2,}/g, ' ') // Normalize multiple spaces again
    .trim();

  // Log the difference in length to see if we made significant changes
  const originalLength = originalText.length;
  const processedLength = processedText.length;
  const percentChange = ((processedLength - originalLength) / originalLength * 100).toFixed(2);

  console.log(`OCR text post-processing complete. Length changed from ${originalLength} to ${processedLength} characters (${percentChange}%)`);

  return processedText;
}

/**
 * OCR API endpoint
 * Proxies requests to OCR.space API with enhanced processing
 */
router.post('/ocr', upload.single('file'), async (req, res, next) => {
  try {
    console.log('OCR request received');

    // Validate request
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    // Extract document type from request
    const isModelAnswer = req.body.isModelAnswer === 'true';
    const isStudentAnswer = req.body.isStudentAnswer === 'true';
    const isQuestionPaper = !isModelAnswer && !isStudentAnswer;

    console.log(`Processing ${isModelAnswer ? 'model answer' : isStudentAnswer ? 'student answer' : 'question paper'} image`);

    // Create form data for OCR API with only valid parameters
    const formData = new FormData();

    // Format the API key correctly - remove hyphens if present
    const formattedApiKey = process.env.OCR_API_KEY.replace(/-/g, '');
    console.log("Using formatted API key:", formattedApiKey);
    formData.append('apikey', formattedApiKey);
    formData.append('language', req.body.language || 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('OCREngine', '2'); // Always use the more accurate OCR engine

    // Add basic document type information
    // Simplify document type handling to avoid conflicts
    if (isStudentAnswer) {
      // For handwritten text
      formData.append('filetype', 'jpg');
    } else {
      // For printed text (question papers, model answers, MCQ options)
      formData.append('filetype', 'png');
    }

    // We've already added the essential parameters above, no need for more

    // Add the image file with a simplified name to avoid potential issues
    formData.append('file', req.file.buffer, {
      filename: 'image.png',
      contentType: req.file.mimetype
    });

    console.log('Sending request to OCR.space API...');

    // Create a controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for OCR processing

    try {
      // Send request to OCR API
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check for errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OCR API error: ${response.status} ${response.statusText}`);
        console.error('Error response:', errorText);
        console.error('OCR API key used:', process.env.OCR_API_KEY);

        // Try to parse the error response for more details
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Detailed OCR API error:', JSON.stringify(errorJson, null, 2));
        } catch (e) {
          // If not JSON, just log the raw text
          console.error('Raw error text:', errorText);
        }

        return res.status(response.status).json({
          success: false,
          error: `OCR API error: ${response.status} ${response.statusText}`,
          details: errorText
        });
      }

      // Get response data
      const data = await response.json();

      // Check if OCR was successful
      if (!data.ParsedResults || data.ParsedResults.length === 0) {
        console.error('OCR API returned no results');
        return res.status(422).json({
          success: false,
          error: 'OCR API returned no results. Please try again with a clearer image.',
          details: 'Try improving the image quality by ensuring good lighting, proper focus, and minimal glare. You can also try cropping the image to include only the text area.'
        });
      }

      // Check for OCR errors
      if (data.IsErroredOnProcessing) {
        console.error(`OCR API processing error: ${data.ErrorMessage || 'Unknown error'}`);
        return res.status(422).json({
          success: false,
          error: 'OCR processing error',
          details: data.ErrorMessage || 'The OCR service encountered an error while processing your image. Please try again with a different image or adjust the image quality.'
        });
      }

      // Check if the OCR text is too short (likely failed)
      const combinedText = data.ParsedResults.reduce((acc, result) => acc + (result.ParsedText || ''), '');
      if (combinedText.length < 10 && req.file.size > 5000) { // If image is substantial but text is minimal
        console.error('OCR returned very little text from a substantial image');
        return res.status(422).json({
          success: false,
          error: 'OCR extracted very little text',
          details: 'The OCR service could not extract meaningful text from your image. Please ensure the image contains clear, readable text and try again.'
        });
      }

      // Post-process the OCR text
      const processedResults = data.ParsedResults.map(result => {
        if (result.ParsedText) {
          result.ParsedText = postProcessOCRText(
            result.ParsedText,
            isModelAnswer,
            isStudentAnswer
          );

          // Add document type to the result
          result.DocumentType = isModelAnswer ? 'model_answer' :
                               isStudentAnswer ? 'student_answer' :
                               'question_paper';
        }
        return result;
      });

      // Update the response data with processed results
      data.ParsedResults = processedResults;

      // Add document type to the response
      data.DocumentType = isModelAnswer ? 'model_answer' :
                         isStudentAnswer ? 'student_answer' :
                         'question_paper';

      console.log('OCR processing complete');

      // Return enhanced response
      res.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      console.error('Fetch error:', fetchError.message);

      // Handle timeout or network errors
      if (fetchError.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          error: 'Request timed out',
          details: 'The request to the OCR API took too long to complete.'
        });
      }

      // Handle other fetch errors
      return res.status(500).json({
        success: false,
        error: fetchError.message,
        details: 'Error connecting to OCR API. Please check your internet connection.'
      });
    }
  } catch (error) {
    console.error('Error in OCR API endpoint:', error.message);
    next(error);
  }
});

/**
 * Check internet connectivity
 * @returns {Promise<boolean>} True if connected, false otherwise
 */
async function checkInternetConnectivity() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error("Internet connectivity check failed:", error);
    return false;
  }
}

/**
 * Groq API endpoint
 * Proxies requests to Groq API with improved error handling
 */
router.post('/groq', async (req, res, next) => {
  try {
    console.log('Groq API request received:', JSON.stringify(req.body).substring(0, 200) + '...');

    // Validate request
    if (!req.body.prompt) {
      console.error('No prompt provided in request body');
      return res.status(400).json({ success: false, error: 'No prompt provided' });
    }

    // Check internet connectivity first
    const isConnected = await checkInternetConnectivity();
    if (!isConnected) {
      console.error('No internet connection detected');
      return res.status(503).json({
        success: false,
        error: 'No internet connection. Please check your network and try again.'
      });
    }

    // Check if API key is available
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not set in environment variables');
      return res.status(500).json({ success: false, error: 'API key not configured' });
    }

    console.log('Using Groq API key:', process.env.GROQ_API_KEY.substring(0, 10) + '...');

    const model = req.body.model || 'llama3-70b-8192';
    console.log('Using model:', model);

    // Prepare the request body with a unified prompt
    let requestBody = {
      model: model,
      messages: [
        { role: "system", content: "You are an intelligent AI exam assistant. Answer the question directly and concisely. If it's a multiple-choice question, provide only the letter of the correct option without explanation. For other questions, provide a brief, direct answer. DO NOT include any thinking, reasoning, or explanations in your response. DO NOT use <think> tags or any similar format. Provide ONLY the direct answer." },
        { role: "user", content: req.body.prompt }
      ],
      temperature: 0.1, // Low temperature for more deterministic answers
      max_tokens: 100, // Limit tokens for concise answers
      top_p: 0.95
    };

    // Log the request for debugging
    console.log('Request body:', JSON.stringify({
      model: requestBody.model,
      messages: [
        { role: "system", content: "You are an intelligent AI exam assistant." },
        { role: "user", content: `Question: ${req.body.prompt.substring(0, 100)}...` }
      ]
    }));

    // Create a controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check for errors
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Groq API error: ${response.status} ${response.statusText}`;
        let errorDetails = '';

        console.error(`Groq API error: Status ${response.status} ${response.statusText}`);
        console.error('Error response:', errorText);

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
          errorDetails = errorJson.error?.type || '';
        } catch (e) {
          // If error text is not JSON, use it directly
          errorMessage = errorText || errorMessage;
        }

        // Provide more specific error messages based on status code
        if (response.status === 401) {
          errorDetails = 'API authorization error. Please check your Groq API key.';
        } else if (response.status === 429) {
          errorDetails = 'Rate limit exceeded. Too many requests to the API.';
        } else if (response.status >= 500) {
          errorDetails = 'Groq server error. Please try again later.';
        }

        return res.status(response.status).json({
          success: false,
          error: errorMessage,
          details: errorDetails,
          model: model
        });
      }

      // Get response data
      console.log('Groq API response received, parsing JSON...');
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data).substring(0, 200) + '...');

      // Process the response to remove any thinking tags
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        const originalContent = data.choices[0].message.content;
        data.choices[0].message.content = removeThinkingTags(originalContent);

        if (data.choices[0].message.content !== originalContent) {
          console.log('Removed thinking tags from Groq API response');
        }
      }

      // Return response
      console.log('Sending response back to client');
      res.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      console.error('Fetch error:', fetchError.message);

      // Handle timeout or network errors
      if (fetchError.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          error: 'Request timed out',
          details: 'The request to the Groq API took too long to complete.',
          model: model
        });
      }

      // Handle other fetch errors
      return res.status(500).json({
        success: false,
        error: fetchError.message,
        details: 'Error connecting to Groq API. Please check your internet connection.',
        model: model
      });
    }
  } catch (error) {
    console.error('Error in Groq API endpoint:', error.message);
    console.error('Error stack:', error.stack);
    next(error);
  }
});

/**
 * Compatibility endpoint for OpenAI (redirects to Groq)
 */
router.post('/openai', async (req, res, next) => {
  try {
    console.log('OpenAI compatibility request received (redirecting to Groq)');

    // Convert OpenAI request format to Groq format if needed
    const groqRequest = {
      ...req.body,
      // Add any necessary transformations here
    };

    // Forward to Groq endpoint
    req.body = groqRequest;
    return router.handle(req, res, next, '/groq');
  } catch (error) {
    console.error('Error in OpenAI compatibility endpoint:', error.message);
    next(error);
  }
});

/**
 * Compatibility endpoint for HuggingFace (redirects to Groq)
 */
router.post('/huggingface', async (req, res, next) => {
  try {
    console.log('HuggingFace compatibility request received (redirecting to Groq)');

    // Convert HuggingFace request format to Groq format
    const prompt = req.body.inputs || '';
    const groqRequest = {
      prompt: prompt,
      model: 'llama3-70b-8192', // Default model
      temperature: 0.3,
      max_tokens: 800
    };

    // Forward to Groq endpoint
    req.body = groqRequest;
    return router.handle(req, res, next, '/groq');
  } catch (error) {
    console.error('Error in HuggingFace compatibility endpoint:', error.message);
    next(error);
  }
});



/**
 * Together API endpoint
 * Proxies requests to Together API with improved error handling
 */
router.post('/together', async (req, res, next) => {
  try {
    console.log('Together API request received:', JSON.stringify(req.body).substring(0, 200) + '...');

    // Validate request
    if (!req.body.prompt && !req.body.messages) {
      console.error('No prompt or messages provided in request body');
      return res.status(400).json({ success: false, error: 'No prompt or messages provided' });
    }

    // Check internet connectivity first
    const isConnected = await checkInternetConnectivity();
    if (!isConnected) {
      console.error('No internet connection detected');
      return res.status(503).json({
        success: false,
        error: 'No internet connection. Please check your network and try again.'
      });
    }

    // Check if API key is available
    if (!process.env.TOGETHER_API_KEY) {
      console.error('TOGETHER_API_KEY is not set in environment variables');
      return res.status(500).json({ success: false, error: 'API key not configured' });
    }

    console.log('Using Together API key:', process.env.TOGETHER_API_KEY.substring(0, 10) + '...');

    const model = req.body.model || 'Qwen/Qwen3-235B-A22B-fp8-tput';
    console.log('Using model:', model);

    // Determine which API endpoint to use
    let useInferenceEndpoint = req.body.endpoint === 'inference';
    let apiEndpoint = 'https://api.together.xyz/v1/chat/completions';
    let requestBody;

    if (useInferenceEndpoint) {
      console.log('Using inference endpoint');
      apiEndpoint = 'https://api.together.xyz/inference';

      // For inference endpoint, use the prompt directly
      requestBody = {
        model: model,
        prompt: req.body.prompt,
        max_tokens: req.body.max_tokens || 100,
        temperature: req.body.temperature !== undefined ? req.body.temperature : 0.1
      };
    } else if (req.body.messages) {
      console.log('Using provided messages');

      requestBody = {
        model: model,
        messages: req.body.messages,
        temperature: req.body.temperature || 0.1, // Low temperature for more deterministic answers
        max_tokens: req.body.max_tokens || 100, // Reasonable token limit for concise answers
        top_p: req.body.top_p || 0.95, // Higher top_p for better quality
        frequency_penalty: 0.5, // Reduce repetition
        presence_penalty: 0.5, // Encourage diversity
        timeout: 10 // 10 second timeout for faster responses
      };
    } else {
      // Use a unified prompt for all question types
      const questionText = req.body.prompt;

      // Prepare the request body with optimized parameters for faster responses
      requestBody = {
        model: model,
        messages: [
          { role: "system", content: "You are an intelligent AI exam assistant. Answer the question directly and concisely. If it's a multiple-choice question, provide only the letter of the correct option without explanation. For other questions, provide a brief, direct answer. DO NOT include any thinking, reasoning, or explanations in your response. DO NOT use <think> tags or any similar format. Provide ONLY the direct answer." },
          { role: "user", content: questionText }
        ],
        temperature: req.body.temperature || 0.1, // Low temperature for more deterministic answers
        max_tokens: req.body.max_tokens || 100, // Reasonable token limit for concise answers
        top_p: req.body.top_p || 0.95, // Higher top_p for better quality
        frequency_penalty: 0.5, // Reduce repetition
        presence_penalty: 0.5, // Encourage diversity
        timeout: 10 // 10 second timeout for faster responses
      };
    }

    // Log the request for debugging
    console.log('Request body:', JSON.stringify({
      model: requestBody.model,
      endpoint: apiEndpoint,
      // Only log a simplified version of the request
      request_type: useInferenceEndpoint ? 'inference' : 'chat',
      content_preview: req.body.prompt ? req.body.prompt.substring(0, 100) + '...' :
                      (req.body.messages ? 'Using provided messages' : 'No content')
    }));

    // Create a controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check for errors
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Together API error: ${response.status} ${response.statusText}`;
        let errorDetails = '';

        console.error(`Together API error: Status ${response.status} ${response.statusText}`);
        console.error('Error response:', errorText);

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
          errorDetails = errorJson.error?.type || '';
        } catch (e) {
          // If error text is not JSON, use it directly
          errorMessage = errorText || errorMessage;
        }

        // Provide more specific error messages based on status code
        if (response.status === 401) {
          errorDetails = 'API authorization error. Please check your Together API key.';
        } else if (response.status === 429) {
          errorDetails = 'Rate limit exceeded. Too many requests to the API.';
        } else if (response.status >= 500) {
          errorDetails = 'Together server error. Please try again later.';
        }

        return res.status(response.status).json({
          success: false,
          error: errorMessage,
          details: errorDetails,
          model: model
        });
      }

      // Get response data
      console.log('Together API response received, parsing JSON...');
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data).substring(0, 200) + '...');

      // If using inference endpoint, transform the response to match the expected format
      if (useInferenceEndpoint && data.output) {
        // Process the response to remove any thinking tags
        const originalText = data.output.text;
        data.output.text = removeThinkingTags(originalText);

        if (data.output.text !== originalText) {
          console.log('Removed thinking tags from Together API inference response');
        }

        // Transform inference endpoint response to match chat completions format
        const transformedData = {
          output: data.output,
          // Also include a choices array for backward compatibility
          choices: [
            {
              message: {
                content: data.output.text
              }
            }
          ]
        };
        console.log('Transformed response for inference endpoint');
        res.json(transformedData);
      } else {
        // Process the response to remove any thinking tags
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
          const originalContent = data.choices[0].message.content;
          data.choices[0].message.content = removeThinkingTags(originalContent);

          if (data.choices[0].message.content !== originalContent) {
            console.log('Removed thinking tags from Together API chat response');
          }
        }

        // Return response as-is
        console.log('Sending response back to client');
        res.json(data);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);

      console.error('Fetch error:', fetchError.message);

      // Handle timeout or network errors
      if (fetchError.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          error: 'Request timed out',
          details: 'The request to the Together API took too long to complete.',
          model: model
        });
      }

      // Handle other fetch errors
      return res.status(500).json({
        success: false,
        error: fetchError.message,
        details: 'Error connecting to Together API. Please check your internet connection.',
        model: model
      });
    }
  } catch (error) {
    console.error('Error in Together API endpoint:', error.message);
    console.error('Error stack:', error.stack);
    next(error);
  }
});

/**
 * Connectivity check endpoint
 * Simple endpoint to check if the server is connected to the internet
 */
router.get('/connectivity', async (_, res, next) => {
  try {
    const isConnected = await checkInternetConnectivity();
    res.json({ connected: isConnected });
  } catch (error) {
    console.error('Error in connectivity check endpoint:', error.message);
    next(error);
  }
});

/**
 * Extract keywords from a text string
 * @param {string} text - The text to extract keywords from
 * @returns {string[]} - Array of keywords
 */
function extractKeywords(text) {
  if (!text) return [];

  // Remove punctuation, convert to lowercase, and split by whitespace
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2); // Filter out very short words

  // Remove duplicates
  return [...new Set(words)];
}

/**
 * Evaluate answer endpoint
 * Compares student answer text with model answer keywords
 * Returns match count and marks awarded
 *
 * Supports two request formats:
 * 1. { questionKeywords: string[], answerText: string }
 * 2. { modelAnswer: string, studentAnswer: string }
 */
router.post('/evaluate-answer', async (req, res) => {
  try {
    console.log('Evaluate answer request received:', JSON.stringify(req.body).substring(0, 200));

    let questionKeywords = [];
    let answerText = '';

    // Handle both request formats
    if (req.body.questionKeywords && Array.isArray(req.body.questionKeywords)) {
      // Format 1: Using questionKeywords and answerText
      questionKeywords = req.body.questionKeywords;
      answerText = req.body.answerText;

      if (!answerText) {
        return res.status(400).json({ error: 'No answer text provided' });
      }
    } else if (req.body.modelAnswer && req.body.studentAnswer) {
      // Format 2: Using modelAnswer and studentAnswer
      const modelAnswer = req.body.modelAnswer;
      answerText = req.body.studentAnswer;

      // Check if this is an MCQ answer (single letter A, B, C, or D)
      const isMCQ = /^[A-Da-d]$/.test(modelAnswer.trim());

      if (isMCQ) {
        // For MCQ, just check if the answers match (case-insensitive)
        const normalizedModelAnswer = modelAnswer.trim().toUpperCase();
        const normalizedStudentAnswer = answerText.trim().toUpperCase();

        const isCorrect = normalizedModelAnswer === normalizedStudentAnswer;
        const totalMarks = 1; // MCQs are typically worth 1 mark
        const obtainedMarks = isCorrect ? 1 : 0;

        return res.json({
          totalMarks,
          obtainedMarks,
          matchCount: obtainedMarks,
          keywordsMatched: isCorrect ? [normalizedModelAnswer] : [],
          isCorrect,
          answerType: 'mcq'
        });
      } else {
        // For non-MCQ, extract keywords from the model answer
        questionKeywords = extractKeywords(modelAnswer);

        // If no keywords were extracted, use comma-separated values if available
        if (questionKeywords.length === 0 && modelAnswer.includes(',')) {
          questionKeywords = modelAnswer.split(',').map(k => k.trim());
        }

        // If still no keywords, use the whole model answer as one keyword
        if (questionKeywords.length === 0) {
          questionKeywords = [modelAnswer.trim()];
        }
      }
    } else {
      return res.status(400).json({
        error: 'Invalid request format',
        message: 'Request must contain either questionKeywords and answerText, or modelAnswer and studentAnswer'
      });
    }

    console.log('Using keywords:', questionKeywords);
    console.log('Answer text:', answerText.substring(0, 100) + (answerText.length > 100 ? '...' : ''));

    // Simple keyword extraction from answer (basic split+lowercase)
    const answerKeywords = answerText
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // remove punctuation
      .split(/\s+/);

    // Count matching keywords
    let matchCount = 0;
    const matchedKeywords = [];

    questionKeywords.forEach(keyword => {
      const normalizedKeyword = keyword.toLowerCase().trim();
      if (normalizedKeyword && answerKeywords.includes(normalizedKeyword)) {
        matchCount++;
        matchedKeywords.push(keyword);
      }
    });

    // Mark calculation (example: 1 mark per matched keyword)
    const totalMarks = questionKeywords.length;
    const obtainedMarks = matchCount;

    // Determine result quality
    let result = 'poor';
    const percentage = (obtainedMarks / totalMarks) * 100;

    if (percentage >= 80) {
      result = 'excellent';
    } else if (percentage >= 60) {
      result = 'good';
    } else if (percentage >= 40) {
      result = 'average';
    }

    const response = {
      totalMarks,
      obtainedMarks,
      matchCount,
      keywordsMatched: matchedKeywords,
      result,
      answerType: 'open-ended'
    };

    console.log('Evaluation response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error in evaluate-answer endpoint:', error.message);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

module.exports = router;
