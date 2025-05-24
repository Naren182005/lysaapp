# MCQ Answer Generator for CLASS-X SCIENCE PRACTICAL SKILLS AND TECHNOLOGY

This tool generates answers for multiple-choice questions (MCQs) using the Google Gemini API. It's specifically designed for CLASS-X SCIENCE PRACTICAL SKILLS AND TECHNOLOGY MCQ papers.

## Features

- Processes MCQ questions and generates only the option letters (a/b/c/d) for each question
- Supports input from command line or text files
- Customizable prompt templates
- Output to console or file

## Requirements

- Python 3.6 or higher
- Required Python packages:
  - `google-generativeai`
  - `python-dotenv`

## Installation

1. Install the required packages:

```bash
pip install google-generativeai python-dotenv
```

2. Set up your Google Gemini API key:

   a. Create a `.env` file in the same directory as the script
   b. Add your Gemini API key to the file:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

## Usage

### Basic Usage

```bash
python gemini_mcq_generator.py "Question 1. Which lens has virtual focus? a. Convex lens b. Concave lens c. Both convex and concave lens d. None"
```

### Using a File with Multiple Questions

```bash
python gemini_mcq_generator.py --file questions.txt
```

### Saving Output to a File

```bash
python gemini_mcq_generator.py --file questions.txt --output answers.txt
```

### Using a Custom Prompt

```bash
python gemini_mcq_generator.py --prompt "Your custom prompt with {questions} placeholder" --file questions.txt
```

## Input Format

The script accepts MCQ questions in various formats:

```
Question 1. Which lens has virtual focus? a. Convex lens b. Concave lens c. Both convex and concave lens d. None

Question 2. A small electric lamp placed at the focal point of convex lens produces- a. Converging beam of light b. Parallel beam of light c. Diverging beam of light d. Diffused beam of light
```

## Output Format

The output is formatted as question numbers followed by the option letter:

```
1 b
2 b
3 d
4 c
```

## Example

### Input (questions.txt)

```
Question 1. Which lens has virtual focus? a. Convex lens b. Concave lens c. Both convex and concave lens d. None

Question 2. A small electric lamp placed at the focal point of convex lens produces- a. Converging beam of light b. Parallel beam of light c. Diverging beam of light d. Diffused beam of light

Question 3. In a circuit- a. Ammeter is always connected in parallel and voltmeter in series b. Both are connected in series c. Both are connected in parallel d. Ammeter is always connected in series and voltmeter is parallel with resistor

Question 4. A convex lens of focal length forms an image of an object equal in size of the object when the object is placed at a distance- a. Greater than 2f b. Less than f c. Equal to 2f d. None
```

### Command

```bash
python gemini_mcq_generator.py --file questions.txt
```

### Output

```
Generated Answers:
==================
1 b
2 b
3 d
4 c
==================
```

## Integration with Python Code

You can also use this script in your Python code:

```python
import google.generativeai as genai

genai.configure(api_key="YOUR_API_KEY")

model = genai.GenerativeModel("gemini-1.5-pro")

prompt = """
You are a model answer generator for CLASS-X SCIENCE PRACTICAL SKILLS AND TECHNOLOGY MCQ papers.

Instructions:
- Read the following MCQ questions carefully.
- Choose the correct option for each question.
- Output only the option letter (a/b/c/d) for each question in order, numbered accordingly.
- Do not provide explanations, extra text, or formatting boxes.
- Example output:
1 b
2 c
3 a
4 d

Here are the questions:

Question 1. Which lens has virtual focus? a. Convex lens b. Concave lens c. Both convex and concave lens d. None

Question 2. A small electric lamp placed at the focal point of convex lens produces- a. Converging beam of light b. Parallel beam of light c. Diverging beam of light d. Diffused beam of light

Question 3. In a circuit- a. Ammeter is always connected in parallel and voltmeter in series b. Both are connected in series c. Both are connected in parallel d. Ammeter is always connected in series and voltmeter is parallel with resistor

Question 4. A convex lens of focal length forms an image of an object equal in size of the object when the object is placed at a distance- a. Greater than 2f b. Less than f c. Equal to 2f d. None

Generate the answers.
"""

response = model.generate_content(prompt)
print(response.text)
```

## Troubleshooting

- If you encounter API quota issues, you may need to wait or upgrade your Gemini API plan
- Make sure your API key is correctly set in the `.env` file
- Check that the input questions are properly formatted

## License

This project is licensed under the MIT License - see the LICENSE file for details.
