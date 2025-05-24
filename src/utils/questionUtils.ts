/**
 * Utility functions for question paper analysis and processing
 */

/**
 * Checks if a question is a multiple-choice question
 * @param question The question text to analyze
 * @returns True if the question is a multiple-choice question, false otherwise
 */
export function isMultipleChoiceQuestion(question: string): boolean {
  // Check for common MCQ patterns
  const mcqPatterns = [
    // Pattern 1: Options with letters and parentheses or periods
    /\b[A-D]\s*[).].*\b[B-D]\s*[).]/i,

    // Pattern 2: Multiple lines with options
    /\b[A-D]\s*[).]\s*[^\n]+\n+\s*\b[B-D]\s*[).]/i,

    // Pattern 3: Options with numbers
    /\b[1-4]\s*[).]\s*[^\n]+\n+\s*\b[2-4]\s*[).]/i,

    // Pattern 4: "Choose one" or similar phrases
    /choose\s+(one|the\s+correct|the\s+best)/i,

    // Pattern 5: "Select" phrases
    /select\s+(one|the\s+correct|the\s+best)/i
  ];

  // Check if any pattern matches
  return mcqPatterns.some(pattern => pattern.test(question));
}

/**
 * Checks if a paper contains only multiple-choice questions
 * @param paperText The full text of the paper
 * @returns True if the paper contains only MCQ questions, false otherwise
 */
export function isMCQOnlyPaper(paperText: string): boolean {
  // Split the paper into questions (assuming questions are separated by numbers)
  const questionPattern = /\b\d+[).]\s+/g;
  const questions = paperText.split(questionPattern).filter(q => q.trim().length > 0);

  // If no questions found, check if the whole paper looks like an MCQ
  if (questions.length === 0) {
    return isMultipleChoiceQuestion(paperText);
  }

  // Check if all questions are MCQs
  const mcqCount = questions.filter(q => isMultipleChoiceQuestion(q)).length;

  // Consider it an MCQ-only paper if:
  // 1. At least 80% of detected questions are MCQs (to account for parsing errors)
  // 2. There are at least 2 questions detected
  return questions.length >= 2 && (mcqCount / questions.length) >= 0.8;
}

/**
 * Extracts MCQ options from a question
 * @param question The question text
 * @returns An array of options (A, B, C, D) or empty array if not found
 */
export function extractMCQOptions(question: string): string[] {
  const options: string[] = [];

  // Look for options in the format A), B), C), D) or A., B., C., D.
  const optionPattern = /\b([A-D])\s*[).]\s*([^\n]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = optionPattern.exec(question)) !== null) {
    options.push(match[1].toUpperCase());
  }

  return options;
}

/**
 * Formats a question paper for better MCQ detection
 * @param paperText The raw paper text
 * @returns Formatted paper text
 */
export function formatQuestionPaper(paperText: string): string {
  // Replace multiple spaces with a single space
  let formatted = paperText.replace(/\s+/g, ' ');

  // Ensure question numbers are followed by a period and space
  formatted = formatted.replace(/(\d+)[).]\s*/g, '$1. ');

  // Ensure option letters are followed by a period and space
  formatted = formatted.replace(/\b([A-D])[).]\s*/gi, '$1. ');

  return formatted;
}

/**
 * Formats an MCQ question for standardized display in the evaluation part
 * @param questionText The raw question text
 * @returns Formatted MCQ question with properly aligned options
 */
export function formatMCQQuestion(questionText: string): string {
  if (!questionText || !isMultipleChoiceQuestion(questionText)) {
    return questionText;
  }

  // Clean up the question text
  const cleanedText = questionText.trim();

  // Extract the main question part (everything before the first option)
  const optionMatch = cleanedText.match(/\b[A-D][.)]/i);
  if (!optionMatch || optionMatch.index === undefined) {
    return questionText;
  }

  const questionPart = cleanedText.substring(0, optionMatch.index).trim();

  // Extract all options
  const optionPattern = /\b([A-D])[.)]\s*([^\n]+?)(?=\s*\b[A-D][.]|$)/gi;
  const options: {letter: string, text: string}[] = [];
  let match: RegExpExecArray | null;

  const remainingText = cleanedText.substring(optionMatch.index);
  while ((match = optionPattern.exec(remainingText)) !== null) {
    options.push({
      letter: match[1].toUpperCase(),
      text: match[2].trim()
    });
  }

  // Format the question with properly aligned options
  let formattedQuestion = `${questionPart}\n\n`;

  // Add each option on a new line with consistent formatting
  options.forEach(option => {
    formattedQuestion += `${option.letter}) ${option.text}\n`;
  });

  return formattedQuestion;
}

/**
 * Interface for MCQ question structure
 */
interface MCQStructure {
  questionText: string;
  options: string[];
}

/**
 * Converts a paragraph text into an MCQ format
 * @param paragraphText The paragraph text to convert to MCQ
 * @returns An MCQ structure or null if conversion failed
 */
export function convertParagraphToMCQ(paragraphText: string): MCQStructure | null {
  if (!paragraphText || paragraphText.trim().length === 0) {
    return null;
  }

  // Try to identify if this is already an MCQ question
  if (isMultipleChoiceQuestion(paragraphText)) {
    // If not detected as MCQ, try to find options in the text using multiple patterns
    const optionPatterns = [
      // Standard format: A) text B) text
      /\b([A-D])[.|)]\s*([^.|)]+)(?=\s+[A-D][.|)]|$)/gi,

      // Format with newlines: A) text\nB) text
      /\b([A-D])[.|)]\s*([^\n]+)(?=\n|$)/gi,

      // Format with option/choice keywords: Option A: text
      /\b(?:option|choice)\s+([A-D])[:.)]\s*([^\n]+)(?=\s+(?:option|choice)|$)/gi
    ];

    let optionMatches = null;
    for (const pattern of optionPatterns) {
      optionMatches = paragraphText.match(pattern);
      if (optionMatches && optionMatches.length >= 2) {
        break;
      }
    }

    if (optionMatches) {
      // Extract the question part (everything before the first option)
      const optionMatch = paragraphText.match(/\b[A-D][.)]/i);
      if (optionMatch && optionMatch.index !== undefined) {
        const questionPart = paragraphText.substring(0, optionMatch.index).trim();

        // Extract options
        const options: string[] = [];
        const optionPattern = /\b([A-D])[.)]\s*([^\n]+?)(?=\s*\b[A-D][.]|$)/gi;
        let match: RegExpExecArray | null;
        const remainingText = paragraphText.substring(optionMatch.index);

        while ((match = optionPattern.exec(remainingText)) !== null) {
          options.push(`${match[1]}) ${match[2].trim()}`);
        }

        if (options.length >= 2) {
          return {
            questionText: `${questionPart}\n\n${options.join('\n')}`,
            options: options
          };
        }
      }
    }
  }

  // If not already an MCQ, try to convert the paragraph to MCQ format
  // This is a simple implementation - in a real app, you might use AI to generate options

  // Extract the main question from the paragraph (first sentence or up to a question mark)
  const questionMatch = paragraphText.match(/^(.*?[.?!])\s/);
  let questionPart = questionMatch ? questionMatch[1].trim() : paragraphText.trim();

  // Make sure the question ends with a question mark
  if (!questionPart.endsWith('?')) {
    questionPart = questionPart.replace(/[.!]$/, '') + '?';
  }

  // Generate simple options (in a real app, these would be generated by AI)
  const options = [
    'A) First option for this question',
    'B) Second option for this question',
    'C) Third option for this question',
    'D) Fourth option for this question'
  ];

  return {
    questionText: `${questionPart}\n\n${options.join('\n')}`,
    options: options
  };
}
