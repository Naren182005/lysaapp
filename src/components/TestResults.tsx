import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Award, Home, RotateCcw } from "lucide-react";
import { MCQTestResult } from './OnlineMCQTest';
import { useUser } from '@/contexts/UserContext';

interface TestResultsProps {
  result: MCQTestResult;
  subject: string;
  onRetake: () => void;
  onHome: () => void;
}

const TestResults: React.FC<TestResultsProps> = ({ result, subject, onRetake, onHome }) => {
  const { user } = useUser();

  console.log('Rendering TestResults with result:', result);

  // Check if result is valid
  if (!result || !result.questions || !result.userAnswers) {
    console.error('Invalid test result:', result);
    return (
      <div className="w-full max-w-3xl mx-auto">
        <Card className="shadow-lg border-app-blue-100">
          <CardHeader className="bg-app-blue-50">
            <CardTitle className="text-lg text-app-blue-900">Error Loading Results</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-4">
            <p>There was an error loading your test results. Please try again.</p>
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
  }

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
            {/* Score summary */}
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

            <Separator />

            {/* Question review */}
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
    case 'Excellent':
      return 'bg-green-500 hover:bg-green-600';
    case 'Good':
      return 'bg-blue-500 hover:bg-blue-600';
    case 'Average':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'Fair':
      return 'bg-orange-500 hover:bg-orange-600';
    case 'Needs Improvement':
      return 'bg-red-500 hover:bg-red-600';
    default:
      return 'bg-slate-500 hover:bg-slate-600';
  }
}

export default TestResults;
