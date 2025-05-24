"""
MCQ Answer Evaluation

This script exactly matches the Python implementation provided by the user.
"""

import json
import sys


def parse_answer_text(answer_text):
    """
    Parses MCQ answers from a text string.
    The text is expected to be in the format: "1A 2B 3C 4D" or "1 A 2 B 3 C 4 D"

    Args:
        answer_text (str): Text containing question numbers and answer options

    Returns:
        dict: Dictionary mapping question numbers to answer options
    """
    import re

    print("Parsing answer text:", answer_text)

    # Handle empty input
    if not answer_text:
        return {}

    answers = {}

    # First try to parse as adjacent pairs (1A2B3C4D)
    text = answer_text.upper()
    adjacent_pairs_matches = re.finditer(r'(\d+)([A-D])', text)

    for match in adjacent_pairs_matches:
        q_no = match.group(1)
        option = match.group(2)
        answers[q_no] = option

    # If no answers found, try space-separated format
    if not answers:
        # Replace newlines with spaces and trim whitespace
        text = answer_text.replace('\n', ' ').strip().upper()

        # Split by whitespace
        parts = text.split()

        # Process pairs of elements (question number and option)
        for i in range(0, len(parts), 2):
            # Make sure we have both question number and option
            if i + 1 < len(parts):
                q_no = parts[i]
                option = parts[i+1]

                # Add to answers dictionary
                answers[q_no] = option

    print("Parsed answers:", answers)
    return answers


def evaluate_mcq(model_answer_text, student_answer_text):
    """
    Evaluates MCQ answers by comparing model answers with student answers.

    Args:
        model_answer_text (str): Text containing model answers
        student_answer_text (str): Text containing student answers

    Returns:
        tuple: (score, total) - The score achieved and the total possible score
    """
    # Parse the answers
    model_answers = parse_answer_text(model_answer_text)
    student_answers = parse_answer_text(student_answer_text)

    score = 0
    total = len(model_answers)

    # Compare answers for each question in the model answers
    for q_no, correct_option in model_answers.items():
        if student_answers.get(q_no) == correct_option:
            score += 1

    return score, total


def process_json_input(json_input):
    """
    Processes a JSON input with model_answers and student_answers.

    Args:
        json_input (dict): JSON object with model_answers and student_answers

    Returns:
        dict: Evaluation result with score and total
    """
    # Extract model and student answers from JSON
    model_answers = json_input.get('model_answers')
    student_answers = json_input.get('student_answers')

    # Validate input
    if not model_answers or not student_answers:
        raise ValueError('Invalid JSON input: model_answers and student_answers are required')

    # Evaluate the answers
    score, total = evaluate_mcq(model_answers, student_answers)

    # Format the output
    formatted_output = f"Final Score: {score}/{total}"

    # Return the result
    return {
        'score': score,
        'total': total,
        'formattedOutput': formatted_output
    }


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
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
