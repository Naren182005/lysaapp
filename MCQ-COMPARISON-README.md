# MCQ Answer Evaluation

This module provides functionality to evaluate student answers for multiple-choice questions (MCQs) by comparing them with model answers.

## Features

- Parses MCQ answers from various formats (e.g., newline-separated or space-separated pairs)
- Evaluates student answers against model answers
- Calculates scores based on correct answers
- Provides detailed results for each question
- Handles different input formats and case sensitivity

## Usage

### Basic Usage

```javascript
// Import the functions
import { parseAnswerText, evaluateMCQ, displayResults } from './test-mcq-comparison.js';

// Define model answer text and student answer text
const modelAnswerText = `1A
2B
3C
4D`;

const studentAnswerText = "1 a 2 b 3 c 4 d";

// Evaluate the answers
const evaluationResult = evaluateMCQ(modelAnswerText, studentAnswerText);

// Display the results
displayResults(evaluationResult);
```

### Integration with Existing Codebase

To integrate this logic with the existing codebase, you can use the `evaluateMCQ` function in your answer evaluation service:

```javascript
// In your answer evaluation service
import { evaluateMCQ } from './test-mcq-comparison.js';

// Example integration with existing code
export function evaluateMCQAnswers(modelAnswerText, studentAnswerText) {
  // Evaluate the answers
  const result = evaluateMCQ(modelAnswerText, studentAnswerText);

  // Return the result for further processing
  return {
    score: result.score,
    totalQuestions: result.total,
    percentage: (result.score / result.total) * 100,
    details: result.results
  };
}
```

## Function Reference

### `parseAnswerText(answerText)`

Parses MCQ answers from a text string.

- **Parameters:**
  - `answerText` (String): Text containing question numbers and answer options
- **Returns:**
  - Object: Dictionary mapping question numbers to answer options

### `evaluateMCQ(modelAnswerText, studentAnswerText)`

Evaluates student answers against model answers.

- **Parameters:**
  - `modelAnswerText` (String): Text containing model answers
  - `studentAnswerText` (String): Text containing student answers
- **Returns:**
  - Object: Contains score, total questions, and detailed results

### `displayResults(evaluationResult)`

Displays the evaluation results in a formatted way.

- **Parameters:**
  - `evaluationResult` (Object): Result from evaluateMCQ function
- **Returns:**
  - void: Outputs results to console

## Examples

### Example 1: Newline-Separated Model Answers with Space-Separated Student Answers

```javascript
const modelAnswerText = `1A
2B
3C
4D`;

const studentAnswerText = "1 A 2 B 3 C 4 D";

const result = evaluateMCQ(modelAnswerText, studentAnswerText);

console.log(`Score: ${result.score}/${result.total}`);
// Output: Score: 4/4
```

### Example 2: Case Insensitive Comparison

```javascript
const modelAnswerText = `1A
2B
3C
4D`;

const studentAnswerText = "1 a 2 b 3 c 4 d";

const result = evaluateMCQ(modelAnswerText, studentAnswerText);

console.log(`Score: ${result.score}/${result.total}`);
// Output: Score: 4/4
```

## Testing

Run the basic test script:

```bash
node test-mcq-comparison.js
```

For more comprehensive testing with various test cases:

```bash
node test-mcq-comparison-extended.js
```
