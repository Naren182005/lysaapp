
import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EvaluationResult } from "@/types";
import { Check, X, Printer, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/accessible-toast";

/**
 * Helper function to get a performance label based on percentage
 */
const getPerformanceLabel = (percentage: number): 'Poor' | 'Average' | 'Good' | 'Excellent' => {
  if (percentage >= 85) {
    return 'Excellent';
  } else if (percentage >= 70) {
    return 'Good';
  } else if (percentage >= 50) {
    return 'Average';
  } else {
    return 'Poor';
  }
};

interface ResultsDisplayProps {
  result: EvaluationResult;
  totalMarks: number;
  onReset: () => void;
  onBack?: () => void;
  studentName?: string;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  result,
  totalMarks,
  onReset,
  onBack,
  studentName = "Student"
}) => {
  // Log the received props for debugging
  console.log("ResultsDisplay received props:", { result, totalMarks });

  // Validate the result object
  if (!result || typeof result !== 'object') {
    console.error("Invalid result object:", result);
    return (
      <Card className="border-red-200 shadow-lg">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold text-red-600 mb-4">Invalid Results Data</h3>
            <p className="text-muted-foreground mb-6">
              The evaluation result data is invalid. Please try again.
            </p>
            <Button onClick={onReset} className="bg-app-blue-500 hover:bg-app-blue-600">
              Start New Evaluation
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Validate required properties
  if (result.marksAwarded === undefined || !result.performanceLabel || !result.feedbackSummary) {
    console.error("Result object missing required properties:", result);
    return (
      <Card className="border-red-200 shadow-lg">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold text-red-600 mb-4">Incomplete Results Data</h3>
            <p className="text-muted-foreground mb-6">
              The evaluation result is missing required properties. Please try again.
            </p>
            <Button onClick={onReset} className="bg-app-blue-500 hover:bg-app-blue-600">
              Start New Evaluation
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ensure marksAwarded is a valid number
  const marksAwarded = typeof result.marksAwarded === 'number' && !isNaN(result.marksAwarded)
    ? result.marksAwarded
    : 0;

  // Calculate percentage with validation
  const percentage = totalMarks > 0
    ? Math.round((marksAwarded / totalMarks) * 100)
    : 0;

  // Final validation to ensure percentage is a valid number
  const validPercentage = !isNaN(percentage) ? percentage : 0;

  console.log("Calculated percentage:", validPercentage);

  // Dismiss any lingering toasts when the results component mounts
  useEffect(() => {
    // Ensure all toasts are dismissed when results are displayed
    // Use a small delay to ensure any pending toasts are also dismissed
    const dismissToasts = () => {
      toast.dismiss(); // First immediate dismiss

      // Second dismiss with a small delay to catch any pending toasts
      setTimeout(() => {
        toast.dismiss();
        console.log("All toasts dismissed by ResultsDisplay");
      }, 100);
    };

    dismissToasts();

    // Also dismiss toasts when component unmounts
    return () => {
      toast.dismiss();
    };
  }, []);

  let gradeColor = "text-app-blue-500";
  let progressColor = "bg-app-blue-500";

  if (validPercentage >= 80) {
    gradeColor = "text-green-500";
    progressColor = "bg-green-500";
  } else if (validPercentage >= 60) {
    gradeColor = "text-amber-500";
    progressColor = "bg-amber-500";
  } else if (validPercentage < 40) {
    gradeColor = "text-red-500";
    progressColor = "bg-red-500";
  }

  return (
    <Card className="border-app-teal-100 shadow-lg animate-fade-in">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold text-app-blue-900 mb-2 text-center">Evaluation Results</h2>
        {studentName && (
          <p className="text-center text-muted-foreground mb-6">
            Student: <span className="font-medium">{studentName}</span>
          </p>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground font-medium">Score</span>
            <span className={`text-2xl font-bold ${gradeColor}`}>
              {marksAwarded}/{totalMarks} ({validPercentage}%)
            </span>
          </div>
          <Progress value={validPercentage} className={`h-3 ${progressColor}`} />
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
            <h3 className="font-medium text-app-blue-800 mb-3 flex items-center">
              Performance: <span className={`ml-2 ${gradeColor} font-semibold`}>
                {validPercentage === 100 ? 'Good' : (result.performanceLabel || getPerformanceLabel(validPercentage))}
              </span>
            </h3>
          </div>

          <div>
            <h3 className="font-medium text-app-blue-800 mb-3">Feedback</h3>
            <ul className="space-y-2">
              {validPercentage === 100 ? (
                <li className="text-sm text-muted-foreground bg-green-50 p-3 rounded-md border border-green-100 flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">•</span>
                  Good
                </li>
              ) : (
                (Array.isArray(result.feedbackSummary) ? result.feedbackSummary :
                  (typeof result.feedbackSummary === 'string' ? [result.feedbackSummary] : ["Feedback not available"]))
                  .map((feedback, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-100 flex items-start">
                      <span className="text-app-blue-500 mr-2 mt-0.5">•</span>
                      {feedback}
                    </li>
                  ))
              )}


            </ul>
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t bg-muted/30 py-4">
        <div className="w-full flex gap-3">
          {onBack && (
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1 border-app-blue-200 hover:bg-app-blue-50 hover:border-app-blue-300"
            >
              <ArrowLeft size={18} className="mr-2" /> Back
            </Button>
          )}
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="flex-1 border-app-blue-200 hover:bg-app-blue-50 hover:border-app-blue-300"
          >
            <Printer size={18} className="mr-2" /> Print Results
          </Button>
          <Button
            onClick={onReset}
            className="flex-1 bg-app-blue-500 hover:bg-app-blue-600 shadow-md"
          >
            <RefreshCw size={18} className="mr-2" /> New Evaluation
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ResultsDisplay;
