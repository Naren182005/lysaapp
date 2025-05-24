
import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaperclipIcon, BookOpenIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/components/ui/sonner";

interface QuestionPaperSectionProps {
  questionPaper: string;
  setQuestionPaper: (value: string) => void;
  questionPaperImageUrl: string;
  setQuestionPaperImageUrl: (url: string) => void;
  showQuestionPaper: boolean;
  setShowQuestionPaper: (show: boolean) => void;
}

const QuestionPaperSection: React.FC<QuestionPaperSectionProps> = ({
  questionPaper,
  setQuestionPaper,
  questionPaperImageUrl,
  setQuestionPaperImageUrl,
  showQuestionPaper,
  setShowQuestionPaper
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleQuestionPaperChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestionPaper(e.target.value);
  };
  
  const handleQuestionPaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setQuestionPaperImageUrl(event.target.result.toString());
        toast.success("Question paper uploaded successfully!");
      }
    };
    reader.readAsDataURL(file);
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Collapsible open={showQuestionPaper} onOpenChange={setShowQuestionPaper} className="transition-all duration-300">
      <div className="flex justify-between items-center mb-2">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="outline" 
            className="flex items-center gap-2 text-app-blue-700 hover:bg-app-blue-50 border-app-blue-200 shadow-sm"
          >
            <BookOpenIcon size={16} />
            {showQuestionPaper ? "Hide Question Paper" : "Add Question Paper"}
          </Button>
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent className="space-y-4 border rounded-md p-5 bg-app-blue-50/50 animate-fade-in">
        <div className="space-y-2">
          <Label htmlFor="question-paper" className="text-app-blue-800">Question Paper Text</Label>
          <Textarea
            id="question-paper"
            value={questionPaper}
            onChange={handleQuestionPaperChange}
            placeholder="Enter the question paper text..."
            className="min-h-[80px] focus:border-app-teal-300"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-app-blue-800">Question Paper Attachment</Label>
          <div className="flex gap-2">
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
              className="flex gap-2 border-app-blue-200 hover:border-app-blue-300 hover:bg-app-blue-50"
              onClick={triggerFileInput}
            >
              <PaperclipIcon size={16} />
              Upload Question Paper
            </Button>
            
            {questionPaperImageUrl && (
              <Button 
                type="button" 
                variant="link" 
                className="text-app-teal-600 hover:text-app-teal-700 p-0 h-auto"
                onClick={() => window.open(questionPaperImageUrl, '_blank')}
              >
                View Uploaded Question Paper
              </Button>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default QuestionPaperSection;
