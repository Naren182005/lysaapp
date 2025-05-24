
import React from 'react';
import { Button } from "@/components/ui/button";

interface QuestionTypeToggleProps {
  onQuestionTypeChange: (type: 'essay' | 'mcq') => void;
  currentType: 'essay' | 'mcq';
}

const QuestionTypeToggle: React.FC<QuestionTypeToggleProps> = ({
  onQuestionTypeChange,
  currentType
}) => {
  return (
    <div className="flex justify-start items-center mb-4">
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={currentType === 'mcq' ? "bg-app-teal-500 text-white hover:bg-app-teal-600" : ""}
          onClick={() => onQuestionTypeChange('mcq')}
        >
          MCQ Question
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={currentType === 'essay' ? "bg-app-teal-500 text-white hover:bg-app-teal-600" : ""}
          onClick={() => onQuestionTypeChange('essay')}
        >
          Essay Question
        </Button>
      </div>
    </div>
  );
};

export default QuestionTypeToggle;
