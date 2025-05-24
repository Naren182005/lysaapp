import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart, ChevronRight, CheckCircle, Star } from "lucide-react";
import { HandwritingAnalysisResult, EvaluationResult } from '@/types';

interface HandwritingStatisticsProps {
  imageUrl: string;
  handwritingResult: HandwritingAnalysisResult;
  evaluationResult: EvaluationResult | null;
  totalMarks: number;
  onContinue: () => void;
}

const HandwritingStatistics: React.FC<HandwritingStatisticsProps> = ({
  imageUrl,
  handwritingResult,
  evaluationResult,
  totalMarks,
  onContinue
}) => {
  // No helper functions needed for handwriting grade since it's been removed

  return (
    <Card className="shadow-md border-app-teal-100">
      <CardHeader className="bg-app-teal-50 pb-4">
        <CardTitle className="text-lg text-app-blue-900 flex items-center gap-2">
          <BarChart className="h-5 w-5 text-app-teal-600" />
          Results
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Main content with centered layout */}
        <div className="flex flex-col items-center max-w-3xl mx-auto">
          {/* Top section with evaluation mark and image in a row on larger screens */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Evaluation Mark */}
            {evaluationResult && (
              <div className="bg-green-50 p-5 rounded-lg border border-green-100 shadow-sm flex flex-col items-center justify-center h-full">
                <div className="mb-3 flex items-center">
                  <Star className="h-5 w-5 text-yellow-500 mr-2" />
                  <h3 className="text-green-800 font-medium">Evaluation Result</h3>
                </div>
                <div className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 text-white mb-3 shadow-md">
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold">{evaluationResult.marksAwarded}</span>
                    <span className="text-xs">/{totalMarks}</span>
                  </div>
                </div>
                <p className="text-sm text-black">
                  Score: <span className="font-semibold text-green-700">{Math.round((evaluationResult.marksAwarded / totalMarks) * 100)}%</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Performance: {evaluationResult.performanceLabel}
                </p>
              </div>
            )}

            {/* Handwriting Sample */}
            <div className="border rounded-lg overflow-hidden bg-black shadow-sm h-full flex items-center justify-center">
              <img
                src={imageUrl}
                alt="Handwriting sample"
                className="w-full h-auto object-contain max-h-48"
              />
            </div>
          </div>

          {/* Performance section - centered and enhanced */}
          {evaluationResult && (
            <div className="w-full bg-green-50 p-5 rounded-lg border border-green-100 mb-6 shadow-sm">
              <div className="flex items-center justify-center mb-3">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="font-medium text-green-800 text-lg">Performance: <span className="font-semibold">{evaluationResult.performanceLabel}</span></h3>
              </div>

              <div className="max-w-xl mx-auto">
                <h4 className="text-sm font-medium text-green-700 mb-2 text-center">Feedback:</h4>
                <ul className="space-y-2">
                  {(evaluationResult.feedbackSummary || []).map((feedback, idx) => (
                    <li key={`feedback-${idx}`} className="flex items-start gap-2 text-sm bg-white p-2 rounded border border-green-50">
                      <span className="text-green-600 mt-0.5 flex-shrink-0">•</span>
                      <span className="text-black">{feedback}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}



          {/* Continue Button */}
          <Button
            onClick={() => {
              console.log("Continue to Results clicked, evaluationResult:", evaluationResult);
              onContinue();
            }}
            className="bg-app-teal-500 hover:bg-app-teal-600 mt-2 px-8 py-2 shadow-md"
          >
            Continue to Results
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default HandwritingStatistics;
