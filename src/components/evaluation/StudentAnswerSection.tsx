
import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface StudentAnswerSectionProps {
  studentAnswer: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  imageUrl: string;
}

const StudentAnswerSection: React.FC<StudentAnswerSectionProps> = ({
  studentAnswer,
  onChange,
  imageUrl
}) => {
  return (
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
        onChange={onChange}
        placeholder="Extracted text from the scanned answer..."
        className="min-h-[150px] focus:border-app-teal-300"
      />
    </div>
  );
};

export default StudentAnswerSection;
