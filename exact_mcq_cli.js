#!/usr/bin/env node

// Command-line interface for MCQ answer evaluation
// Usage: node exact_mcq_cli.js '{"model_answers": "1A 2B 3C 4D", "student_answers": "1 a 2 b 3 c 4 d"}'

import { processJsonInput } from './exact_mcq_comparison.js';

// Get JSON input from command-line argument
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node exact_mcq_cli.js \'{"model_answers": "1A 2B 3C 4D", "student_answers": "1 a 2 b 3 c 4 d"}\'');
  console.log('Or: node exact_mcq_cli.js --model "1A 2B 3C 4D" --student "1 a 2 b 3 c 4 d"');
  process.exit(1);
}

try {
  let jsonInput;
  
  // Check if using named arguments
  if (args[0] === '--model' && args.length >= 4 && args[2] === '--student') {
    jsonInput = {
      model_answers: args[1],
      student_answers: args[3]
    };
  } else {
    // Parse JSON from command-line argument
    jsonInput = JSON.parse(args[0]);
  }
  
  // Process the JSON input
  const result = processJsonInput(jsonInput);
  
  // Display the formatted output
  console.log(result.formattedOutput);
  
  // Also display the raw result as JSON if --json flag is provided
  if (args.includes('--json') || args.includes('-j')) {
    console.log('\nRaw Result:');
    console.log(JSON.stringify({
      score: result.score,
      total: result.total
    }, null, 2));
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
