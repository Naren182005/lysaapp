// Script to evaluate MCQ answers from JSON input
// This script takes a JSON object with model_answers and student_answers
// and evaluates the student's performance

/**
 * Parses MCQ answers from a text string
 * The text can be in multiple formats:
 * 1. Each line contains a question number and answer: "1A", "2B", etc.
 * 2. Space-separated pairs: "1 A 2 B 3 C 4 D"
 * 3. Adjacent pairs without spaces: "1A2B3C4D"
 *
 * @param {string} answerText The answer text to parse
 * @returns {Object} Dictionary mapping question numbers to answer options
 */
function parseAnswerText(answerText) {
  // Handle empty input
  if (!answerText) {
    return {};
  }

  const answers = {};

  // Convert to uppercase for case-insensitive comparison
  const text = answerText.trim().toUpperCase();

  // Try to parse as space-separated format first (most common in the JSON)
  // This handles formats like "1 A 2 B 3 C 4 D"
  const spaceSeparatedRegex = /(\d+)\s+([A-D])/g;
  let match;

  while ((match = spaceSeparatedRegex.exec(text)) !== null) {
    const qNo = match[1];
    const option = match[2];
    answers[qNo] = option;
  }

  // If no answers were found, try to parse as adjacent pairs
  // This handles formats like "1A2B3C4D"
  if (Object.keys(answers).length === 0) {
    const adjacentPairsRegex = /(\d+)([A-D])/g;

    while ((match = adjacentPairsRegex.exec(text)) !== null) {
      const qNo = match[1];
      const option = match[2];
      answers[qNo] = option;
    }
  }

  // If still no answers, try to parse as newline-separated format
  if (Object.keys(answers).length === 0 && text.includes('\n')) {
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        // Try to extract any digit and any A-D letter from each line
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

  return answers;
}

/**
 * Evaluates MCQ answers by comparing model answers with student answers
 *
 * @param {string} modelAnswerText The model answer text
 * @param {string} studentAnswerText The student answer text
 * @returns {Object} Object containing score, total, and detailed results
 */
function evaluateMCQ(modelAnswerText, studentAnswerText) {
  // Parse the answers
  const modelAnswers = parseAnswerText(modelAnswerText);
  const studentAnswers = parseAnswerText(studentAnswerText);

  let score = 0;
  const total = Object.keys(modelAnswers).length;
  const results = {};

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
    results,
    percentage: total > 0 ? Math.round((score / total) * 100) : 0
  };
}

/**
 * Formats the evaluation results as a string
 *
 * @param {Object} evaluationResult Result from evaluateMCQ function
 * @returns {string} Formatted result string
 */
function formatResults(evaluationResult) {
  const { score, total, results, percentage } = evaluationResult;

  let output = '\n===========================================\n';
  output += 'MCQ Answer Evaluation Results\n';
  output += '===========================================\n\n';

  // Display detailed results for each question
  output += 'Detailed Results:\n';
  output += '-------------------------------------------\n';

  for (const [qNo, result] of Object.entries(results)) {
    const status = result.isCorrect ? '✓' : '✗';
    const studentAnswer = result.studentOption || 'No answer';

    output += `Question ${qNo}: ${status} | Model: ${result.correctOption} | Student: ${studentAnswer}\n`;
  }

  // Display final score
  output += '\n===========================================\n';
  output += `Final Score: ${score}/${total} (${percentage}%)\n`;
  output += '===========================================\n';

  // Add performance label
  let performanceLabel;
  if (percentage >= 90) {
    performanceLabel = 'Excellent';
  } else if (percentage >= 70) {
    performanceLabel = 'Good';
  } else if (percentage >= 50) {
    performanceLabel = 'Average';
  } else {
    performanceLabel = 'Poor';
  }

  output += `Performance: ${performanceLabel}\n`;

  return output;
}

/**
 * Processes a JSON input with model_answers and student_answers
 *
 * @param {Object} jsonInput JSON object with model_answers and student_answers
 * @returns {Object} Evaluation result with score, total, details, and formatted output
 */
function processJsonInput(jsonInput) {
  // Extract model and student answers from JSON
  const { model_answers, student_answers } = jsonInput;

  // Validate input
  if (!model_answers || !student_answers) {
    throw new Error('Invalid JSON input: model_answers and student_answers are required');
  }

  // Evaluate the answers
  const evaluationResult = evaluateMCQ(model_answers, student_answers);

  // Format the results
  const formattedOutput = formatResults(evaluationResult);

  // Return both the raw result and formatted output
  return {
    ...evaluationResult,
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

// Also display the raw result as JSON
console.log('\nRaw Result:');
console.log(JSON.stringify(result, null, 2));

// Export functions for potential reuse
export {
  parseAnswerText,
  evaluateMCQ,
  formatResults,
  processJsonInput
};
