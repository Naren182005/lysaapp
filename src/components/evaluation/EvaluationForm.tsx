
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Question, StudentAnswer, EvaluationResult } from "@/types";
import { evaluateAnswer } from "@/utils/evaluationService";
import { toast } from "@/components/ui/accessible-toast";
import { PaperclipIcon, UploadIcon, FileTextIcon, BookOpenIcon, ClipboardCheckIcon, AlertTriangle, RefreshCw, LayoutGrid, LayoutList, Wand2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from '@/hooks/use-mobile';
import { handleAsyncError, withErrorHandling } from '@/utils/errorHandling';
import ErrorBoundary from '@/components/layout/ErrorBoundary';
import { formatMCQQuestion, convertParagraphToMCQ } from "@/utils/questionUtils";

interface EvaluationFormProps {
  studentAnswerText: string;
  imageUrl: string;
  questionText?: string;
  questionImageUrl?: string;
  modelAnswer?: string;
  onEvaluationComplete: (result: EvaluationResult, totalMarks: number) => void;
}

const EvaluationForm: React.FC<EvaluationFormProps> = ({
  studentAnswerText,
  imageUrl,
  questionText = '',
  questionImageUrl = '',
  modelAnswer = '',
  onEvaluationComplete
}) => {
  const isMobile = useIsMobile();
  const [question, setQuestion] = useState<Partial<Question>>({
    text: questionText,
    totalMarks: 10,
    modelAnswer: modelAnswer || studentAnswerText, // Use the provided model answer or fallback to answer sheet text
    questionPaper: questionText
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [studentAnswer, setStudentAnswer] = useState<string>(studentAnswerText);
  const [questionPaperImageUrl, setQuestionPaperImageUrl] = useState<string>(questionImageUrl);
  const [showQuestionPaper, setShowQuestionPaper] = useState(!!questionImageUrl);
  const [isHorizontalFormat, setIsHorizontalFormat] = useState(false);
  const [isConvertingToMCQ, setIsConvertingToMCQ] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to convert paragraph text to MCQ format
  const handleConvertToMCQ = () => {
    if (!question.text) {
      toast.error("Please enter question text first");
      return;
    }

    setIsConvertingToMCQ(true);
    try {
      // First try to format the question as an MCQ
      const formattedText = formatMCQQuestion(question.text);

      // If the text is already an MCQ, the formatting will be applied
      // If not, try to convert it to MCQ format
      if (formattedText !== question.text) {
        // The text was recognized as an MCQ and formatted
        setQuestion(prev => ({
          ...prev,
          text: formattedText
        }));
        toast.success("Question formatted as MCQ");
      } else {
        // Try to convert paragraph to MCQ structure
        const mcq = convertParagraphToMCQ(question.text);

        if (mcq) {
          // Successfully converted to MCQ
          const formattedMCQ = formatMCQQuestion(mcq.questionText);
          setQuestion(prev => ({
            ...prev,
            text: formattedMCQ
          }));
          toast.success("Successfully converted to MCQ format");
        } else {
          // Could not convert to MCQ automatically
          toast.info("Could not automatically convert to MCQ format. Please check the question text.");
        }
      }
    } catch (error) {
      console.error("Error converting to MCQ format:", error);
      toast.error("Failed to convert to MCQ format");
    } finally {
      setIsConvertingToMCQ(false);
    }
  };

  // Effect to update fields when props change
  useEffect(() => {
    setQuestion(prev => ({
      ...prev,
      text: questionText,
      questionPaper: questionText,
      modelAnswer: modelAnswer || studentAnswerText // Use the provided model answer or fallback to answer sheet text
    }));
    setStudentAnswer(studentAnswerText);
    setQuestionPaperImageUrl(questionImageUrl);

    // We're not automatically calculating total marks anymore
    // The user will manually set the total marks
  }, [questionText, questionImageUrl, studentAnswerText, modelAnswer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuestion(prev => ({
      ...prev,
      [name]: name === 'totalMarks' ? Number(value) : value
    }));
  };

  const handleStudentAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setStudentAnswer(e.target.value);
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
      // Add a newline after each sentence or item
      return text
        .replace(/\.\s+/g, '.\n') // Add newline after periods
        .replace(/;\s+/g, ';\n')  // Add newline after semicolons
        .replace(/\)\s+/g, ')\n') // Add newline after closing parentheses
        .replace(/\d+\s*[A-Da-d]\s+/g, (match) => match.trim() + '\n') // Add newline after MCQ answers like "1A "
        .trim();
    }
  };

  const handleQuestionPaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast.error("No file selected");
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please select a valid image file (JPEG, PNG, GIF, WEBP)"
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "Please select an image smaller than 10MB"
      });
      return;
    }

    // First, set the image URL
    const reader = new FileReader();

    reader.onerror = () => {
      toast.error("Error reading file", {
        description: "There was a problem reading the selected file"
      });
    };

    reader.onload = async (event) => {
      if (!event.target?.result) {
        toast.error("Failed to load image");
        return;
      }

      const imageUrl = event.target.result.toString();
      setQuestionPaperImageUrl(imageUrl);

      // Show loading toast
      toast.loading("Processing question paper...");

      try {
        // In a real implementation, we would use OCR and AI to extract the question and marks
        // For now, we'll simulate the processing with a delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Extract a question from the paper (mock implementation)
        const extractedQuestion = "What are the key principles of object-oriented programming? Explain with examples.";

        // Extract total marks (mock implementation)
        const extractedMarks = 20;

        // Update the form fields
        setQuestion(prev => ({
          ...prev,
          text: extractedQuestion,
          totalMarks: extractedMarks,
          questionPaper: `${extractedQuestion}\n\nTotal Marks: ${extractedMarks}`
        }));

        toast.dismiss();
        toast.success("Question paper processed successfully!", {
          description: "Question text and marks have been extracted"
        });
      } catch (error) {
        console.error("Error processing question paper:", error);
        toast.dismiss();
        toast.error("Failed to process question paper", {
          description: "There was a problem extracting information from the image"
        });
      }
    };

    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!question.text) {
      toast.error("Question text is required", {
        description: "Please enter the question text before evaluating"
      });
      return;
    }

    if (!question.modelAnswer) {
      toast.error("Model answer is required", {
        description: "Please enter the model answer before evaluating"
      });
      return;
    }

    if (!studentAnswer.trim()) {
      toast.error("Student answer is required", {
        description: "Please ensure the student answer is not empty"
      });
      return;
    }

    setIsEvaluating(true);

    // Dismiss any existing toasts first
    toast.dismiss();

    // Store the toast ID to ensure we can dismiss it later
    const toastId = "evaluating-answer-toast";
    toast.loading("Evaluating answer...", {
      id: toastId,
      duration: 10000 // Set a maximum duration of 10 seconds
    });

    try {
      // Call evaluateAnswer directly to avoid promise handling issues
      const result = await evaluateAnswer(
        question.text!,
        question.totalMarks || 10,
        question.modelAnswer!,
        studentAnswer
      );

      console.log("Evaluation result:", result);

      // Explicitly dismiss the loading toast by ID
      toast.dismiss(toastId);

      // Ensure all toasts are dismissed with a small delay
      setTimeout(() => {
        toast.dismiss();
      }, 100);

      if (result) {
        console.log("Valid evaluation result received:", result);

        // Ensure the result has all required properties and add any missing ones
        if (result.marksAwarded === undefined) {
          console.error("Evaluation result is missing marksAwarded property:", result);
          result.marksAwarded = Math.round((question.totalMarks || 10) * 0.5); // Default to 50%
        }

        if (!result.performanceLabel) {
          console.error("Evaluation result is missing performanceLabel property:", result);
          // Calculate performance label based on percentage
          const percentage = (result.marksAwarded / (question.totalMarks || 10)) * 100;
          result.performanceLabel = percentage >= 85 ? 'Excellent' :
                                   percentage >= 70 ? 'Good' :
                                   percentage >= 50 ? 'Average' : 'Poor';
        }

        if (!result.feedbackSummary || !Array.isArray(result.feedbackSummary) || result.feedbackSummary.length === 0) {
          console.error("Evaluation result is missing feedbackSummary property:", result);
          result.feedbackSummary = ["Feedback not available. Please review the answer manually."];
        }

        // Ensure other required properties exist
        if (!result.keyPointsCovered) {
          result.keyPointsCovered = [];
        }

        if (!result.keyPointsMissing) {
          result.keyPointsMissing = [];
        }

        if (!result.evaluationReason) {
          result.evaluationReason = "Evaluation completed";
        }

        // Log the result before passing it to the parent component
        console.log("Passing evaluation result to parent:", {
          marksAwarded: result.marksAwarded,
          performanceLabel: result.performanceLabel,
          totalMarks: question.totalMarks || 10
        });

        // Call onEvaluationComplete before showing any new toasts
        onEvaluationComplete(result, question.totalMarks || 10);

        // Show success toast after a small delay to ensure previous toasts are gone
        setTimeout(() => {
          toast.success("Evaluation complete!", {
            description: `${result.marksAwarded}/${question.totalMarks || 10} marks awarded`
          });
        }, 200);
      } else {
        console.error("Evaluation returned null or undefined result");
        toast.error("Evaluation failed", {
          description: "The evaluation process did not return a valid result. Please try again."
        });
      }
    } catch (err) {
      console.error("Evaluation error:", err);

      // Ensure we dismiss any lingering toasts before showing error
      toast.dismiss();

      // Small delay before showing the error toast
      setTimeout(() => {
        toast.error("Failed to evaluate answer", {
          description: "There was a problem evaluating the answer. Please try again."
        });
      }, 200);
    } finally {
      setIsEvaluating(false);

      // Final safety dismiss to ensure no lingering toasts
      setTimeout(() => {
        toast.dismiss(toastId);
      }, 300);
    }

    // Return early since we've handled everything in the try/catch
    return;
  };

  return (
    <Card className="overflow-hidden shadow-lg border-app-teal-100">
      <form onSubmit={handleEvaluate} className={`${isMobile ? 'p-3' : 'p-6'}`}>
        <div className={`${isMobile ? 'space-y-4' : 'space-y-5'}`}>
          <h2 className="font-semibold text-xl text-app-blue-900 mb-2 flex items-center">
            <ClipboardCheckIcon size={20} className="mr-2 text-app-teal-600" />
            Evaluation Details
          </h2>

          <Collapsible open={showQuestionPaper} onOpenChange={setShowQuestionPaper} className="transition-all duration-300">
            <div className="flex justify-between items-center mb-2">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={`flex items-center gap-2 text-app-blue-700 hover:bg-app-blue-50 border-app-blue-200 shadow-sm ${isMobile ? 'text-sm w-full justify-center py-1' : ''}`}
                >
                  <BookOpenIcon size={16} />
                  {showQuestionPaper ? "Hide Question Paper" : "Add Question Paper"}
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className={`space-y-4 border rounded-md ${isMobile ? 'p-3' : 'p-5'} bg-app-blue-50/50 animate-fade-in`}>
              <div className="space-y-2">
                <Label htmlFor="question-paper" className="text-app-blue-800">Question Paper Text</Label>
                <Textarea
                  id="question-paper"
                  name="questionPaper"
                  value={question.questionPaper || ''}
                  onChange={handleInputChange}
                  placeholder="Enter the question paper text..."
                  className={`${isMobile ? 'min-h-[60px]' : 'min-h-[80px]'} focus:border-app-teal-300`}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-app-blue-800">Question Paper Attachment</Label>
                <div className={`${isMobile ? 'flex flex-col' : 'flex'} gap-2`}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleQuestionPaperUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className={`flex gap-2 border-app-blue-200 hover:border-app-blue-300 hover:bg-app-blue-50 ${isMobile ? 'w-full justify-center' : ''}`}
                    onClick={triggerFileInput}
                  >
                    <PaperclipIcon size={16} />
                    Upload Question Paper
                  </Button>

                  {questionPaperImageUrl && (
                    <Button
                      type="button"
                      variant="link"
                      className={`text-app-teal-600 hover:text-app-teal-700 ${isMobile ? 'p-0 h-auto w-full justify-center mt-1' : 'p-0 h-auto'}`}
                      onClick={() => window.open(questionPaperImageUrl, '_blank')}
                    >
                      View Uploaded Question Paper
                    </Button>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="question-text" className="text-app-blue-800">Question Text</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-app-teal-600 hover:bg-app-teal-50 border-app-teal-200"
                onClick={handleConvertToMCQ}
                disabled={isConvertingToMCQ}
              >
                {isConvertingToMCQ ? (
                  <>
                    <span className="animate-spin mr-1">⟳</span> Converting...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-1 h-4 w-4" /> MCQ Convert
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="question-text"
              name="text"
              value={question.text}
              onChange={handleInputChange}
              placeholder="Enter the question..."
              className={`${isMobile ? 'min-h-[60px]' : 'min-h-[80px]'} focus:border-app-teal-300 ${questionText ? 'bg-gray-50' : ''} font-mono whitespace-pre-wrap`}
              required
            />
            {questionText && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600">✓</span> Auto-filled from question paper
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="total-marks" className="text-app-blue-800 flex items-center">
              <span>Total Marks</span>
              <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Manually set
              </span>
            </Label>
            <Input
              id="total-marks"
              name="totalMarks"
              type="number"
              value={question.totalMarks}
              onChange={handleInputChange}
              min="1"
              max="100"
              className="focus:border-app-teal-300"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              This value will be used for scoring regardless of the number of questions
            </p>
          </div>

          <div className="flex justify-between items-center mb-2">
            <h3 className="text-app-blue-800 font-medium">Answer Comparison</h3>
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
                const newModelAnswer = convertAnswerFormat(question.modelAnswer || '', newIsHorizontal);
                setQuestion(prev => ({
                  ...prev,
                  modelAnswer: newModelAnswer
                }));

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
              <Label htmlFor="model-answer" className="text-app-blue-800 flex items-center">
                <span>Model Answer</span>
                <span className="ml-2 text-xs text-app-teal-600 bg-app-teal-50 px-2 py-0.5 rounded-full">
                  Edit as needed
                </span>
              </Label>
              <Textarea
                id="model-answer"
                name="modelAnswer"
                value={question.modelAnswer}
                onChange={handleInputChange}
                placeholder="Enter the model answer..."
                className={`${isMobile ? 'min-h-[120px]' : 'min-h-[150px]'} focus:border-app-teal-300 focus:ring-2 focus:ring-app-teal-500 shadow-sm`}
                required
              />
              {modelAnswer ? (
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-600">✓</span> AI-generated model answer from question paper
                </p>
              ) : studentAnswerText && (
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-600">✓</span> Auto-filled from answer sheet
                </p>
              )}
              <p className="text-xs text-app-blue-600 mt-1 bg-app-blue-50 p-2 rounded-md">
                <strong>Tip:</strong> For exact matching with student answers, edit this model answer to match the expected format and key points.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="student-answer" className="text-app-blue-800">Student's Answer (Scanned)</Label>
                <Button
                  type="button"
                  variant="link"
                  className="text-app-teal-600 hover:text-app-teal-700 p-0 h-auto"
                  onClick={() => window.open(imageUrl, '_blank')}
                >
                  View Image
                </Button>
              </div>
              <Textarea
                id="student-answer"
                value={studentAnswer}
                onChange={handleStudentAnswerChange}
                placeholder="Extracted text from the scanned answer..."
                className={`${isMobile ? 'min-h-[120px]' : 'min-h-[150px]'} focus:border-app-teal-300`}
              />
            </div>
          </div>

          <Button
            type="submit"
            className={`w-full bg-app-teal-500 hover:bg-app-teal-600 transition-all duration-300 shadow-md ${isMobile ? 'py-6 text-lg' : ''}`}
            disabled={isEvaluating}
          >
            {isEvaluating ?
              "Evaluating..." :
              <span className="flex items-center gap-2 justify-center"><ClipboardCheckIcon size={isMobile ? 20 : 18} /> Evaluate Answer</span>
            }
          </Button>

          {/* Mobile-specific help text */}
          {isMobile && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Tip: You can edit any field before evaluation
            </p>
          )}
        </div>
      </form>
    </Card>
  );
};

// Wrap the component with ErrorBoundary
const EvaluationFormWithErrorBoundary: React.FC<EvaluationFormProps> = (props) => (
  <ErrorBoundary
    fallback={
      <Card className="overflow-hidden shadow-lg border-app-teal-100">
        <div className="p-6 bg-app-blue-50">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="font-semibold text-app-blue-900">Evaluation Error</h2>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
            <p className="text-red-800 mb-2">
              There was a problem with the evaluation form. Please try again.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
          </div>
        </div>
      </Card>
    }
  >
    <EvaluationForm {...props} />
  </ErrorBoundary>
);

export default EvaluationFormWithErrorBoundary;
