"""
Script to evaluate MCQ answers from JSON input

This script takes a JSON object with model_answers and student_answers
and evaluates the student's performance.
"""

import json
import sys


def parse_answer_text(answer_text):
    """
    Parses MCQ answers from a text string.

    The text can be in multiple formats:
    1. Each line contains a question number and answer: "1A", "2B", etc.
    2. Space-separated pairs: "1 A 2 B 3 C 4 D"
    3. Adjacent pairs without spaces: "1A2B3C4D"

    Args:
        answer_text (str): Text containing question numbers and answer options

    Returns:
        dict: Dictionary mapping question numbers to answer options
    """
    import re

    # Handle empty input
    if not answer_text:
        return {}

    answers = {}

    # Convert to uppercase for case-insensitive comparison
    text = answer_text.strip().upper()

    # Try to parse as space-separated format first (most common in the JSON)
    # This handles formats like "1 A 2 B 3 C 4 D"
    space_separated_matches = re.finditer(r'(\d+)\s+([A-D])', text)

    for match in space_separated_matches:
        q_no = match.group(1)
        option = match.group(2)
        answers[q_no] = option

    # If no answers were found, try to parse as adjacent pairs
    # This handles formats like "1A2B3C4D"
    if not answers:
        adjacent_pairs_matches = re.finditer(r'(\d+)([A-D])', text)

        for match in adjacent_pairs_matches:
            q_no = match.group(1)
            option = match.group(2)
            answers[q_no] = option

    # If still no answers, try to parse as newline-separated format
    if not answers and '\n' in text:
        lines = text.split('\n')

        for line in lines:
            trimmed = line.strip()
            if trimmed:
                # Try to extract any digit and any A-D letter from each line
                q_no_match = re.search(r'(\d+)', trimmed)
                option_match = re.search(r'([A-D])', trimmed)

                if q_no_match and option_match:
                    q_no = q_no_match.group(1)
                    option = option_match.group(1)
                    answers[q_no] = option

    return answers


def evaluate_mcq(model_answer_text, student_answer_text):
    """
    Evaluates MCQ answers by comparing model answers with student answers.

    Args:
        model_answer_text (str): Text containing model answers
        student_answer_text (str): Text containing student answers

    Returns:
        dict: Evaluation result with score, total, and detailed results
    """
    # Parse the answers
    model_answers = parse_answer_text(model_answer_text)
    student_answers = parse_answer_text(student_answer_text)

    score = 0
    total = len(model_answers)
    results = {}

    # Compare answers for each question in the model answers
    for q_no, correct_option in model_answers.items():
        student_option = student_answers.get(q_no)

        # Check if student answered this question correctly
        if student_option == correct_option:
            score += 1
            results[q_no] = {
                'correctOption': correct_option,
                'studentOption': student_option,
                'isCorrect': True
            }
        else:
            results[q_no] = {
                'correctOption': correct_option,
                'studentOption': student_option if student_option else None,
                'isCorrect': False
            }

    # Calculate percentage
    percentage = round((score / total) * 100) if total > 0 else 0

    return {
        'score': score,
        'total': total,
        'results': results,
        'percentage': percentage
    }


def format_results(evaluation_result):
    """
    Formats the evaluation results as a string.

    Args:
        evaluation_result (dict): Result from evaluate_mcq function

    Returns:
        str: Formatted result string
    """
    score = evaluation_result['score']
    total = evaluation_result['total']
    results = evaluation_result['results']
    percentage = evaluation_result['percentage']

    output = '\n===========================================\n'
    output += 'MCQ Answer Evaluation Results\n'
    output += '===========================================\n\n'

    # Display detailed results for each question
    output += 'Detailed Results:\n'
    output += '-------------------------------------------\n'

    for q_no, result in results.items():
        status = '✓' if result['isCorrect'] else '✗'
        student_answer = result['studentOption'] if result['studentOption'] else 'No answer'

        output += f"Question {q_no}: {status} | Model: {result['correctOption']} | Student: {student_answer}\n"

    # Display final score
    output += '\n===========================================\n'
    output += f"Final Score: {score}/{total} ({percentage}%)\n"
    output += '===========================================\n'

    # Add performance label
    if percentage >= 90:
        performance_label = 'Excellent'
    elif percentage >= 70:
        performance_label = 'Good'
    elif percentage >= 50:
        performance_label = 'Average'
    else:
        performance_label = 'Poor'

    output += f"Performance: {performance_label}\n"

    return output


def process_json_input(json_input):
    """
    Processes a JSON input with model_answers and student_answers.

    Args:
        json_input (dict): JSON object with model_answers and student_answers

    Returns:
        dict: Evaluation result with score, total, details, and formatted output
    """
    # Extract model and student answers from JSON
    model_answers = json_input.get('model_answers')
    student_answers = json_input.get('student_answers')

    # Validate input
    if not model_answers or not student_answers:
        raise ValueError('Invalid JSON input: model_answers and student_answers are required')

    # Evaluate the answers
    evaluation_result = evaluate_mcq(model_answers, student_answers)

    # Format the results
    formatted_output = format_results(evaluation_result)

    # Add formatted output to the result
    evaluation_result['formattedOutput'] = formatted_output

    return evaluation_result


# Example usage with the provided JSON
if __name__ == "__main__":
    # Check if JSON is provided as command-line argument
    if len(sys.argv) > 1:
        try:
            # Parse JSON from command-line argument
            json_input = json.loads(sys.argv[1])
        except json.JSONDecodeError:
            print("Error: Invalid JSON format")
            sys.exit(1)
    else:
        # Use example JSON
        json_input = {
            "model_answers": "1A 2B 3C 4D",
            "student_answers": "1 a 2 b 3 c 4 d"
        }

    try:
        # Process the JSON input
        result = process_json_input(json_input)

        # Display the formatted output
        print(result['formattedOutput'])

        # Also display the raw result as JSON
        print('\nRaw Result:')
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
