# Exact MCQ Answer Evaluation

This module provides functionality to evaluate student answers for multiple-choice questions (MCQs) by comparing them with model answers. It exactly matches the Python implementation provided by the user.

## Features

- Accepts JSON input with model answers and student answers
- Parses MCQ answers from various formats (space-separated or adjacent pairs)
- Evaluates student answers against model answers
- Calculates scores based on correct answers
- Offers both JavaScript and Python implementations
- Includes command-line interfaces for easy use

## Usage

### JavaScript

#### Using the Module

```javascript
import { processJsonInput } from './exact_mcq_comparison.js';

// Example JSON input
const jsonInput = {
  "model_answers": "1A 2B 3C 4D",
  "student_answers": "1 a 2 b 3 c 4 d"
};

// Process the JSON input
const result = processJsonInput(jsonInput);

// Display the formatted output
console.log(result.formattedOutput);
// Output: Final Score: 4/4
```

#### Using the Command-Line Interface

```bash
# Using JSON input
node exact_mcq_cli.js '{"model_answers": "1A 2B 3C 4D", "student_answers": "1 a 2 b 3 c 4 d"}'

# Using named arguments
node exact_mcq_cli.js --model "1A 2B 3C 4D" --student "1 a 2 b 3 c 4 d"

# Display raw result as JSON
node exact_mcq_cli.js --model "1A 2B 3C 4D" --student "1 a 2 b 3 c 4 d" --json
```

### Python

#### Using the Module

```python
from exact_mcq_comparison import process_json_input

# Example JSON input
json_input = {
  "model_answers": "1A 2B 3C 4D",
  "student_answers": "1 a 2 b 3 c 4 d"
}

# Process the JSON input
result = process_json_input(json_input)

# Display the formatted output
print(result['formattedOutput'])
# Output: Final Score: 4/4
```

#### Using the Command-Line Interface

```bash
# Using JSON input
python exact_mcq_cli.py '{"model_answers": "1A 2B 3C 4D", "student_answers": "1 a 2 b 3 c 4 d"}'

# Using named arguments
python exact_mcq_cli.py --model "1A 2B 3C 4D" --student "1 a 2 b 3 c 4 d"

# Display raw result as JSON
python exact_mcq_cli.py --model "1A 2B 3C 4D" --student "1 a 2 b 3 c 4 d" --json
```

## Input Formats

The module supports various input formats for MCQ answers:

### Model Answers

```
# Space-separated pairs
"1A 2B 3C 4D"

# Adjacent pairs without spaces
"1A2B3C4D"
```

### Student Answers

```
# Space-separated pairs
"1 A 2 B 3 C 4 D"

# Adjacent pairs without spaces
"1A2B3C4D"
```

## Output Format

The module provides a simple output format:

```
Final Score: 4/4
```

## Testing

Run the test scripts to verify the functionality:

### JavaScript

```bash
node test_exact_mcq.js
```

### Python

```bash
python -m unittest test_exact_mcq.py
```
