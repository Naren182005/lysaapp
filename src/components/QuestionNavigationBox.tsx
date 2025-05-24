import React from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, HelpCircle } from "lucide-react";

// Import the Difficulty type
import { Difficulty } from './DifficultySelector';

interface QuestionNavigationBoxProps {
  totalQuestions: number;
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  onQuestionSelect: (index: number) => void;
  questions: Array<{ id: string; difficulty?: Difficulty }>;
}

const QuestionNavigationBox: React.FC<QuestionNavigationBoxProps> = ({
  totalQuestions,
  currentQuestionIndex,
  userAnswers,
  onQuestionSelect,
  questions
}) => {
  // Calculate stats
  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="bg-white border border-app-blue-100 rounded-md p-3 shadow-sm">
      <div className="mb-2">
        <h3 className="text-sm font-medium text-app-blue-900 mb-1">Question Navigator</h3>
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 px-1.5 py-0">
              {answeredCount}
            </Badge>
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 px-1.5 py-0">
              {unansweredCount}
            </Badge>
            <span>Remaining</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 md:grid-cols-3 lg:grid-cols-4">
        {questions.map((question, index) => {
          const isAnswered = userAnswers[question.id] !== undefined;
          const isCurrent = index === currentQuestionIndex;
          const difficulty = question.difficulty;

          // Get difficulty-based styling
          const getDifficultyStyles = () => {
            if (!difficulty) return {};

            switch (difficulty) {
              case 'easy':
                return {
                  border: 'border-green-300',
                  bg: 'bg-green-50',
                  text: 'text-green-700',
                  ring: 'ring-green-300',
                  indicator: 'bg-green-500'
                };
              case 'medium':
                return {
                  border: 'border-yellow-300',
                  bg: 'bg-yellow-50',
                  text: 'text-yellow-700',
                  ring: 'ring-yellow-300',
                  indicator: 'bg-yellow-500'
                };
              case 'hard':
                return {
                  border: 'border-red-300',
                  bg: 'bg-red-50',
                  text: 'text-red-700',
                  ring: 'ring-red-300',
                  indicator: 'bg-red-500'
                };
              default:
                return {};
            }
          };

          const diffStyles = getDifficultyStyles();

          return (
            <TooltipProvider key={question.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`w-8 h-8 p-0 flex items-center justify-center text-xs font-medium
                      ${isCurrent ? 'border-app-blue-500 bg-app-blue-50 text-app-blue-700 ring-1 ring-app-blue-500' : ''}
                      ${isAnswered && !isCurrent ? 'border-green-200 bg-green-50 text-green-700' : ''}
                      ${!isAnswered && !isCurrent && !difficulty ? 'border-slate-200 bg-slate-50 text-slate-700' : ''}
                      ${!isAnswered && !isCurrent && difficulty ? `${diffStyles.border} ${diffStyles.bg} ${diffStyles.text}` : ''}
                    `}
                    onClick={() => onQuestionSelect(index)}
                  >
                    {index + 1}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  <p>Question {index + 1}</p>
                  {difficulty && (
                    <p className={`font-medium ${diffStyles.text}`}>
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    {isAnswered ? 'Answered' : 'Not answered'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100">
        <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
          {/* Status indicators */}
          <div className="mb-1">
            <p className="font-medium text-app-blue-800 mb-1">Status:</p>
            <div className="grid grid-cols-1 gap-1 pl-1">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <span>Not answered</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-app-blue-500"></div>
                <span>Current</span>
              </div>
            </div>
          </div>

          {/* Difficulty indicators */}
          <div className="mt-2">
            <p className="font-medium text-app-blue-800 mb-1">Difficulty:</p>
            <div className="grid grid-cols-1 gap-1 pl-1">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-green-700">Easy</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-yellow-700">Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-red-700">Hard</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionNavigationBox;
