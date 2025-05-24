
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EvaluationResult } from "@/types";
import { evaluateMCQAnswer, generateMCQOptions } from "@/utils/evaluationServices";
import { formatMCQQuestion } from "@/utils/questionUtils";
import { toast } from "@/components/ui/sonner";
import { Loader2, CheckCircle, FileText } from "lucide-react";

interface MCQEvaluationFormProps {
  questionText: string;
  questionImageUrl: string;
  studentAnswerText: string;
  answerImageUrl: string;
  onEvaluationComplete: (result: EvaluationResult) => void;
  onQuestionTypeChange: (type: 'essay' | 'mcq') => void;
}

const MCQEvaluationForm: React.FC<MCQEvaluationFormProps> = ({
  questionText,
  questionImageUrl,
  studentAnswerText,
  answerImageUrl,
  onEvaluationComplete,
  onQuestionTypeChange
}) => {
  const [question, setQuestion] = useState({
    text: questionText || '',
    totalMarks: 1,
    options: ['', '', '', ''],
    correctOption: 0
  });

  const [studentOption, setStudentOption] = useState<number>(0);
  const [isGeneratingOptions, setIsGeneratingOptions] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    if (questionText) {
      // Format MCQ questions for better display
      const formattedText = formatMCQQuestion(questionText);
      setQuestion(prev => ({ ...prev, text: formattedText }));
    }
  }, [questionText]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuestion(prev => ({
      ...prev,
      [name]: name === 'totalMarks' ? Number(value) : value
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[index] = value;
    setQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const handleCorrectOptionChange = (value: string) => {
    setQuestion(prev => ({ ...prev, correctOption: parseInt(value) }));
  };

  const handleStudentOptionChange = (value: string) => {
    setStudentOption(parseInt(value));
  };

  const handleGenerateOptions = async () => {
    if (!question.text) {
      toast.error("Please enter a question text first");
      return;
    }

    setIsGeneratingOptions(true);
    try {
      const options = await generateMCQOptions(question.text);
      setQuestion(prev => ({ ...prev, options: options }));
      toast.success("Options generated successfully!");
    } catch (error) {
      console.error("Error generating options:", error);
      toast.error("Failed to generate options");
    } finally {
      setIsGeneratingOptions(false);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.text || question.options.some(opt => !opt)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsEvaluating(true);

    try {
      const result = await evaluateMCQAnswer(
        question.text,
        question.totalMarks,
        question.correctOption,
        studentOption
      );

      onEvaluationComplete(result);
      toast.success("Evaluation complete!");
    } catch (error) {
      console.error("Evaluation error:", error);
      toast.error("Failed to evaluate answer");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <Card className="overflow-hidden shadow-lg border-app-teal-100">
      <form onSubmit={handleEvaluate} className="p-6">
        <div className="space-y-5">
          <h2 className="font-semibold text-xl text-app-blue-900 mb-2 flex items-center">
            <CheckCircle size={20} className="mr-2 text-app-teal-600" />
            MCQ Question Evaluation
          </h2>

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${question.options.some(opt => opt) ? 'bg-app-teal-500 text-white hover:bg-app-teal-600' : 'bg-transparent'}`}
                onClick={() => onQuestionTypeChange('mcq')}
              >
                MCQ Question
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onQuestionTypeChange('essay')}
              >
                Essay Question
              </Button>
            </div>

            {questionImageUrl && (
              <Button
                type="button"
                variant="link"
                className="text-app-teal-600 hover:text-app-teal-700 p-0 h-auto"
                onClick={() => window.open(questionImageUrl, '_blank')}
              >
                View Scanned Question
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="question-text" className="text-app-blue-800">Question Text</Label>
            <Textarea
              id="question-text"
              name="text"
              value={question.text}
              onChange={handleInputChange}
              placeholder="Enter the MCQ question..."
              className="min-h-[80px] focus:border-app-teal-300"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="options" className="text-app-blue-800">Options</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateOptions}
                disabled={isGeneratingOptions}
                className="text-app-blue-600"
              >
                {isGeneratingOptions ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Options
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {question.options.map((option, index) => (
                <div key={index} className="space-y-1">
                  <Label htmlFor={`option-${index}`} className="text-sm text-muted-foreground">
                    Option {String.fromCharCode(65 + index)}
                  </Label>
                  <Input
                    id={`option-${index}`}
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Enter option ${String.fromCharCode(65 + index)}...`}
                    className="focus:border-app-teal-300"
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="correct-option" className="text-app-blue-800">Correct Answer</Label>
            <RadioGroup
              value={question.correctOption.toString()}
              onValueChange={handleCorrectOptionChange}
              className="grid grid-cols-1 md:grid-cols-2 gap-2"
            >
              {question.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={index.toString()} id={`correct-${index}`} />
                  <Label htmlFor={`correct-${index}`} className="text-sm">
                    Option {String.fromCharCode(65 + index)}: {option || `(Option ${String.fromCharCode(65 + index)})`}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total-marks" className="text-app-blue-800">Total Marks</Label>
            <Input
              id="total-marks"
              name="totalMarks"
              type="number"
              value={question.totalMarks}
              onChange={handleInputChange}
              min="1"
              max="10"
              className="focus:border-app-teal-300"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-option" className="text-app-blue-800">Student's Answer</Label>
            {answerImageUrl && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="text-app-teal-600 hover:text-app-teal-700 p-0 h-auto"
                  onClick={() => window.open(answerImageUrl, '_blank')}
                >
                  View Scanned Answer
                </Button>
              </div>
            )}
            <RadioGroup
              value={studentOption.toString()}
              onValueChange={handleStudentOptionChange}
              className="grid grid-cols-1 md:grid-cols-2 gap-2"
            >
              {question.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/30">
                  <RadioGroupItem value={index.toString()} id={`student-${index}`} />
                  <Label htmlFor={`student-${index}`} className="text-sm cursor-pointer w-full">
                    Option {String.fromCharCode(65 + index)}: {option || `(Option ${String.fromCharCode(65 + index)})`}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button
            type="submit"
            className="w-full bg-app-teal-500 hover:bg-app-teal-600 transition-all duration-300 shadow-md"
            disabled={isEvaluating}
          >
            {isEvaluating ?
              "Evaluating..." :
              <span className="flex items-center gap-2"><CheckCircle size={18} /> Evaluate Answer</span>
            }
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default MCQEvaluationForm;
