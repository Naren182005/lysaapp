import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { evaluateAnswer } from '@/utils/evaluationService';
import { EvaluationResult } from '@/types';
import ResultsDisplay from './ResultsDisplay';
import { toast } from "@/components/ui/accessible-toast";
import { LayoutGrid, LayoutList } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';

const MCQEvaluationTest: React.FC = () => {
  const isMobile = useIsMobile();
  const [modelAnswer, setModelAnswer] = useState<string>('1A 2B 3C 4D');
  const [studentAnswer, setStudentAnswer] = useState<string>('1 a 2 b 3 c 4 d');
  const [totalMarks, setTotalMarks] = useState<number>(4);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [isHorizontalFormat, setIsHorizontalFormat] = useState<boolean>(false);

  const handleEvaluate = async () => {
    if (!modelAnswer || !studentAnswer) {
      toast.error("Both model answer and student answer are required");
      return;
    }

    setIsEvaluating(true);
    toast.loading("Evaluating MCQ answers...");

    try {
      // Use a dummy question text since we're just testing MCQ evaluation
      const result = await evaluateAnswer(
        "MCQ Test Question",
        totalMarks,
        modelAnswer,
        studentAnswer
      );

      console.log("MCQ Evaluation Result:", result);

      // Dismiss any lingering toasts
      toast.dismiss();

      if (result) {
        setEvaluationResult(result);
        setShowResults(true);
        toast.success("Evaluation complete!");
      } else {
        toast.error("Evaluation failed", {
          description: "No result was returned from the evaluation service."
        });
      }
    } catch (error) {
      console.error("Error evaluating MCQ answers:", error);
      toast.error("Evaluation failed", {
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetTest = () => {
    setShowResults(false);
    setEvaluationResult(null);
  };

  // Function to convert between vertical and horizontal formats
  const convertAnswerFormat = (text: string, toHorizontal: boolean): string => {
    if (!text.trim()) return text;

    if (toHorizontal) {
      // Convert from vertical to horizontal format
      // Replace newlines with spaces
      return text.replace(/\n+/g, ' ').trim();
    } else {
      // Convert from horizontal to vertical format
      // Add a newline after each MCQ answer
      return text
        .replace(/(\d+\s*[A-Da-d])\s+/g, '$1\n') // Add newline after MCQ answers like "1A "
        .trim();
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      {!showResults ? (
        <Card className="border-app-teal-100 shadow-lg">
          <CardHeader className="bg-app-blue-50">
            <CardTitle className="text-app-blue-800">MCQ Evaluation Test</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-app-blue-800">Answer Comparison</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-app-blue-700 hover:bg-app-blue-50 border-app-blue-200"
                onClick={() => {
                  // Convert both model answer and student answer to the new format
                  const newIsHorizontal = !isHorizontalFormat;
                  setIsHorizontalFormat(newIsHorizontal);

                  // Convert model answer
                  const newModelAnswer = convertAnswerFormat(modelAnswer, newIsHorizontal);
                  setModelAnswer(newModelAnswer);

                  // Convert student answer
                  const newStudentAnswer = convertAnswerFormat(studentAnswer, newIsHorizontal);
                  setStudentAnswer(newStudentAnswer);
                }}
              >
                {isHorizontalFormat ? (
                  <>
                    <LayoutList size={16} />
                    <span>Change Vertical</span>
                  </>
                ) : (
                  <>
                    <LayoutGrid size={16} />
                    <span>Change Horizontal</span>
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modelAnswer">Model Answer</Label>
                <Textarea
                  id="modelAnswer"
                  placeholder="Enter model answers (e.g., '1A 2B 3C 4D')"
                  value={modelAnswer}
                  onChange={(e) => setModelAnswer(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Format: Question number followed by correct option (A, B, C, or D)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentAnswer">Student Answer</Label>
                <Textarea
                  id="studentAnswer"
                  placeholder="Enter student answers (e.g., '1 A 2 B 3 C 4 D')"
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Format: Question number followed by selected option (A, B, C, or D)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalMarks" className="flex items-center">
                <span>Total Marks</span>
                <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  Manually set
                </span>
              </Label>
              <Input
                id="totalMarks"
                type="number"
                min="1"
                value={totalMarks}
                onChange={(e) => setTotalMarks(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                This value will be used regardless of the number of questions
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t p-4 bg-app-blue-50">
            <div className="flex gap-3 w-full justify-end">
              <Button
                variant="outline"
                className="border-app-blue-300 hover:bg-app-blue-50"
                onClick={() => {
                  setModelAnswer('1A 2B 3C 4D');
                  setStudentAnswer('1 a 2 b 3 c 4 d');
                  setTotalMarks(4);
                }}
              >
                Reset
              </Button>
              <Button
                className="bg-app-teal-500 hover:bg-app-teal-600"
                onClick={handleEvaluate}
                disabled={isEvaluating}
              >
                {isEvaluating ? "Evaluating..." : "Evaluate MCQ Answers"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      ) : (
        evaluationResult && (
          <ResultsDisplay
            result={evaluationResult}
            totalMarks={totalMarks}
            onReset={resetTest}
            studentName="Test Student"
          />
        )
      )}
    </div>
  );
};

export default MCQEvaluationTest;
