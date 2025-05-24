import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Briefcase } from "lucide-react";

// Define available domains
export const DOMAINS = {
  SCIENCE: 'science',
  ARTS: 'arts'
};

// Define subjects for each domain
export const DOMAIN_SUBJECTS = {
  [DOMAINS.SCIENCE]: [
    { id: 'physics', name: 'Physics' },
    { id: 'chemistry', name: 'Chemistry' },
    { id: 'mathematics', name: 'Mathematics' },
    { id: 'biology', name: 'Biology' },
    { id: 'english', name: 'English' },
    { id: 'computer_science', name: 'Computer Science' },
  ],
  [DOMAINS.ARTS]: [
    { id: 'accountancy', name: 'Accountancy' },
    { id: 'economics', name: 'Economics' },
    { id: 'business_studies', name: 'Business Studies' },
    { id: 'english', name: 'English' },
    { id: 'history', name: 'History' },
    { id: 'political_science', name: 'Political Science' },
  ]
};

interface DomainSelectionProps {
  onSelectDomain: (domain: string) => void;
  onBack: () => void;
}

const DomainSelection: React.FC<DomainSelectionProps> = ({ onSelectDomain, onBack }) => {
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-app-blue-100">
      <CardHeader className="bg-app-blue-50">
        <CardTitle className="text-lg text-app-blue-900">
          Select Domain
        </CardTitle>
        <CardDescription>
          Choose a domain to continue
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => onSelectDomain(DOMAINS.SCIENCE)}
            variant="outline"
            className="h-auto py-6 flex flex-col items-center justify-center gap-3 hover:bg-app-blue-50 hover:border-app-blue-300"
          >
            <BookOpen className="h-10 w-10 text-app-blue-600" />
            <div className="text-center">
              <h3 className="font-medium text-app-blue-800 mb-1">Science</h3>
            </div>
          </Button>

          <Button
            onClick={() => onSelectDomain(DOMAINS.ARTS)}
            variant="outline"
            className="h-auto py-6 flex flex-col items-center justify-center gap-3 hover:bg-app-blue-50 hover:border-app-blue-300"
          >
            <Briefcase className="h-10 w-10 text-app-blue-600" />
            <div className="text-center">
              <h3 className="font-medium text-app-blue-800 mb-1">Arts</h3>
            </div>
          </Button>
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
      </CardFooter>
    </Card>
  );
};

export default DomainSelection;
