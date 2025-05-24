import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MCQEvaluationTest from '@/components/mcq/MCQEvaluationTest';
import SubjectSelection from '@/components/forms/SubjectSelection';
import DomainSelection from '@/components/forms/DomainSelection';
import OnlineMCQTest from '@/components/mcq/OnlineMCQTest';
import TestResults from '@/components/evaluation/TestResults';
import { MCQTestResult } from '@/components/mcq/OnlineMCQTest';
import { useUser } from '@/contexts/UserContext';
import { useOnlineMode } from '@/contexts/OnlineModeContext';

// Define the steps of the online MCQ test flow
type TestStep = 'domain' | 'subject' | 'test' | 'results' | 'offline';

const MCQTestPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();
  const { isOnlineMode } = useOnlineMode();
  const [currentStep, setCurrentStep] = useState<TestStep>(isOnlineMode ? 'domain' : 'offline');

  // Update current step when online mode changes
  useEffect(() => {
    setCurrentStep(isOnlineMode ? 'domain' : 'offline');
  }, [isOnlineMode]);

  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [testResult, setTestResult] = useState<MCQTestResult | null>(null);

  // Handle domain selection
  const handleSelectDomain = (domainId: string) => {
    setSelectedDomain(domainId);
    setCurrentStep('subject');
  };

  // Handle subject selection
  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setCurrentStep('test');
  };

  // Handle test completion
  const handleTestComplete = (result: MCQTestResult) => {
    console.log('Test completed with result:', result);
    setTestResult(result);
    setCurrentStep('results');
  };

  // Handle retake test
  const handleRetakeTest = () => {
    setCurrentStep('test');
  };

  // Handle go to home
  const handleGoHome = () => {
    navigate('/');
  };

  // Render the appropriate component based on the current step
  const renderContent = () => {
    if (!isOnlineMode) {
      return <MCQEvaluationTest />;
    }

    switch (currentStep) {
      case 'domain':
        return (
          <DomainSelection
            onSelectDomain={handleSelectDomain}
            onBack={handleGoHome}
          />
        );
      case 'subject':
        return (
          <SubjectSelection
            domain={selectedDomain}
            onSelectSubject={handleSelectSubject}
            onBack={() => setCurrentStep('domain')}
          />
        );
      case 'test':
        return (
          <OnlineMCQTest
            subject={selectedSubject}
            onComplete={handleTestComplete}
            onBack={() => setCurrentStep('subject')}
          />
        );
      case 'results':
        return testResult ? (
          <TestResults
            result={testResult}
            subject={selectedSubject}
            onRetake={handleRetakeTest}
            onHome={handleGoHome}
          />
        ) : null;
      default:
        return <MCQEvaluationTest />;
    }
  };

  return (
    <div className="min-h-screen bg-app-blue-50/30 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoHome}
            className="text-muted-foreground hover:text-app-blue-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-app-blue-900 mb-8 text-center">
          {isOnlineMode ? 'Online MCQ Test' : 'MCQ Answer Evaluation Test'}
        </h1>

        {renderContent()}
      </div>
    </div>
  );
};

export default MCQTestPage;
