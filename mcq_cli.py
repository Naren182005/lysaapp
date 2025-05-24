#!/usr/bin/env python
"""
Command-line interface for MCQ answer evaluation

Usage:
    python mcq_cli.py '{"model_answers": "1A 2B 3C 4D", "student_answers": "1 a 2 b 3 c 4 d"}'
    python mcq_cli.py --model "1A 2B 3C 4D" --student "1 a 2 b 3 c 4 d"
"""

import json
import sys
import argparse
from evaluate_mcq_json import process_json_input


def main():
    """Main function for the command-line interface"""
    # Create argument parser
    parser = argparse.ArgumentParser(description='Evaluate MCQ answers')
    
    # Add arguments
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('json_input', nargs='?', help='JSON input with model_answers and student_answers')
    group.add_argument('--model', help='Model answers (e.g., "1A 2B 3C 4D")')
    
    parser.add_argument('--student', help='Student answers (e.g., "1 a 2 b 3 c 4 d")')
    parser.add_argument('--json', action='store_true', help='Output raw result as JSON')
    
    # Parse arguments
    args = parser.parse_args()
    
    try:
        # Check if using named arguments
        if args.model:
            if not args.student:
                parser.error('--student is required when using --model')
            
            json_input = {
                'model_answers': args.model,
                'student_answers': args.student
            }
        else:
            # Parse JSON from command-line argument
            json_input = json.loads(args.json_input)
        
        # Process the JSON input
        result = process_json_input(json_input)
        
        # Display the formatted output
        print(result['formattedOutput'])
        
        # Also display the raw result as JSON if --json flag is provided
        if args.json:
            print('\nRaw Result:')
            print(json.dumps(result, indent=2))
    
    except json.JSONDecodeError:
        print('Error: Invalid JSON format')
        sys.exit(1)
    except ValueError as e:
        print(f'Error: {str(e)}')
        sys.exit(1)
    except Exception as e:
        print(f'Error: {str(e)}')
        sys.exit(1)


if __name__ == '__main__':
    main()
