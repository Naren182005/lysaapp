import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from '@/hooks/use-mobile';

// Fixed number of questions - always 20 questions
const FIXED_NUM_QUESTIONS = 20;

interface NumberedMCQAnswerEntryProps {
  value: string;
  onChange: (value: string) => void;
}

const NumberedMCQAnswerEntry: React.FC<NumberedMCQAnswerEntryProps> = ({
  value,
  onChange
}) => {
  const isMobile = useIsMobile();
  // Always initialize with exactly 20 empty answers
  const [answers, setAnswers] = useState<string[]>(Array(FIXED_NUM_QUESTIONS).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(FIXED_NUM_QUESTIONS).fill(null));

  // Parse the incoming value to populate the answers array
  useEffect(() => {
    if (value) {
      // Try to parse the value into individual answers
      const parsedAnswers = parseAnswerText(value);

      // Create a new array with the parsed answers, always maintaining 20 slots
      const newAnswers = Array(FIXED_NUM_QUESTIONS).fill('');

      // Fill in the parsed answers
      Object.entries(parsedAnswers).forEach(([qNo, option]) => {
        const index = parseInt(qNo) - 1;
        if (index >= 0 && index < FIXED_NUM_QUESTIONS) {
          newAnswers[index] = option;
        }
      });

      setAnswers(newAnswers);
    }
  }, [value]);

  // No need to update refs array since we have a fixed number of questions

  // Parse answer text into a dictionary of question numbers and options
  const parseAnswerText = (answerText: string): Record<string, string> => {
    if (!answerText) return {};

    const answers: Record<string, string> = {};

    // First try to parse as pairs (1A 2B 3C 4D or 1 A 2 B 3 C 4 D)
    const text = answerText.toUpperCase();

    // Try to match patterns like "1A" or "1 A"
    const pairMatches = text.match(/(\d+)\s*([A-D])/g) || [];

    for (const match of pairMatches) {
      const qNoMatch = match.match(/(\d+)/);
      const optionMatch = match.match(/([A-D])/);

      if (qNoMatch && optionMatch) {
        const qNo = qNoMatch[1];
        const option = optionMatch[1];
        answers[qNo] = option;
      }
    }

    // If no answers were found with the pair pattern, try other formats
    if (Object.keys(answers).length === 0) {
      // Try to parse as newline-separated format (A\nB\nC\nD)
      if (answerText.includes('\n')) {
        const lines = answerText.split('\n');
        lines.forEach((line, index) => {
          const trimmed = line.trim().toUpperCase();
          if (trimmed && /^[A-D]$/.test(trimmed)) {
            answers[(index + 1).toString()] = trimmed;
          }
        });
      }

      // If still no answers, try space-separated format (A B C D)
      if (Object.keys(answers).length === 0) {
        const parts = answerText.replace(/\n/g, ' ').trim().toUpperCase().split(/\s+/);
        let onlyOptions = true;

        // Check if all parts are just options (A, B, C, D)
        for (const part of parts) {
          if (part && !/^[A-D]$/.test(part)) {
            onlyOptions = false;
            break;
          }
        }

        if (onlyOptions) {
          parts.forEach((part, index) => {
            if (/^[A-D]$/.test(part)) {
              answers[(index + 1).toString()] = part;
            }
          });
        }
      }
    }

    return answers;
  };

  // Handle input change for a specific question
  const handleInputChange = (index: number, value: string) => {
    // Only accept A, B, C, D (case insensitive)
    let normalizedValue = value.toUpperCase();

    // Auto-convert 1, 2, 3, 4 to A, B, C, D if entered
    if (normalizedValue === '1') normalizedValue = 'A';
    else if (normalizedValue === '2') normalizedValue = 'B';
    else if (normalizedValue === '3') normalizedValue = 'C';
    else if (normalizedValue === '4') normalizedValue = 'D';

    if (normalizedValue === '' || /^[A-D]$/.test(normalizedValue)) {
      const newAnswers = [...answers];
      newAnswers[index] = normalizedValue;
      setAnswers(newAnswers);

      // Convert answers array to the required format and call onChange
      // Format the value to include question numbers (1A, 2B, etc.)
      const formattedValue = newAnswers
        .map((answer, idx) => answer.trim() ? `${idx + 1}${answer}` : '')
        .filter(answer => answer !== '')
        .join(' ');

      onChange(formattedValue);

      // If a valid option (A, B, C, D) was entered, automatically move to the next question
      if (/^[A-D]$/.test(normalizedValue)) {
        // Use setTimeout to ensure the state has been updated
        setTimeout(() => {
          const nextIndex = index + 1;
          if (nextIndex < FIXED_NUM_QUESTIONS) {
            inputRefs.current[nextIndex]?.focus();
          }
        }, 0);
      }
    }
  };

  // Handle key press events
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Move to the next input if available
      const nextIndex = index + 1;
      if (nextIndex < FIXED_NUM_QUESTIONS) {
        inputRefs.current[nextIndex]?.focus();
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {answers.map((answer, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Label className="w-8 text-right font-medium text-app-blue-700">{index + 1}.</Label>
            <Input
              type="text"
              value={answer}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              ref={(el) => inputRefs.current[index] = el}
              className="w-12 text-center font-medium"
              maxLength={1}
              placeholder=""
              aria-label={`Answer for question ${index + 1}`}
            />
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground text-center mt-2">
        Enter only the option letter (A, B, C, or D) for each question.
      </div>
    </div>
  );
};

export default NumberedMCQAnswerEntry;
