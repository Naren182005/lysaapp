import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";
import { DOMAIN_SUBJECTS } from './DomainSelection';

interface SubjectSelectionProps {
  domain: string;
  onSelectSubject: (subjectId: string) => void;
  onBack: () => void;
}

const SubjectSelection: React.FC<SubjectSelectionProps> = ({ domain, onSelectSubject, onBack }) => {
  const [selectedSubject, setSelectedSubject] = React.useState<string>('');
  const availableSubjects = DOMAIN_SUBJECTS[domain] || [];

  const handleContinue = () => {
    if (selectedSubject) {
      onSelectSubject(selectedSubject);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-app-blue-100">
      <CardHeader className="bg-app-blue-50">
        <CardTitle className="text-lg text-app-blue-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Select Subject
        </CardTitle>
        <CardDescription>
          Choose a subject to start the MCQ test
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 pb-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Select
              value={selectedSubject}
              onValueChange={setSelectedSubject}
            >
              <SelectTrigger id="subject" className="w-full">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between bg-slate-50 p-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-app-blue-200 text-app-blue-700 hover:bg-app-blue-50"
        >
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!selectedSubject}
          className="bg-app-blue-600 hover:bg-app-blue-700"
        >
          Continue
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SubjectSelection;
