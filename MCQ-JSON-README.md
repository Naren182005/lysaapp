# MCQ Answer Evaluation with JSON Input

This module provides functionality to evaluate student answers for multiple-choice questions (MCQs) by comparing them with model answers using JSON input.

## Features

- Accepts JSON input with model answers and student answers
- Parses MCQ answers from various formats
- Evaluates student answers against model answers
- Calculates scores based on correct answers
- Provides detailed results for each question
- Offers both JavaScript and Python implementations
- Includes command-line interfaces for easy use

## Usage

### JavaScript

#### Using the Module

```javascript
import { processJsonInput } from './evaluate_mcq_json.js';

// Example JSON input
const jsonInput = {
  "model_answers": "1A 2B 3C 4D",
  "student_answers": "1 a 2 b 3 c 4 d"
};

// Process the JSON input
const result = processJsonInput(jsonInput);

// Display the formatted output
console.log(result.formattedOutput);
```

#### Using the Command-Line Interface

```bash
# Using JSON input
node mcq_cli.js '{"model_answers": "1A 2B 3C 4D", "student_answers": "1 a 2 b 3 c 4 d"}'

# Using named arguments
node mcq_cli.js --model "1A 2B 3C 4D" --student "1 a 2 b 3 c 4 d"

# Display raw result as JSON
node mcq_cli.js --model "1A 2B 3C 4D" --student "1 a 2 b 3 c 4 d" --json
```

### Python

#### Using the Module

```python
from evaluate_mcq_json import process_json_input

# Example JSON input
json_input = {
  "model_answers": "1A 2B 3C 4D",
  "student_answers": "1 a 2 b 3 c 4 d"
}

# Process the JSON input
result = process_json_input(json_input)

# Display the formatted output
print(result['formattedOutput'])
```

#### Using the Command-Line Interface

```bash
# Using JSON input
python mcq_cli.py '{"model_answers": "1A 2B 3C 4D", "student_answers": "1 a 2 b 3 c 4 d"}'

# Using named arguments
python mcq_cli.py --model "1A 2B 3C 4D" --student "1 a 2 b 3 c 4 d"

# Display raw result as JSON
python mcq_cli.py --model "1A 2B 3C 4D" --student "1 a 2 b 3 c 4 d" --json
```

## Input Formats

The module supports various input formats for MCQ answers:

### Model Answers

```
# Space-separated pairs
"1A 2B 3C 4D"

# Adjacent pairs without spaces
"1A2B3C4D"

# Newline-separated pairs
"1A
2B
3C
4D"
```

### Student Answers

```
# Space-separated pairs
"1 A 2 B 3 C 4 D"

# Adjacent pairs without spaces
"1A2B3C4D"

# Newline-separated pairs
"1 A
2 B
3 C
4 D"
```

## Output Format

The module provides both formatted output and raw result:

### Formatted Output

```
===========================================
MCQ Answer Evaluation Results
===========================================

Detailed Results:
-------------------------------------------
Question 1: ✓ | Model: A | Student: A
Question 2: ✓ | Model: B | Student: B
Question 3: ✓ | Model: C | Student: C
Question 4: ✓ | Model: D | Student: D

===========================================
Final Score: 4/4 (100%)
===========================================
Performance: Excellent
```

### Raw Result

```json
{
  "score": 4,
  "total": 4,
  "results": {
    "1": {
      "correctOption": "A",
      "studentOption": "A",
      "isCorrect": true
    },
    "2": {
      "correctOption": "B",
      "studentOption": "B",
      "isCorrect": true
    },
    "3": {
      "correctOption": "C",
      "studentOption": "C",
      "isCorrect": true
    },
    "4": {
      "correctOption": "D",
      "studentOption": "D",
      "isCorrect": true
    }
  },
  "percentage": 100
}
```

## Performance Labels

The module assigns performance labels based on the percentage score:

- **Excellent**: 90-100%
- **Good**: 70-89%
- **Average**: 50-69%
- **Poor**: 0-49%
