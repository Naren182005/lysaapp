
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ScanCamera from '@/components/camera/ScanCamera';
import QuestionPaperScanner from '@/components/evaluation/QuestionPaperScanner';
import ManualAnswerEntry from '@/components/evaluation/ManualAnswerEntry';
import EvaluationForm from '@/components/evaluation/EvaluationForm';
import ResultsDisplay from '@/components/evaluation/ResultsDisplay';
import EvaluationDemo from '@/components/evaluation/EvaluationDemo';
import HandwritingAnalysis from '@/components/analysis/HandwritingAnalysis';
import HandwritingStatistics from '@/components/analysis/HandwritingStatistics';
import OnlineOfflineToggle from '@/components/navigation/OnlineOfflineToggle';

import MainNavigation from '@/components/navigation/MainNavigation';
import { AppStep, EvaluationResult, HandwritingAnalysisResult } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScanText, FileText, CheckCircle, PenTool, AlertTriangle, Send, RefreshCw, LogIn } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { analyzeHandwriting } from '@/utils/evaluationService';
import { handleAsyncError } from '@/utils/errorHandling';
import { toast } from '@/components/ui/accessible-toast';
import ErrorBoundary from '@/components/layout/ErrorBoundary';
import { useUser } from '@/contexts/UserContext';
import { useOnlineMode } from '@/contexts/OnlineModeContext';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, addEvaluation } = useUser();
  const { isOnlineMode, toggleOnlineMode } = useOnlineMode();

  const [currentStep, setCurrentStep] = useState<AppStep>('scanQuestion');
  const [questionText, setQuestionText] = useState('');
  const [questionImageUrl, setQuestionImageUrl] = useState('');
  const [modelAnswer, setModelAnswer] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [answerImageUrl, setAnswerImageUrl] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [handwritingResult, setHandwritingResult] = useState<HandwritingAnalysisResult | null>(null);
  const [isAnalyzingHandwriting, setIsAnalyzingHandwriting] = useState(false);
  const [totalMarks, setTotalMarks] = useState(10);
  const [studentName, setStudentName] = useState('');

  // Track which steps have been completed
  const [stepsCompleted, setStepsCompleted] = useState({
    scanQuestion: false,
    manualAnswer: false,
    scanAnswer: false,
    evaluate: false,
    handwritingStats: false,
    results: false
  });

  const handleQuestionCapture = (
    text: string,
    imageUrl: string,
    generatedModelAnswer: string,
    questions?: any[],
    modelAnswers?: string[],
    generateAIAnswers?: boolean
  ) => {
    setQuestionText(text);
    setQuestionImageUrl(imageUrl);
    setModelAnswer(generatedModelAnswer);

    // We're not automatically calculating total marks anymore
    // The user will manually set the total marks in the evaluation form
    console.log(`Using manually set total marks for ${questions ? questions.length : 0} questions`);

    setStepsCompleted(prev => ({ ...prev, scanQuestion: true }));

    // If generateAIAnswers is true and we have a model answer, skip the manual answer step
    if (generateAIAnswers && generatedModelAnswer && generatedModelAnswer.trim() !== '') {
      setStepsCompleted(prev => ({ ...prev, manualAnswer: true }));
      setCurrentStep('scanAnswer');
      toast.success("AI-generated answers ready", {
        description: "Proceeding to scan answer sheet"
      });
    } else {
      // Otherwise, go to manual answer step
      setCurrentStep('manualAnswer');
      if (!generateAIAnswers) {
        toast.info("Manual answer entry required", {
          description: "AI Generate was turned off"
        });
      }
    }
  };

  const handleManualAnswerComplete = (manualModelAnswer: string) => {
    console.log("Manual answer complete, received model answer:", manualModelAnswer);
    setModelAnswer(manualModelAnswer);
    setStepsCompleted(prev => ({ ...prev, manualAnswer: true }));
    // Now proceed to scanning the answer sheet
    setCurrentStep('scanAnswer');
    toast.info("Ready to scan student answer", {
      description: "Please scan the student's handwritten answer sheet"
    });
  };

  const handleAnswerCapture = async (text: string, imageUrl: string) => {
    console.log("Answer capture complete, received text:", text);
    console.log("Answer image URL:", imageUrl);
    setAnswerText(text);
    setAnswerImageUrl(imageUrl);
    setStepsCompleted(prev => ({ ...prev, scanAnswer: true }));

    // Start handwriting analysis
    setIsAnalyzingHandwriting(true);
    toast.loading("Analyzing handwriting...");

    const [result, error] = await handleAsyncError(
      analyzeHandwriting(imageUrl),
      (err) => {
        console.error("Error analyzing handwriting:", err);
        toast.error("Handwriting analysis failed", {
          description: "We'll continue with the evaluation, but handwriting statistics may be limited."
        });
      }
    );

    toast.dismiss(); // Dismiss the loading toast

    if (result) {
      setHandwritingResult(result);
      toast.success("Handwriting analysis complete");
    }

    setIsAnalyzingHandwriting(false);
    setCurrentStep('evaluate');
  };

  const handleEvaluationComplete = (result: EvaluationResult, marks: number) => {
    // Remove handwriting feedback from evaluation result
    if (result.handwritingFeedback) {
      delete result.handwritingFeedback;
    }

    console.log("Evaluation complete with result:", result);

    // Validate the result
    if (!result || !result.marksAwarded || !result.performanceLabel || !result.feedbackSummary) {
      console.error("Invalid evaluation result received:", result);
      toast.error("Invalid evaluation result", {
        description: "The evaluation result is missing required properties. Please try again."
      });
      return;
    }

    // Ensure any lingering toasts are dismissed
    toast.dismiss();

    // Store the evaluation result and total marks
    setEvaluationResult(result);
    setTotalMarks(marks);

    // Log the stored values to verify they're set correctly
    console.log("Stored evaluation result:", result);
    console.log("Stored total marks:", marks);

    // Update step completion status
    setStepsCompleted(prev => ({ ...prev, evaluate: true }));

    // Proceed to the next step
    setCurrentStep('handwritingStats');
  };

  const handleContinueToResults = () => {
    // Ensure any lingering toasts are dismissed
    // First immediate dismiss
    toast.dismiss();

    // Use a small delay to ensure any pending toasts are also dismissed
    setTimeout(() => {
      toast.dismiss();
      console.log("All toasts dismissed before showing results");
    }, 100);

    setStepsCompleted(prev => ({ ...prev, handwritingStats: true }));
    setCurrentStep('results');
  };

  // Function to handle step changes from the navigation
  const handleStepChange = (step: AppStep) => {
    setCurrentStep(step);
  };

  // Function to handle online/offline mode toggle
  const handleModeToggle = () => {
    toggleOnlineMode();
  };

  const resetApp = () => {
    setQuestionText('');
    setQuestionImageUrl('');
    setModelAnswer('');
    setAnswerText('');
    setAnswerImageUrl('');
    setEvaluationResult(null);
    setHandwritingResult(null);
    setStepsCompleted({
      scanQuestion: false,
      manualAnswer: false,
      scanAnswer: false,
      evaluate: false,
      handwritingStats: false,
      results: false
    });
    setCurrentStep('scanQuestion');
  };

  // We no longer need the renderStepIndicator function as we're using the StepNavigation component

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated && currentStep !== 'scanQuestion') {
      toast.error('Please sign in to continue', {
        description: 'You need to be signed in to evaluate answers'
      });
      navigate('/login');
    }
  }, [isAuthenticated, currentStep, navigate]);

  // Save evaluation to history when complete
  useEffect(() => {
    if (evaluationResult && currentStep === 'results' && studentName && answerImageUrl) {
      addEvaluation({
        studentName,
        questionText,
        marksAwarded: evaluationResult.marksAwarded,
        totalMarks,
        imageUrl: answerImageUrl
      });
    }
  }, [evaluationResult, currentStep, addEvaluation, studentName, questionText, totalMarks, answerImageUrl]);



  const renderStepContent = () => {
    // If not authenticated and not on the first step, show login prompt
    if (!isAuthenticated && currentStep !== 'scanQuestion') {
      return (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <LogIn className="h-12 w-12 text-app-blue-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-app-blue-900 mb-2">Sign in Required</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Please sign in to continue with the evaluation process. Your evaluations will be saved to your account.
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="bg-app-blue-500 hover:bg-app-blue-600"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        </div>
      );
    }

    switch (currentStep) {
      case 'scanQuestion':
        return (
          <div className="grid grid-cols-1 gap-8">
            <div className="md:col-span-2">
              <QuestionPaperScanner onCapture={handleQuestionCapture} />
            </div>
            <Card className="col-span-1 md:col-span-2 border-app-blue-100 shadow-md">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-app-blue-800 mb-4 flex items-center">
                  <FileText size={20} className="mr-2 text-app-blue-600" />
                  How it works
                </h2>
                <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                  <li className="pl-2">Scan the question paper using your device camera</li>
                  <li className="pl-2">Review, scan, upload, or edit the model answer</li>
                  <li className="pl-2">Next, scan the student's handwritten answer sheet</li>
                  <li className="pl-2">Our AI will analyze the handwriting and evaluate the answer</li>
                  <li className="pl-2">Review the detailed feedback and grading results</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        );

      case 'manualAnswer':
        return (
          <div className="grid grid-cols-1 gap-8">
            <div className="md:col-span-2">
              <ManualAnswerEntry
                questionText={questionText}
                questionImageUrl={questionImageUrl}
                onComplete={handleManualAnswerComplete}
              />
            </div>
            <Card className="col-span-1 md:col-span-2 border-app-blue-100 shadow-md">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-app-blue-800 mb-4 flex items-center">
                  <FileText size={20} className="mr-2 text-app-blue-600" />
                  Model Answer
                </h2>
                <p className="text-muted-foreground mb-4">
                  Review the AI-generated model answer, scan or upload a model answer image, or enter your own. This will be used to evaluate the student's answer.
                </p>
                <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    For best results, ensure the model answer contains all the key points expected in a correct answer.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'scanAnswer':
        return (
          <div className="grid grid-cols-1 gap-4">
            <div className="md:col-span-2">
              <ScanCamera onCapture={handleAnswerCapture} />
            </div>
            <Card className="col-span-1 md:col-span-2 border-app-teal-100 shadow-md">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-app-blue-800 mb-4 flex items-center">
                  <ScanText size={20} className="mr-2 text-app-teal-600" />
                  Scanning Answer Sheet
                </h2>
                <p className="text-muted-foreground mb-4">
                  Position the student's handwritten answer sheet within the frame and capture a clear image.
                  Our AI will analyze both the content and the handwriting quality.
                </p>
                <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    For best results, ensure good lighting and that the entire answer sheet is visible.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'evaluate':
        return (
          <div className="grid grid-cols-1 gap-4">
            <EvaluationForm
              studentAnswerText={answerText}
              imageUrl={answerImageUrl}
              questionText={questionText}
              questionImageUrl={questionImageUrl}
              modelAnswer={modelAnswer}
              onEvaluationComplete={handleEvaluationComplete}
            />
          </div>
        );

      case 'handwritingStats':
        return (
          <div className="grid grid-cols-1 gap-8">
            {handwritingResult && answerImageUrl && (
              <HandwritingStatistics
                imageUrl={answerImageUrl}
                handwritingResult={handwritingResult}
                evaluationResult={evaluationResult}
                totalMarks={totalMarks}
                onContinue={handleContinueToResults}
              />
            )}
          </div>
        );

      case 'results':
        // Ensure all toasts are dismissed when rendering the results page
        toast.dismiss();

        // Log the current state of evaluationResult
        console.log("Current evaluationResult in results step:", evaluationResult);
        console.log("Current totalMarks in results step:", totalMarks);

        // Create a safe copy of the evaluation result to avoid any reference issues
        const safeEvaluationResult = evaluationResult ? { ...evaluationResult } : null;

        if (!safeEvaluationResult) {
          console.error("No evaluation result available for results step");
          return (
            <div className="grid grid-cols-1 gap-8">
              <Card className="border-red-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <h3 className="text-xl font-semibold text-red-600 mb-4">Error: No Evaluation Results</h3>
                    <p className="text-muted-foreground mb-6">
                      There was a problem with the evaluation process. Please try again.
                    </p>
                    <Button onClick={resetApp} className="bg-app-blue-500 hover:bg-app-blue-600">
                      Start New Evaluation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }

        // Validate the evaluation result and provide default values if needed
        if (safeEvaluationResult.marksAwarded === undefined) {
          console.warn("marksAwarded is undefined, setting default value");
          safeEvaluationResult.marksAwarded = 0;
        }

        if (!safeEvaluationResult.performanceLabel) {
          console.warn("performanceLabel is missing, setting default value");
          safeEvaluationResult.performanceLabel = 'Poor';
        }

        if (!safeEvaluationResult.feedbackSummary || !Array.isArray(safeEvaluationResult.feedbackSummary)) {
          console.warn("feedbackSummary is missing or not an array, setting default value");
          safeEvaluationResult.feedbackSummary = ["No feedback available"];
        }

        // Ensure other required properties exist
        if (!safeEvaluationResult.keyPointsCovered) {
          safeEvaluationResult.keyPointsCovered = [];
        }

        if (!safeEvaluationResult.keyPointsMissing) {
          safeEvaluationResult.keyPointsMissing = [];
        }

        if (!safeEvaluationResult.evaluationReason) {
          safeEvaluationResult.evaluationReason = "Evaluation completed";
        }

        // Toast dismissal is now handled by the useEffect at the component level

        return (
          <div className="grid grid-cols-1 gap-8">
            <div className="md:col-span-2">
              <ResultsDisplay
                result={safeEvaluationResult}
                totalMarks={totalMarks || 10} // Provide a default value for totalMarks
                onReset={resetApp}
                onBack={() => setCurrentStep('handwritingStats')}
                studentName={studentName}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-app-blue-900 text-center mb-2">
          AI-Powered Exam Evaluation
        </h1>
        <p className="text-center text-muted-foreground mb-8 max-w-lg mx-auto">
          Scan student answer sheets, compare against model answers, and get instant AI evaluation
        </p>

        <MainNavigation
          currentStep={currentStep}
          onStepChange={handleStepChange}
        />

        <div className="transition-all duration-300 animate-fade-in">
          {renderStepContent()}
        </div>
      </div>
    </Layout>
  );
};

// Wrap the component with ErrorBoundary
const IndexWithErrorBoundary = () => (
  <ErrorBoundary
    fallback={
      <Layout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl md:text-3xl font-bold text-app-blue-900 mb-4">
            Something went wrong
          </h1>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-app-blue-500 hover:bg-app-blue-600 flex items-center mx-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload Application
          </Button>
        </div>
      </Layout>
    }
  >
    <Index />
  </ErrorBoundary>
);

export default IndexWithErrorBoundary;
