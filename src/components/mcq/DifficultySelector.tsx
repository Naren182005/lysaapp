import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export type Difficulty = 'easy' | 'medium' | 'hard';

interface DifficultySelectorProps {
  difficultyCounts: {
    easy: number;
    medium: number;
    hard: number;
  };
  onDifficultyCountsChange: (counts: { easy: number; medium: number; hard: number }) => void;
  totalQuestions: number;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  difficultyCounts,
  onDifficultyCountsChange,
  totalQuestions
}) => {
  // Track the current input values
  const [easyCount, setEasyCount] = useState<number>(difficultyCounts.easy);
  const [mediumCount, setMediumCount] = useState<number>(difficultyCounts.medium);
  const [hardCount, setHardCount] = useState<number>(difficultyCounts.hard);

  // Calculate the current total
  const currentTotal = easyCount + mediumCount + hardCount;

  // Check if the total is valid
  const isValidTotal = currentTotal === totalQuestions;

  // Update parent component when counts change, but only when the total is valid
  // and only when the values have actually changed
  useEffect(() => {
    if (isValidTotal) {
      // Check if the current values are different from the props
      const hasChanged =
        easyCount !== difficultyCounts.easy ||
        mediumCount !== difficultyCounts.medium ||
        hardCount !== difficultyCounts.hard;

      if (hasChanged) {
        onDifficultyCountsChange({
          easy: easyCount,
          medium: mediumCount,
          hard: hardCount
        });
      }
    }
  }, [easyCount, mediumCount, hardCount, isValidTotal, difficultyCounts, onDifficultyCountsChange]);

  // Handle input changes with validation
  const handleInputChange = (difficulty: Difficulty, value: string) => {
    // Convert to number and ensure it's not negative
    const numValue = Math.max(0, parseInt(value) || 0);

    switch (difficulty) {
      case 'easy':
        setEasyCount(numValue);
        break;
      case 'medium':
        setMediumCount(numValue);
        break;
      case 'hard':
        setHardCount(numValue);
        break;
    }
  };

  // Get difficulty styling information
  const getDifficultyStyles = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return {
          label: 'Easy',
          color: 'bg-green-500',
          borderColor: 'focus:border-green-500',
          textColor: 'text-green-700',
          badgeColor: 'bg-green-50 text-green-700 border-green-200',
          inputBorder: isValidTotal ? 'border-green-300' : 'border-red-300',
          labelColor: 'text-green-700'
        };
      case 'medium':
        return {
          label: 'Medium',
          color: 'bg-yellow-500',
          borderColor: 'focus:border-yellow-500',
          textColor: 'text-yellow-700',
          badgeColor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          inputBorder: isValidTotal ? 'border-yellow-300' : 'border-red-300',
          labelColor: 'text-yellow-700'
        };
      case 'hard':
        return {
          label: 'Hard',
          color: 'bg-red-500',
          borderColor: 'focus:border-red-500',
          textColor: 'text-red-700',
          badgeColor: 'bg-red-50 text-red-700 border-red-200',
          inputBorder: isValidTotal ? 'border-red-300' : 'border-red-300',
          labelColor: 'text-red-700'
        };
      default:
        return {
          label: 'Medium',
          color: 'bg-yellow-500',
          borderColor: 'focus:border-yellow-500',
          textColor: 'text-yellow-700',
          badgeColor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          inputBorder: isValidTotal ? 'border-yellow-300' : 'border-red-300',
          labelColor: 'text-yellow-700'
        };
    }
  };

  return (
    <div className="bg-white border border-app-blue-100 rounded-md p-3 shadow-sm mt-3">
      <h3 className="text-sm font-medium text-app-blue-900 mb-2">Question Distribution</h3>

      {/* Total questions indicator */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-app-blue-800">Total Questions:</span>
        <Badge variant={isValidTotal ? "outline" : "destructive"} className={isValidTotal ? "bg-blue-50 text-blue-700" : ""}>
          {currentTotal}/{totalQuestions}
        </Badge>
      </div>

      {/* Difficulty Input Boxes */}
      <div className="space-y-3 mb-4">
        {/* Easy Questions */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="easy-count" className={getDifficultyStyles('easy').labelColor}>
              Easy Questions
            </Label>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <Input
            id="easy-count"
            type="number"
            min="0"
            max={totalQuestions}
            value={easyCount}
            onChange={(e) => handleInputChange('easy', e.target.value)}
            className={`${getDifficultyStyles('easy').inputBorder} ${getDifficultyStyles('easy').borderColor}`}
          />
        </div>

        {/* Medium Questions */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="medium-count" className={getDifficultyStyles('medium').labelColor}>
              Medium Questions
            </Label>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          </div>
          <Input
            id="medium-count"
            type="number"
            min="0"
            max={totalQuestions}
            value={mediumCount}
            onChange={(e) => handleInputChange('medium', e.target.value)}
            className={`${getDifficultyStyles('medium').inputBorder} ${getDifficultyStyles('medium').borderColor}`}
          />
        </div>

        {/* Hard Questions */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="hard-count" className={getDifficultyStyles('hard').labelColor}>
              Hard Questions
            </Label>
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
          </div>
          <Input
            id="hard-count"
            type="number"
            min="0"
            max={totalQuestions}
            value={hardCount}
            onChange={(e) => handleInputChange('hard', e.target.value)}
            className={`${getDifficultyStyles('hard').inputBorder} ${getDifficultyStyles('hard').borderColor}`}
          />
        </div>

        {!isValidTotal && (
          <div className="text-xs text-red-500 mt-1">
            Total must equal {totalQuestions} questions
          </div>
        )}
      </div>

      {/* Difficulty Descriptions */}
      <div className="mt-3 pt-2 border-t border-slate-100">
        <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0"></div>
            <div className="break-words whitespace-normal pr-2">
              Easy - Basic concepts and straightforward questions
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mt-1 flex-shrink-0"></div>
            <div className="break-words whitespace-normal pr-2">
              Medium - Moderate complexity requiring deeper understanding
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 mt-1 flex-shrink-0"></div>
            <div className="break-words whitespace-normal pr-2">
              Hard - Advanced concepts and challenging problems
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DifficultySelector;
