/**
 * MCQ Test UI Overview
 *
 * This file provides a comprehensive overview of the Online MCQ Test UI components
 * and their interactions. It combines the key parts of multiple files for easy reference.
 *
 * Main Components:
 * 1. MCQTestPage - The main page that orchestrates the test flow
 * 2. OnlineMCQTest - The core component that displays the actual MCQ test
 * 3. QuestionNavigationBox - Displays the question navigation sidebar
 * 4. DifficultySelector - Allows selecting difficulty distribution
 * 5. TestResults - Displays the test results after completion
 */

// ==================== Types and Interfaces ====================

// Define MCQ question type
interface MCQQuestion {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
  }[];
  difficulty: Difficulty;
  correctAnswer?: string; // Only available after submission
}

// Difficulty type used throughout the application
export type Difficulty = 'easy' | 'medium' | 'hard';

// ==================== MCQTest.tsx (Main Page) ====================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, XCircle, Award, Home, RotateCcw } from "lucide-react";
import MCQEvaluationTest from '@/components/mcq/MCQEvaluationTest';
import SubjectSelection from '@/components/forms/SubjectSelection';
import DomainSelection from '@/components/forms/DomainSelection';
import OnlineMCQTest from '@/components/mcq/OnlineMCQTest';
import TestResults from '@/components/evaluation/TestResults';
import { MCQTestResult } from '@/components/mcq/OnlineMCQTest';
import { useUser } from '@/contexts/UserContext';
import { useOnlineMode } from '@/contexts/OnlineModeContext';

// Define the steps of the online MCQ test flow
type TestStep = 'domain' | 'subject' | 'test' | 'results' | 'offline';

const MCQTestPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();
  const { isOnlineMode } = useOnlineMode();
  const [currentStep, setCurrentStep] = useState<TestStep>(isOnlineMode ? 'domain' : 'offline');

  // Update current step when online mode changes
  useEffect(() => {
    setCurrentStep(isOnlineMode ? 'domain' : 'offline');
  }, [isOnlineMode]);

  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [testResult, setTestResult] = useState<MCQTestResult | null>(null);

  // Handle domain selection
  const handleSelectDomain = (domainId: string) => {
    setSelectedDomain(domainId);
    setCurrentStep('subject');
  };

  // Handle subject selection
  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setCurrentStep('test');
  };

  // Handle test completion
  const handleTestComplete = (result: MCQTestResult) => {
    console.log('Test completed with result:', result);
    setTestResult(result);
    setCurrentStep('results');
  };

  // Handle retake test
  const handleRetakeTest = () => {
    setCurrentStep('test');
  };

  // Handle go to home
  const handleGoHome = () => {
    navigate('/');
  };

  // Render the appropriate component based on the current step
  const renderContent = () => {
    if (!isOnlineMode) {
      return <MCQEvaluationTest />;
    }

    switch (currentStep) {
      case 'domain':
        return (
          <DomainSelection
            onSelectDomain={handleSelectDomain}
            onBack={handleGoHome}
          />
        );
      case 'subject':
        return (
          <SubjectSelection
            domain={selectedDomain}
            onSelectSubject={handleSelectSubject}
            onBack={() => setCurrentStep('domain')}
          />
        );
      case 'test':
        return (
          <OnlineMCQTest
            subject={selectedSubject}
            onComplete={handleTestComplete}
            onBack={() => setCurrentStep('subject')}
          />
        );
      case 'results':
        return testResult ? (
          <TestResults
            result={testResult}
            subject={selectedSubject}
            onRetake={handleRetakeTest}
            onHome={handleGoHome}
          />
        ) : null;
      default:
        return <MCQEvaluationTest />;
    }
  };

  return (
    <div className="min-h-screen bg-app-blue-50/30 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoHome}
            className="text-muted-foreground hover:text-app-blue-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-app-blue-900 mb-8 text-center">
          {isOnlineMode ? 'Online MCQ Test' : 'MCQ Answer Evaluation Test'}
        </h1>

        {renderContent()}
      </div>
    </div>
  );
};

// ==================== OnlineMCQTest.tsx (Key Component) ====================
// This is a simplified version of the component showing the main structure

export interface MCQTestResult {
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  questions: MCQQuestion[];
  userAnswers: Record<string, string>;
}

interface OnlineMCQTestProps {
  subject: string;
  onComplete: (result: MCQTestResult) => void;
  onBack: () => void;
}

const OnlineMCQTest: React.FC<OnlineMCQTestProps> = ({ subject, onComplete }) => {
  // State variables for managing the test
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [difficultyCounts, setDifficultyCounts] = useState<{easy: number; medium: number; hard: number}>({
    easy: 3,
    medium: 4,
    hard: 3
  });
  const [questionsGenerated, setQuestionsGenerated] = useState<boolean>(false);
  const TOTAL_QUESTIONS = 10; // Total number of questions to generate

  // Main render function showing the test UI structure
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex gap-4">
        {/* Question Navigation Box and Difficulty Selector - Left Side */}
        <div className="hidden md:block w-48 sticky top-4 self-start">
          <QuestionNavigationBox
            totalQuestions={questions.length}
            currentQuestionIndex={currentQuestionIndex}
            userAnswers={userAnswers}
            onQuestionSelect={handleQuestionSelect}
            questions={questions}
          />

          {/* Difficulty Selector */}
          <DifficultySelector
            difficultyCounts={difficultyCounts}
            onDifficultyCountsChange={handleDifficultyCountsChange}
            totalQuestions={TOTAL_QUESTIONS}
          />
        </div>

        {/* Main Test Content - Right Side */}
        <div className="flex-1">
          <Card className="shadow-lg border-app-blue-100">
            <CardHeader className="bg-app-blue-50">
              {/* Test header with timer */}
            </CardHeader>

            <CardContent className="pt-6 pb-4">
              {/* Current question and options */}
              <RadioGroup
                value={userAnswers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
                className="space-y-3"
              >
                {currentQuestion.options.map((option) => (
                  <div key={option.id} className="flex items-start space-x-2 border p-3 rounded-md hover:bg-slate-50">
                    <RadioGroupItem value={option.id} id={`option-${option.id}`} className="mt-1" />
                    <Label htmlFor={`option-${option.id}`} className="flex-1 cursor-pointer break-words whitespace-normal">
                      <span className="font-medium mr-2 inline-block">{option.id}.</span>
                      <span className="inline-block">{option.text}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>

            <CardFooter className="flex justify-between p-4 bg-slate-50">
              {/* Navigation and submit buttons */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-app-teal-500 hover:bg-app-teal-600 font-medium px-6"
                size="lg"
              >
                Submit & View Results
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ==================== TestResults.tsx (Results Display) ====================
// Simplified version showing the main structure

interface TestResultsProps {
  result: MCQTestResult;
  subject: string;
  onRetake: () => void;
  onHome: () => void;
}

const TestResults: React.FC<TestResultsProps> = ({ result, subject, onRetake, onHome }) => {
  // Calculate performance metrics
  const percentageScore = Math.round(result.score);
  const performanceLevel = getPerformanceLevel(percentageScore);
  const performanceColor = getPerformanceColor(performanceLevel);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="shadow-lg border-app-blue-100">
        <CardHeader className="bg-app-blue-50">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-app-blue-900 flex items-center gap-2">
              <Award className="h-5 w-5" />
              Test Results
            </CardTitle>
            <Badge className={performanceColor}>
              {performanceLevel}
            </Badge>
          </div>
          <CardDescription>
            {subject} • {result.totalQuestions} questions • {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 pb-4">
          <div className="space-y-6">
            {/* Score summary with progress bar */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-app-blue-900">Your Score</h3>
                <span className="text-lg font-bold text-app-blue-700">
                  {result.correctAnswers}/{result.totalQuestions}
                </span>
              </div>
              <Progress value={percentageScore} className="h-2 mb-1" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>0%</span>
                <span>{percentageScore}%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Question review section */}
            <div>
              <h3 className="font-medium text-app-blue-900 mb-4">Question Review</h3>
              <div className="space-y-4">
                {result.questions.map((question) => {
                  const userAnswer = result.userAnswers[question.id] || '';
                  const isCorrect = userAnswer === question.correctAnswer;
                  const userOption = question.options.find(opt => opt.id === userAnswer);
                  const correctOption = question.options.find(opt => opt.id === question.correctAnswer);

                  return (
                    <div key={question.id} className="border rounded-md p-4">
                      <div className="flex items-start gap-2 mb-3">
                        {isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium">{question.question}</p>
                          {!isCorrect && userAnswer && (
                            <p className="text-sm text-red-600 mt-1">
                              Your answer: {userOption?.id}. {userOption?.text}
                            </p>
                          )}
                          <p className={`text-sm ${isCorrect ? 'text-green-600' : 'text-app-blue-700'} mt-1`}>
                            Correct answer: {correctOption?.id}. {correctOption?.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between p-4 bg-slate-50">
          <Button
            variant="outline"
            onClick={onHome}
            className="border-app-blue-200 text-app-blue-700 hover:bg-app-blue-50"
          >
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>

          <Button
            onClick={onRetake}
            className="bg-app-teal-500 hover:bg-app-teal-600"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Retake Test
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

// Helper functions
function getPerformanceLevel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Average';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
}

function getPerformanceColor(level: string): string {
  switch (level) {
    case 'Excellent': return 'bg-green-500 hover:bg-green-600';
    case 'Good': return 'bg-blue-500 hover:bg-blue-600';
    case 'Average': return 'bg-yellow-500 hover:bg-yellow-600';
    case 'Fair': return 'bg-orange-500 hover:bg-orange-600';
    case 'Needs Improvement': return 'bg-red-500 hover:bg-red-600';
    default: return 'bg-slate-500 hover:bg-slate-600';
  }
}

// ==================== QuestionNavigationBox.tsx ====================

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
            <Button
              key={question.id}
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
          );
        })}
      </div>

      {/* Legend for status and difficulty indicators */}
      <div className="mt-3 pt-2 border-t border-slate-100">
        <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
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

// ==================== DifficultySelector.tsx ====================

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
            <Label htmlFor="easy-count" className="text-green-700">
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
            className={isValidTotal ? 'border-green-300' : 'border-red-300'}
          />
        </div>

        {/* Medium Questions */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="medium-count" className="text-yellow-700">
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
            className={isValidTotal ? 'border-yellow-300' : 'border-red-300'}
          />
        </div>

        {/* Hard Questions */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="hard-count" className="text-red-700">
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
            className={isValidTotal ? 'border-red-300' : 'border-red-300'}
          />
        </div>

        {!isValidTotal && (
          <div className="text-xs text-red-500 mt-1">
            Total must equal {totalQuestions} questions
          </div>
        )}
      </div>
    </div>
  );
};
