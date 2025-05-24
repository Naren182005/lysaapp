#!/usr/bin/env python
"""
Direct MCQ Answer Generator (using OpenAI)

This script uses the OpenAI API to generate answers for multiple-choice questions.
It takes MCQ questions as input and outputs only the option letters (a/b/c/d) for each question.

Usage:
    python openai_mcq_direct.py
"""

import os
import openai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure the OpenAI API with your API key
API_KEY = os.getenv("OPENAI_API_KEY", "")  # Get API key from environment variable
openai.api_key = API_KEY

# Sample MCQ questions
questions = """
Question 1. Which lens has virtual focus? a. Convex lens b. Concave lens c. Both convex and concave lens d. None

Question 2. A small electric lamp placed at the focal point of convex lens produces- a. Converging beam of light b. Parallel beam of light c. Diverging beam of light d. Diffused beam of light

Question 3. In a circuit- a. Ammeter is always connected in parallel and voltmeter in series b. Both are connected in series c. Both are connected in parallel d. Ammeter is always connected in series and voltmeter is parallel with resistor

Question 4. A convex lens of focal length forms an image of an object equal in size of the object when the object is placed at a distance- a. Greater than 2f b. Less than f c. Equal to 2f d. None
"""

# Prompt template for MCQ answer generation
prompt = f"""
You are a model answer generator for CLASS-X SCIENCE PRACTICAL SKILLS AND TECHNOLOGY MCQ papers.

Instructions:
- Read the following MCQ questions carefully.
- Choose the correct option for each question.
- Output ONLY the option letter (a/b/c/d) for each question in order, numbered accordingly.
- Do NOT provide explanations, extra text, or formatting boxes.
- Do NOT write sentences or paragraphs.
- ONLY output the question number and letter answer.
- Example output:
1 b
2 c
3 a
4 d

Here are the questions:

{questions}

Generate the answers.
"""

def main():
    try:
        # Check if API key is set
        if not API_KEY:
            raise ValueError("OpenAI API key is not set. Please set it in the .env file.")

        # Create a request to the OpenAI API
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a model answer generator for CLASS-X SCIENCE PRACTICAL SKILLS AND TECHNOLOGY MCQ papers."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=150
        )

        # Extract the generated text
        generated_text = response.choices[0].message.content.strip()

        # Print the generated answers
        print("\nGenerated Answers:")
        print("==================")
        print(generated_text)
        print("==================")
    except Exception as e:
        print(f"Error generating answers: {e}")
        # Fallback to hardcoded answers for testing
        print("\nFallback to hardcoded answers due to API error:")
        print("==================")
        print("1 b\n2 b\n3 d\n4 c")
        print("==================")

if __name__ == "__main__":
    main()
