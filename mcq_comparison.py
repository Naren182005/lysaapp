"""
MCQ Answer Evaluation

This module provides functionality to evaluate student answers for multiple-choice questions (MCQs)
by comparing them with model answers.
"""

def parse_answer_text(answer_text):
    """
    Parses MCQ answers from a text string.

    The text can be in multiple formats:
    1. Each line contains a question number and answer: "1A", "2B", etc.
    2. Space-separated pairs: "1 A 2 B 3 C 4 D"

    Args:
        answer_text (str): Text containing question numbers and answer options

    Returns:
        dict: Dictionary mapping question numbers to answer options
    """
    # Handle empty input
    if not answer_text:
        return {}

    answers = {}

    # First, try to parse as newline-separated format (1A, 2B, etc.)
    if '\n' in answer_text:
        lines = answer_text.split('\n')

        for line in lines:
            trimmed = line.strip().upper()
            if trimmed:
                # Try to extract question number and option
                import re

                # Try to match formats like "1A" or "1 A"
                match = re.match(r'^(\d+)\s*([A-D])$', trimmed)

                if match:
                    q_no = match.group(1)
                    option = match.group(2)
                    answers[q_no] = option
                else:
                    # Try to extract any digit and any A-D letter
                    q_no_match = re.search(r'(\d+)', trimmed)
                    option_match = re.search(r'([A-D])', trimmed)

                    if q_no_match and option_match:
                        q_no = q_no_match.group(1)
                        option = option_match.group(1)
                        answers[q_no] = option

    # If no answers were parsed from newlines, try space-separated format
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

                # Validate question number (should be a number)
                if q_no.isdigit():
                    # Validate option (should be A, B, C, or D)
                    if option in ['A', 'B', 'C', 'D']:
                        answers[q_no] = option

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


def display_results(score, total, model_answers=None, student_answers=None):
    """
    Displays the evaluation results in a formatted way.

    Args:
        score (int): The score achieved
        total (int): The total possible score
        model_answers (dict, optional): Dictionary of model answers
        student_answers (dict, optional): Dictionary of student answers
    """
    print("\n===========================================")
    print("MCQ Answer Evaluation Results")
    print("===========================================")

    # Display detailed results for each question if answers are provided
    if model_answers and student_answers:
        print("\nDetailed Results:")
        print("-------------------------------------------")

        for q_no, correct_option in model_answers.items():
            student_option = student_answers.get(q_no)
            is_correct = student_option == correct_option

            status = "✓" if is_correct else "✗"
            student_answer = student_option if student_option else "No answer"

            print(f"Question {q_no}: {status} | Model: {correct_option} | Student: {student_answer}")

    # Display final score
    print("\n===========================================")
    print(f"Final Score: {score}/{total}")
    print("===========================================")


# Example usage
if __name__ == "__main__":
    model_answer_text = """1A
2B
3C
4D"""

    student_answer_text = "1 a 2 b 3 c 4 d"

    # Evaluate the answers
    score, total = evaluate_mcq(model_answer_text, student_answer_text)

    # Parse answers for detailed display
    model_answers = parse_answer_text(model_answer_text)
    student_answers = parse_answer_text(student_answer_text)

    # Display the results
    display_results(score, total, model_answers, student_answers)
