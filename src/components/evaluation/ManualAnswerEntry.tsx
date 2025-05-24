import React, { useState, useEffect, useRef } from 'react';
import { Edit, FileText, Upload, Check, Camera, ScanText, ToggleLeft, ToggleRight, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/accessible-toast";
import { useIsMobile } from '@/hooks/use-mobile';
import { generateModelAnswer, extractTextFromImage } from "@/utils/evaluationService";
import { handleAsyncError } from '@/utils/errorHandling';
import ModelAnswerScanner from './ModelAnswerScanner';
import NumberedMCQAnswerEntry from './NumberedMCQAnswerEntry';

interface ManualAnswerEntryProps {
  questionText: string;
  questionImageUrl: string;
  onComplete: (modelAnswer: string) => void;
}

const ManualAnswerEntry: React.FC<ManualAnswerEntryProps> = ({
  questionText,
  questionImageUrl,
  onComplete
}) => {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelAnswer, setModelAnswer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isMCQMode, setIsMCQMode] = useState(false);

  // Initialize with the question text if available
  useEffect(() => {
    if (questionText) {
      console.log("Question text received in ManualAnswerEntry:", questionText);
    } else {
      console.warn("No question text received in ManualAnswerEntry");
    }
  }, [questionText]);

  const handleModelAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setModelAnswer(e.target.value);
  };

  const handleGenerateAnswer = async () => {
    if (!questionText || questionText.trim() === '') {
      toast.error("No question text available", {
        description: "Please scan a question paper first."
      });
      return;
    }

    setIsGenerating(true);
    toast.loading("Generating model answer...");

    try {
      const generatedAnswer = await generateModelAnswer(questionText);
      setModelAnswer(generatedAnswer);

      // Check if this is likely an MCQ answer (contains A, B, C, or D options)
      const isMCQAnswer = /^[A-D]$/i.test(generatedAnswer.trim()) ||
                          generatedAnswer.split('\n').every(line => /^[A-D]$/i.test(line.trim()));

      // If it's an MCQ answer, automatically switch to MCQ mode
      if (isMCQAnswer) {
        setIsMCQMode(true);
      }

      toast.success("Model answer generated");
    } catch (error) {
      console.error("Error generating model answer:", error);
      toast.error("Failed to generate model answer", {
        description: "Please try again or enter the answer manually."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = () => {
    if (!modelAnswer || modelAnswer.trim() === '') {
      toast.error("Model answer is required", {
        description: "Please enter a model answer, scan one, or generate one."
      });
      return;
    }

    console.log("Submitting model answer:", modelAnswer);
    toast.success("Model answer saved", {
      description: "Proceeding to scan student answer sheet"
    });
    onComplete(modelAnswer);
  };

  const handleScanModelAnswer = () => {
    console.log("Opening model answer scanner");
    setShowScanner(true);
  };

  const handleScanComplete = (text: string, imageUrl: string) => {
    console.log("Scan complete, received text:", text);
    setModelAnswer(text);
    setShowScanner(false);

    // Check if this is likely an MCQ answer (contains A, B, C, or D options)
    const isMCQAnswer = text.split('\n').every(line => /^[A-D]$/i.test(line.trim()));

    // If it's an MCQ answer, automatically switch to MCQ mode
    if (isMCQAnswer) {
      setIsMCQMode(true);
    }

    toast.success("Model answer scanned successfully!", {
      description: "You can now edit the text if needed before continuing."
    });
  };

  const handleScanCancel = () => {
    setShowScanner(false);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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

    setIsUploading(true);
    toast.loading("Processing uploaded image...");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      if (!imageUrl) {
        toast.error("Failed to load image");
        setIsUploading(false);
        return;
      }

      // Process the image with OCR
      const [extractedText, error] = await handleAsyncError(
        extractTextFromImage(imageUrl, false), // false indicates this is not a question paper
        (err) => {
          console.error("Error processing image:", err);
          toast.error("Error processing image", {
            description: "Could not extract text from the image. Please try again with a clearer image."
          });
        }
      );

      if (extractedText) {
        console.log("Model answer extracted from uploaded file:", extractedText);
        setModelAnswer(extractedText);

        // Check if this is likely an MCQ answer (contains A, B, C, or D options)
        const isMCQAnswer = extractedText.split('\n').every(line => {
          const trimmed = line.trim();
          return trimmed === '' || /^[A-D]$/i.test(trimmed);
        });

        // If it's an MCQ answer, automatically switch to MCQ mode
        if (isMCQAnswer) {
          setIsMCQMode(true);
        }

        toast.success("Model answer extracted from image", {
          description: "You can now edit the text if needed before continuing."
        });
      } else {
        toast.error("Failed to extract text from image", {
          description: "Please try again with a clearer image or enter the model answer manually."
        });
      }

      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  return (
    <>
      {showScanner ? (
        <ModelAnswerScanner
          onCapture={handleScanComplete}
          onCancel={handleScanCancel}
        />
      ) : (
        <Card className="overflow-hidden shadow-lg border-app-blue-100">
          <div className={`${isMobile ? 'p-3' : 'p-4'} bg-app-blue-50`}>
            <div className="flex items-center gap-2 mb-2">
              <Edit className="h-5 w-5 text-app-blue-600" />
              <h2 className="font-semibold text-app-blue-900">Enter Model Answer</h2>
            </div>
            <p className={`text-sm text-muted-foreground ${isMobile ? 'mb-2' : 'mb-4'}`}>
              Generate, scan, upload, or manually enter the model answer for the question
            </p>

            {questionImageUrl && (
              <div className="mb-4 border rounded-lg overflow-hidden">
                <img
                  src={questionImageUrl}
                  alt="Scanned question paper"
                  className="w-full object-contain max-h-48"
                />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="question-text" className="text-app-blue-800">Question</Label>
                <Textarea
                  id="question-text"
                  value={questionText || "No question text available. You can still enter a model answer manually."}
                  readOnly
                  className="min-h-[80px] bg-white/50 focus:border-app-blue-300 focus:ring-2 focus:ring-app-blue-500 shadow-sm"
                  placeholder="Question text will appear here..."
                />
                {!questionText && (
                  <p className="text-xs text-amber-600 mt-1">
                    Warning: No question text available. You can still proceed with entering a model answer.
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="model-answer" className="text-app-blue-800">Model Answer</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMCQMode(!isMCQMode)}
                      className="text-xs flex items-center gap-1 text-app-blue-600 hover:text-app-blue-800"
                    >
                      {isMCQMode ? (
                        <>
                          <ToggleRight className="h-4 w-4" />
                          <span>MCQ</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4" />
                          <span>Text</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleScanModelAnswer}
                      className="text-xs border-app-blue-300 hover:bg-app-blue-50"
                    >
                      <ScanText className="mr-1 h-3 w-3" />
                      Scan Answer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={triggerFileInput}
                      disabled={isUploading}
                      className="text-xs border-app-blue-300 hover:bg-app-blue-50"
                    >
                      {isUploading ? (
                        <>Uploading...</>
                      ) : (
                        <>
                          <Upload className="mr-1 h-3 w-3" />
                          Upload Answer
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateAnswer}
                      disabled={isGenerating || !questionText}
                      className="text-xs border-app-blue-300 hover:bg-app-blue-50"
                    >
                      {isGenerating ? (
                        <>Generating...</>
                      ) : (
                        <>
                          <FileText className="mr-1 h-3 w-3" />
                          Generate Answer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                {isMCQMode ? (
                  <div className="mt-2">
                    <NumberedMCQAnswerEntry
                      value={modelAnswer}
                      onChange={setModelAnswer}
                    />
                  </div>
                ) : (
                  <Textarea
                    id="model-answer"
                    value={modelAnswer}
                    onChange={handleModelAnswerChange}
                    className={`${isMobile ? 'min-h-[120px]' : 'min-h-[150px]'} focus:border-app-blue-300 focus:ring-2 focus:ring-app-blue-500 shadow-sm`}
                    placeholder="Enter, scan, upload, or generate the model answer..."
                  />
                )}
              </div>
            </div>

            <div className={`flex ${isMobile ? 'flex-col' : 'justify-end'} gap-2 mt-4`}>
              <Button
                onClick={handleSubmit}
                className={`bg-app-blue-500 hover:bg-app-blue-600 transition-all shadow-md focus:ring-2 focus:ring-app-blue-300 focus:ring-offset-2 ${isMobile ? 'w-full py-6 text-lg' : ''}`}
                aria-label="Continue to scan answer"
                size={isMobile ? "default" : "lg"}
              >
                <Check className="mr-2 h-4 w-4" />
                Continue to Scan Answer
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};

export default ManualAnswerEntry;
