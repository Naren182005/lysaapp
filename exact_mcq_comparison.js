// MCQ Answer Evaluation
// This script exactly matches the Python implementation provided by the user

/**
 * Parses MCQ answers from a text string
 * The text is expected to be in the format: "1A 2B 3C 4D" or "1 A 2 B 3 C 4 D"
 *
 * @param {string} answerText The answer text to parse
 * @returns {Object} Dictionary mapping question numbers to answer options
 */
function parseAnswerText(answerText) {
  console.log("Parsing answer text:", answerText);

  // Handle empty input
  if (!answerText) {
    return {};
  }

  const answers = {};

  // First try to parse as adjacent pairs (1A2B3C4D)
  const adjacentPairsRegex = /(\d+)([A-Da-d])/g;
  let match;
  let text = answerText.toUpperCase();

  while ((match = adjacentPairsRegex.exec(text)) !== null) {
    const qNo = match[1];
    const option = match[2];
    answers[qNo] = option;
  }

  // If no answers found, try space-separated format
  if (Object.keys(answers).length === 0) {
    // Replace newlines with spaces and trim whitespace
    text = answerText.replace(/\n/g, ' ').trim().toUpperCase();

    // Split by whitespace
    const parts = text.split(/\s+/);

    // Process pairs of elements (question number and option)
    for (let i = 0; i < parts.length; i += 2) {
      // Make sure we have both question number and option
      if (i + 1 < parts.length) {
        const qNo = parts[i];
        const option = parts[i + 1];

        // Add to answers dictionary
        answers[qNo] = option;
      }
    }
  }

  console.log("Parsed answers:", answers);
  return answers;
}

/**
 * Evaluates MCQ answers by comparing model answers with student answers
 *
 * @param {string} modelAnswerText The model answer text
 * @param {string} studentAnswerText The student answer text
 * @returns {Object} Object containing score and total
 */
function evaluateMCQ(modelAnswerText, studentAnswerText) {
  // Parse the answers
  const modelAnswers = parseAnswerText(modelAnswerText);
  const studentAnswers = parseAnswerText(studentAnswerText);

  let score = 0;
  const total = Object.keys(modelAnswers).length;

  // Compare answers for each question in the model answers
  for (const [qNo, correctOption] of Object.entries(modelAnswers)) {
    if (studentAnswers[qNo] === correctOption) {
      score += 1;
    }
  }

  return { score, total };
}

/**
 * Processes a JSON input with model_answers and student_answers
 *
 * @param {Object} jsonInput JSON object with model_answers and student_answers
 * @returns {Object} Evaluation result with score and total
 */
function processJsonInput(jsonInput) {
  // Extract model and student answers from JSON
  const { model_answers, student_answers } = jsonInput;

  // Validate input
  if (!model_answers || !student_answers) {
    throw new Error('Invalid JSON input: model_answers and student_answers are required');
  }

  // Evaluate the answers
  const { score, total } = evaluateMCQ(model_answers, student_answers);

  // Format the output
  const formattedOutput = `Final Score: ${score}/${total}`;

  // Return the result
  return {
    score,
    total,
    formattedOutput
  };
}

// Example usage with the provided JSON
const jsonInput = {
  "model_answers": "1A 2B 3C 4D",
  "student_answers": "1 a 2 b 3 c 4 d"
};

// Process the JSON input
const result = processJsonInput(jsonInput);

// Display the formatted output
console.log(result.formattedOutput);

// Export functions for potential reuse
export {
  parseAnswerText,
  evaluateMCQ,
  processJsonInput
};
