import React, { useRef, useState, useEffect } from 'react';
import { Camera, CameraOff, ScanText, FileText, Upload, RefreshCw, AlertTriangle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/accessible-toast";
import { extractTextFromImage, generateModelAnswer, extractQuestionsFromText } from "@/utils/evaluationService";
import { isMultipleChoiceQuestion, isMCQOnlyPaper, formatQuestionPaper } from "@/utils/questionUtils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useIsMobile } from '@/hooks/use-mobile';
import { handleAsyncError, withErrorHandling } from '@/utils/errorHandling';
import ErrorBoundary from '@/components/ErrorBoundary';

interface QuestionPaperScannerProps {
  onCapture: (
    text: string,
    imageUrl: string,
    modelAnswer: string,
    questions?: { number: number; text: string; marks: number }[],
    modelAnswers?: string[],
    skipManualAnswer?: boolean
  ) => void;
}

const QuestionPaperScanner: React.FC<QuestionPaperScannerProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [generateAIAnswers, setGenerateAIAnswers] = useState(false); // Default to OFF
  const isMobile = useIsMobile();

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setCameraError(null);

    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Camera access is not supported in this browser");
      setCameraError("Camera access is not supported in this browser");
      setShowFileUpload(true);
      return;
    }

    const [mediaStream, error] = await handleAsyncError(
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      }),
      (err) => {
        console.error("Error accessing camera:", err);
        toast.error("Failed to access camera. Please check camera permissions.");
        setCameraError("Failed to access camera. Please ensure you've granted camera permissions.");
        setShowFileUpload(true);
      }
    );

    if (!mediaStream) return;

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          handleAsyncError(
            videoRef.current.play(),
            (err) => {
              console.error("Error playing video:", err);
              toast.error("Failed to start camera stream");
              setCameraError("Failed to start camera stream");
              setShowFileUpload(true);
            }
          );
        }
      };
    }

    setStream(mediaStream);
    setIsActive(true);
    toast.success("Camera started");
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error("Camera not initialized properly");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error("Could not initialize canvas context");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to image URL
    const imageUrl = canvas.toDataURL('image/png');
    setCapturedImageUrl(imageUrl);
    setIsCaptured(true);

    // Process the image with OCR - specify this is a question paper
    setIsProcessing(true);

    const [extractedText, error] = await handleAsyncError(
      extractTextFromImage(imageUrl, true), // true indicates this is a question paper
      (err) => {
        console.error("Error processing image:", err);
        toast.error("Error processing image", {
          description: "Could not extract text from the question paper. Please try again with a clearer image."
        });
      }
    );

    if (extractedText) {
      // Extract questions from the text
      const questions = extractQuestionsFromText(extractedText);

      if (questions.length === 0) {
        toast.warning("No questions detected", {
          description: "Could not identify questions in the text. Using the entire text as a single question."
        });

        // Treat the entire text as a single question
        questions.push({
          number: 1,
          text: extractedText,
          marks: 10
        });
      }

      // Check if all questions are MCQs
      const allMCQs = questions.every(q => isMultipleChoiceQuestion(q.text));

      if (allMCQs) {
        toast.success("Detected MCQ-only question paper", {
          description: "Optimizing model answer generation for multiple-choice questions."
        });
      }

      // Generate model answers for each question
      toast.loading(`Generating model answers for ${questions.length} questions...`);

      const modelAnswers: string[] = [];
      let hasErrors = false;

      try {
        // Import the batch model answer generation function
        // Use OpenAI API for better results
        const { generateOpenAIAnswer } = await import('@/services/openaiService');

        // Extract question texts
        const questionTexts = questions.map(q => q.text);

        // Generate answers for all questions in batch
        toast.loading("Processing questions in batch with OpenAI API for faster results...");

        // Process questions in parallel
        const batchAnswers = await Promise.all(questionTexts.map(question => generateOpenAIAnswer(question)));

        // Make sure we're assigning all answers correctly
        if (batchAnswers && batchAnswers.length === questions.length) {
          // Copy all answers to the modelAnswers array
          for (let i = 0; i < batchAnswers.length; i++) {
            modelAnswers[i] = batchAnswers[i];
          }

          toast.success(`Generated answers for all ${questions.length} questions`);
        } else {
          console.error("Batch answers length doesn't match questions length",
            { batchAnswersLength: batchAnswers?.length, questionsLength: questions.length });
          hasErrors = true;

          // Fall back to individual processing
          for (let i = 0; i < questions.length; i++) {
            // Process each question individually as fallback
            // ...existing individual processing code...
          }
        }
      } catch (error) {
        console.error("Error in batch processing:", error);
        hasErrors = true;
        // Fall back to individual processing
      }

      // Function to process questions individually as a fallback
      async function processQuestionsIndividually() {
        toast.loading("Falling back to individual question processing...");

        // For MCQ-only papers, we can process questions in parallel for faster results
        if (allMCQs && questions.length > 1) {
          toast.loading("Processing multiple-choice questions in parallel...");

          // Process MCQs in parallel
          const answerPromises = questions.map(question =>
            handleAsyncError(
              generateModelAnswer(question.text),
              (err) => {
                console.error(`Error generating model answer for question ${question.number}:`, err);
                hasErrors = true;

                // Check if the error message contains specific keywords
                const errorMsg = err.toString().toLowerCase();
                if (errorMsg.includes("internet connection") || errorMsg.includes("network")) {
                  toast.error("Network Error", {
                    description: "Could not connect to the model answer service. Please check your internet connection and try again."
                  });
                } else if (errorMsg.includes("api token") || errorMsg.includes("authorization")) {
                  toast.error("API Authorization Error", {
                    description: "There was a problem with the API authorization. Using question text as fallback."
                  });
                } else if (errorMsg.includes("model not found") || errorMsg.includes("404")) {
                  toast.error("Model Not Available", {
                    description: "The AI model is currently unavailable. Using question text as fallback."
                  });
                } else if (errorMsg.includes("rate limit") || errorMsg.includes("429") || errorMsg.includes("too many requests") || errorMsg.includes("quota exceeded")) {
                  toast.error("API Rate Limit Exceeded", {
                    description: "The AI service is currently rate limited. Using question text as fallback. Please try again in a few minutes."
                  });
                } else {
                  toast.error("Error generating model answer", {
                    description: "Could not generate a model answer. Using question text as fallback."
                  });
                }

                return null;
              }
            )
          );

          // Wait for all answers to be generated
          const results = await Promise.all(answerPromises);

          // Extract answers from results
          modelAnswers.length = 0; // Clear any existing answers
          for (let i = 0; i < results.length; i++) {
            const [modelAnswer, error] = results[i];

            // Check if the model answer contains an error message
            const isErrorMessage = modelAnswer &&
              typeof modelAnswer === 'string' &&
              modelAnswer.startsWith('Error:');

            if (isErrorMessage || !modelAnswer) {
              console.error(`Model answer for question ${questions[i].number} contains error:`, modelAnswer);
              // Use the question text as a fallback
              modelAnswers.push(questions[i].text);
            } else {
              modelAnswers.push(modelAnswer);
            }
          }
        }
        // For mixed or non-MCQ papers, process questions sequentially
        else {
          modelAnswers.length = 0; // Clear any existing answers
          for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            toast.loading(`Generating answer for question ${i + 1} of ${questions.length}...`);

            const [modelAnswer, modelError] = await handleAsyncError(
              generateModelAnswer(question.text),
              (err) => {
                console.error(`Error generating model answer for question ${question.number}:`, err);
                hasErrors = true;

                // Check if the error message contains specific keywords
                const errorMsg = err.toString().toLowerCase();
                if (errorMsg.includes("internet connection") || errorMsg.includes("network")) {
                  toast.error("Network Error", {
                    description: "Could not connect to the model answer service. Please check your internet connection and try again."
                  });
                } else if (errorMsg.includes("api token") || errorMsg.includes("authorization")) {
                  toast.error("API Authorization Error", {
                    description: "There was a problem with the API authorization. Using question text as fallback."
                  });
                } else if (errorMsg.includes("model not found") || errorMsg.includes("404")) {
                  toast.error("Model Not Available", {
                    description: "The AI model is currently unavailable. Using question text as fallback."
                  });
                } else if (errorMsg.includes("rate limit") || errorMsg.includes("429") || errorMsg.includes("too many requests") || errorMsg.includes("quota exceeded")) {
                  toast.error("API Rate Limit Exceeded", {
                    description: "The AI service is currently rate limited. Using question text as fallback. Please try again in a few minutes."
                  });
                } else {
                  toast.error("Error generating model answer", {
                    description: "Could not generate a model answer. Using question text as fallback."
                  });
                }
              }
            );

            // Check if the model answer contains an error message
            const isErrorMessage = modelAnswer &&
              typeof modelAnswer === 'string' &&
              modelAnswer.startsWith('Error:');

            if (isErrorMessage || !modelAnswer) {
              console.error(`Model answer for question ${question.number} contains error:`, modelAnswer);
              // Use the question text as a fallback
              modelAnswers.push(question.text);
            } else {
              modelAnswers.push(modelAnswer);
            }
          }
        }
      }

      toast.dismiss(); // Dismiss the loading toast

      // Create a formatted model answer with all questions and answers
      const formattedModelAnswer = questions.map((q, index) =>
        `Question ${q.number} (${q.marks} marks): ${q.text}\n\nModel Answer: ${modelAnswers[index]}\n\n---\n\n`
      ).join('');

      // Pass the extracted questions, model answers, the original text, and the AI generation flag
      onCapture(
        extractedText,
        imageUrl,
        formattedModelAnswer,
        questions,
        modelAnswers,
        generateAIAnswers
      );

      if (hasErrors) {
        toast.success("Question paper processed with some errors", {
          description: "Some model answers could not be generated and are using fallback text."
        });
      } else {
        toast.success("Question paper processed successfully!", {
          description: `Generated model answers for ${questions.length} questions.`
        });
      }
    }

    setIsProcessing(false);

    // Stop the camera after capture
    stopCamera();
  };

  const retakePhoto = () => {
    setIsCaptured(false);
    setCapturedImageUrl('');
    setShowFileUpload(false);
    startCamera();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error("No file selected");
      return;
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validTypes = [...validImageTypes, ...validDocTypes];

    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please select a valid file (JPEG, PNG, GIF, WEBP, PDF, DOC, DOCX)"
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

    const reader = new FileReader();

    reader.onerror = () => {
      toast.error("Error reading file", {
        description: "There was a problem reading the selected file"
      });
    };

    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      if (!imageUrl) {
        toast.error("Failed to load image");
        return;
      }

      setCapturedImageUrl(imageUrl);
      setIsCaptured(true);

      // Process the image with OCR - specify this is a question paper
      setIsProcessing(true);

      const [extractedText, error] = await handleAsyncError(
        extractTextFromImage(imageUrl, true), // true indicates this is a question paper
        (err) => {
          console.error("Error processing image:", err);
          toast.error("Error processing image", {
            description: "Could not extract text from the question paper. Please try again with a clearer image."
          });
        }
      );

      if (extractedText) {
        // Format the question paper for better detection
        const formattedText = formatQuestionPaper(extractedText);

        // Extract questions from the text
        const questions = extractQuestionsFromText(formattedText);

        if (questions.length === 0) {
          toast.warning("No questions detected", {
            description: "Could not identify questions in the text. Using the entire text as a single question."
          });

          // Treat the entire text as a single question
          questions.push({
            number: 1,
            text: formattedText,
            marks: 10
          });
        }

        // Check if the paper contains only MCQs
        const isMCQPaper = isMCQOnlyPaper(formattedText);
        const allMCQs = questions.every(q => isMultipleChoiceQuestion(q.text));

        if (isMCQPaper || allMCQs) {
          toast.success("Detected MCQ-only question paper", {
            description: "Will provide only the correct answer letters without explanations."
          });
        }

        const modelAnswers: string[] = [];
        let hasErrors = false;

        // Only generate model answers if AI Generate is turned on
        if (generateAIAnswers) {
          // Process all questions, not just MCQs
          toast.loading(`Generating answers for all ${questions.length} questions...`);

          // Initialize model answers array with empty strings
          questions.forEach(() => modelAnswers.push(''));

          // Process questions in parallel for faster results
          if (questions.length > 1) {
            toast.loading("Processing all questions in parallel for faster results...");

            // Create promises for all questions
            const answerPromises = questions.map(question =>
              handleAsyncError(
                generateModelAnswer(question.text),
                (err) => {
                  console.error(`Error generating model answer for question ${question.number}:`, err);
                  hasErrors = true;

                  // Check if the error message contains specific keywords
                  const errorMsg = err.toString().toLowerCase();
                  if (errorMsg.includes("internet connection") || errorMsg.includes("network")) {
                    toast.error("Network Error", {
                      description: "Could not connect to the model answer service. Please check your internet connection and try again."
                    });
                  } else if (errorMsg.includes("api token") || errorMsg.includes("authorization")) {
                    toast.error("API Authorization Error", {
                      description: "There was a problem with the API authorization. Using question text as fallback."
                    });
                  } else if (errorMsg.includes("model not found") || errorMsg.includes("404")) {
                    toast.error("Model Not Available", {
                      description: "The AI model is currently unavailable. Using question text as fallback."
                    });
                  } else if (errorMsg.includes("rate limit") || errorMsg.includes("429") || errorMsg.includes("too many requests") || errorMsg.includes("quota exceeded")) {
                    toast.error("API Rate Limit Exceeded", {
                      description: "The AI service is currently rate limited. Using question text as fallback. Please try again in a few minutes."
                    });
                  } else {
                    toast.error("Error generating model answer", {
                      description: "Could not generate a model answer. Using question text as fallback."
                    });
                  }

                  return null;
                }
              )
            );

            // Wait for all answers to be generated
            const results = await Promise.all(answerPromises);

            // Map results to the modelAnswers array
            for (let i = 0; i < questions.length; i++) {
              const [modelAnswer, error] = results[i];

              // Check if the model answer contains an error message
              const isErrorMessage = modelAnswer &&
                typeof modelAnswer === 'string' &&
                modelAnswer.startsWith('Error:');

              if (isErrorMessage || !modelAnswer) {
                console.error(`Model answer for question ${questions[i].number} contains error:`, modelAnswer);
                // Use question text as fallback
                modelAnswers[i] = questions[i].text;
              } else {
                modelAnswers[i] = modelAnswer;
              }
            }
          }
          // Process questions sequentially
          else {
            for (let i = 0; i < questions.length; i++) {
              const question = questions[i];
              toast.loading(`Generating answer for question ${i + 1} of ${questions.length}...`);

              const [modelAnswer, modelError] = await handleAsyncError(
                generateModelAnswer(question.text),
                (err) => {
                  console.error(`Error generating model answer for question ${question.number}:`, err);
                  hasErrors = true;

                  // Check if the error message contains specific keywords
                  const errorMsg = err.toString().toLowerCase();
                  if (errorMsg.includes("internet connection") || errorMsg.includes("network")) {
                    toast.error("Network Error", {
                      description: "Could not connect to the model answer service. Please check your internet connection and try again."
                    });
                  } else if (errorMsg.includes("api token") || errorMsg.includes("authorization")) {
                    toast.error("API Authorization Error", {
                      description: "There was a problem with the API authorization. Using question text as fallback."
                    });
                  } else if (errorMsg.includes("model not found") || errorMsg.includes("404")) {
                    toast.error("Model Not Available", {
                      description: "The AI model is currently unavailable. Using question text as fallback."
                    });
                  } else if (errorMsg.includes("rate limit") || errorMsg.includes("429") || errorMsg.includes("too many requests") || errorMsg.includes("quota exceeded")) {
                    toast.error("API Rate Limit Exceeded", {
                      description: "The AI service is currently rate limited. Using question text as fallback. Please try again in a few minutes."
                    });
                  } else {
                    toast.error("Error generating model answer", {
                      description: "Could not generate a model answer. Using question text as fallback."
                    });
                  }

                  return null;
                }
              );

              // Check if the model answer contains an error message
              const isErrorMessage = modelAnswer &&
                typeof modelAnswer === 'string' &&
                modelAnswer.startsWith('Error:');

              if (isErrorMessage || !modelAnswer) {
                console.error(`Model answer for question ${question.number} contains error:`, modelAnswer);
                // Use question text as fallback
                modelAnswers[i] = question.text;
              } else {
                modelAnswers[i] = modelAnswer;
              }
            }
          }

          toast.success(`Generated answers for all ${questions.length} questions`, {
            description: "All questions have answers generated automatically."
          });
        } else {
          // If AI Generate is off, just use empty strings for model answers
          // This will be filled in manually later
          questions.forEach(() => {
            modelAnswers.push('');
          });

          toast.info("AI Generate is OFF", {
            description: "You will need to enter model answers manually in the next step."
          });
        }

        toast.dismiss(); // Dismiss the loading toast

        // Create a formatted model answer with all questions and answers
        const formattedModelAnswer = questions.map((q, index) =>
          `Question ${q.number} (${q.marks} marks): ${q.text}\n\nModel Answer: ${modelAnswers[index]}\n\n---\n\n`
        ).join('');

        // Pass the extracted questions, model answers, the original text, and the AI generation flag
        onCapture(
          extractedText,
          imageUrl,
          formattedModelAnswer,
          questions,
          modelAnswers,
          generateAIAnswers
        );

        if (hasErrors) {
          toast.success("Question paper processed with some errors", {
            description: "Some model answers could not be generated and are using fallback text."
          });
        } else {
          toast.success("Question paper processed successfully!", {
            description: `Generated model answers for ${questions.length} questions.`
          });
        }
      }

      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const toggleUploadMethod = () => {
    if (isActive) {
      stopCamera();
    }
    setShowFileUpload(!showFileUpload);
  };

  // Auto-start camera on mobile devices if possible
  useEffect(() => {
    if (isMobile && !isActive && !isCaptured && !showFileUpload && !cameraError) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        startCamera();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  return (
    <Card className="overflow-hidden shadow-lg border-app-blue-100">
      <div className={`${isMobile ? 'p-3' : 'p-4'} bg-app-blue-50`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-app-blue-600" />
            <h2 className="font-semibold text-app-blue-900">Scan Question Paper</h2>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="ai-generate" className={`text-sm ${generateAIAnswers ? 'text-app-blue-600 font-medium' : 'text-muted-foreground'}`}>
              AI Generate
            </Label>
            <Switch
              id="ai-generate"
              checked={generateAIAnswers}
              onCheckedChange={setGenerateAIAnswers}
              className="data-[state=checked]:bg-app-blue-600"
            />
          </div>
        </div>
        <p className={`text-sm text-muted-foreground ${isMobile ? 'mb-2' : 'mb-4'}`}>
          Position the question paper within the frame and capture a clear image
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {generateAIAnswers
            ? "AI Generate ON: Model answers will be generated automatically for all questions"
            : "AI Generate OFF: You will need to enter answers manually"}
        </p>

        <div className={`relative ${isMobile ? 'aspect-[1/1]' : 'aspect-[4/3]'} bg-black rounded-lg overflow-hidden shadow-inner`}>
          {isActive && !isCaptured && (
            <>
              <div className="scan-line animate-scan"></div>
              <div className="scan-overlay"></div>
            </>
          )}

          {isActive && !isCaptured ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover camera-cutout"
              aria-label="Camera preview for scanning question paper"
            />
          ) : isCaptured ? (
            <img
              src={capturedImageUrl}
              alt="Captured question paper"
              className="w-full h-full object-contain"
              aria-live="polite"
            />
          ) : showFileUpload ? (
            <div className="flex flex-col items-center justify-center h-full bg-app-blue-50 p-6">
              <Upload size={isMobile ? 36 : 48} className="text-app-blue-500 mb-4" />
              <h3 className="text-center font-medium text-app-blue-900 mb-2">
                Upload Question Paper
              </h3>
              <p className="text-center text-sm text-muted-foreground mb-6 max-w-xs">
                Select an image, PDF, or Word document of the question paper from your device
              </p>
              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                <Button
                  onClick={triggerFileInput}
                  className="bg-app-blue-500 hover:bg-app-blue-600 w-full py-6 text-base"
                  size="lg"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Select File
                </Button>
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, GIF, PDF, DOC, DOCX
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                capture={isMobile ? "environment" : undefined}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-app-blue-900 text-white p-6">
              <CameraOff size={isMobile ? 36 : 48} className="opacity-50 mb-4" />
              {cameraError ? (
                <>
                  <p className="text-center text-sm opacity-80 mb-2">{cameraError}</p>
                  <div className="flex items-center justify-center bg-yellow-600/30 p-3 rounded-md mt-2 mb-4 max-w-xs mx-auto">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
                    <p className="text-sm text-yellow-300">
                      Click the "Upload File" button below to use an image, PDF, or Word document from your device instead
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-center text-sm opacity-80 mb-4">Click "Start Camera" to begin scanning</p>
                  <p className="text-center text-xs opacity-60 mb-2">Or use "Upload File" if camera is unavailable</p>
                </>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        </div>

        <div className={`flex ${isMobile ? 'flex-col' : 'flex-wrap'} gap-2 mt-4 ${isMobile ? 'px-2' : 'justify-center'}`}>
          {isActive ? (
            <>
              <Button
                onClick={captureImage}
                className={`bg-app-blue-500 hover:bg-app-blue-600 transition-all shadow-md focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full py-6 text-lg' : ''}`}
                aria-label="Capture image"
              >
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </Button>
              <Button
                onClick={stopCamera}
                variant="outline"
                className={`border-app-blue-300 hover:bg-app-blue-50 focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full' : ''}`}
                aria-label="Cancel camera"
              >
                <CameraOff className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          ) : isCaptured ? (
            <>
              <Button
                onClick={retakePhoto}
                variant="outline"
                disabled={isProcessing}
                className={`border-app-blue-300 hover:bg-app-blue-50 focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full' : ''}`}
                aria-label="Retake photo"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <div className="text-center text-sm text-black mt-2">
                <span>Click "Try Again" to retake the photo</span>
              </div>
            </>
          ) : showFileUpload ? (
            <Button
              onClick={toggleUploadMethod}
              variant="outline"
              className={`border-app-blue-300 hover:bg-app-blue-50 focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full' : ''}`}
              aria-label="Use camera"
            >
              <Camera className="mr-2 h-4 w-4" />
              Try Camera Instead
            </Button>
          ) : (
            <>
              <Button
                onClick={toggleUploadMethod}
                className={`bg-app-blue-500 hover:bg-app-blue-600 transition-all shadow-md focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full py-6 text-lg' : ''}`}
                aria-label="Upload file"
                size={isMobile ? "default" : "lg"}
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload File
              </Button>
              <Button
                onClick={startCamera}
                variant="outline"
                className={`border-app-blue-300 hover:bg-app-blue-50 focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full py-6 text-lg' : ''}`}
                aria-label="Start camera"
              >
                <Camera className="mr-2 h-4 w-4" />
                Start Camera
              </Button>
              <div className="text-center text-sm text-black mt-2">
                <span>Choose a method to scan your question paper</span>
              </div>
            </>
          )}
        </div>

        {/* Mobile-specific help text */}
        {isMobile && isActive && !isCaptured && (
          <div className="mt-4 p-2 bg-app-blue-100 rounded-md">
            <p className="text-xs text-center text-app-blue-800">
              Hold your device steady and ensure the question paper is clearly visible
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

// Wrap the component with ErrorBoundary
const QuestionPaperScannerWithErrorBoundary: React.FC<QuestionPaperScannerProps> = (props) => (
  <ErrorBoundary
    fallback={
      <Card className="overflow-hidden shadow-lg border-app-blue-100">
        <div className="p-6 bg-app-blue-50">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="font-semibold text-app-blue-900">Scanner Error</h2>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
            <p className="text-red-800 mb-2">
              There was a problem with the scanner component. Please try again or use the file upload option.
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
    <QuestionPaperScanner {...props} />
  </ErrorBoundary>
);

export default QuestionPaperScannerWithErrorBoundary;

