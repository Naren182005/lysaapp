import React from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, ScanText, PenTool, AlertTriangle, CheckCircle } from "lucide-react";
import { AppStep } from '@/types';

interface StepNavigationProps {
  currentStep: AppStep;
  onStepChange: (step: AppStep) => void;
  stepsCompleted: {
    scanQuestion: boolean;
    scanAnswer: boolean;
    evaluate: boolean;
    handwritingStats: boolean;
    results: boolean;
  };
}

const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  onStepChange,
  stepsCompleted
}) => {
  // Define the steps and their properties
  const steps = [
    {
      id: 'scanQuestion' as AppStep,
      icon: FileText,
      label: 'Scan Question Paper',
      description: 'Scan and extract text from the question paper',
      color: 'bg-app-blue-500',
      hoverColor: 'hover:bg-app-blue-600',
      lightColor: 'bg-app-blue-100'
    },
    {
      id: 'scanAnswer' as AppStep,
      icon: ScanText,
      label: 'Scan Answer Sheet',
      description: 'Scan and extract text from the student answer sheet',
      color: 'bg-app-teal-500',
      hoverColor: 'hover:bg-app-teal-600',
      lightColor: 'bg-app-blue-100'
    },
    {
      id: 'evaluate' as AppStep,
      icon: PenTool,
      label: 'Handwriting Analysis',
      description: 'Analyze handwriting quality and provide feedback',
      color: 'bg-app-teal-500',
      hoverColor: 'hover:bg-app-teal-600',
      lightColor: 'bg-app-blue-100'
    },
    {
      id: 'handwritingStats' as AppStep,
      icon: AlertTriangle,
      label: 'Handwriting Statistics',
      description: 'View detailed statistics and grading of handwriting',
      color: 'bg-app-teal-500',
      hoverColor: 'hover:bg-app-teal-600',
      lightColor: 'bg-app-blue-100'
    },
    {
      id: 'results' as AppStep,
      icon: CheckCircle,
      label: 'View Results',
      description: 'View and print evaluation results',
      color: 'bg-app-teal-500',
      hoverColor: 'hover:bg-app-teal-600',
      lightColor: 'bg-app-blue-100'
    }
  ];

  // Check if a step is accessible
  const isStepAccessible = (stepId: AppStep): boolean => {
    switch (stepId) {
      case 'scanQuestion':
        return true; // Always accessible
      case 'scanAnswer':
        return stepsCompleted.scanQuestion;
      case 'evaluate':
        return stepsCompleted.scanAnswer;
      case 'handwritingStats':
        return stepsCompleted.evaluate;
      case 'results':
        return stepsCompleted.handwritingStats;
      default:
        return false;
    }
  };

  return (
    <div className="mb-8">
      {/* Mobile view - show only current step with next/prev */}
      <div className="md:hidden flex flex-col items-center gap-4">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Step {steps.findIndex(s => s.id === currentStep) + 1} of {steps.length}</span>
        </div>
        <div className="flex items-center justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="lg"
                  className={`w-16 h-16 rounded-full ${
                    steps.find(s => s.id === currentStep)?.color || 'bg-app-blue-500'
                  } text-white shadow-md`}
                  aria-label={steps.find(s => s.id === currentStep)?.label}
                >
                  {React.createElement(steps.find(s => s.id === currentStep)?.icon || FileText, { size: 24 })}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{steps.find(s => s.id === currentStep)?.label}</p>
                <p className="text-xs text-muted-foreground">{steps.find(s => s.id === currentStep)?.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="text-center">
          <h3 className="font-medium text-app-blue-900">{steps.find(s => s.id === currentStep)?.label}</h3>
        </div>
      </div>

      {/* Desktop view - show all steps */}
      <div className="hidden md:flex items-center justify-center">
        <div className="flex items-center">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`flex items-center justify-center w-14 h-14 rounded-full shadow-md transition-all duration-300 ${
                        currentStep === step.id
                          ? `${step.color} text-white ring-2 ring-offset-2 ring-${step.color}`
                          : stepsCompleted[step.id]
                            ? `${step.color} text-white`
                            : `${step.lightColor} text-app-blue-900`
                      } ${isStepAccessible(step.id) ? step.hoverColor : 'cursor-not-allowed opacity-70'}`}
                      onClick={() => isStepAccessible(step.id) && onStepChange(step.id)}
                      disabled={!isStepAccessible(step.id)}
                      aria-label={step.label}
                    >
                      <step.icon size={22} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                    {!isStepAccessible(step.id) && (
                      <p className="text-xs text-amber-600 mt-1">Complete previous steps first</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Connector (if not the last step) */}
              {index < steps.length - 1 && (
                <div className={`h-1.5 w-12 transition-all duration-300 ${
                  index < steps.findIndex(s => s.id === currentStep) ||
                  (stepsCompleted[step.id] && stepsCompleted[steps[index + 1].id])
                    ? step.color
                    : 'bg-muted'
                }`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step labels for desktop */}
      <div className="hidden md:flex justify-center mt-4">
        <div className="grid grid-cols-5 gap-4 text-center max-w-3xl">
          {steps.map((step) => (
            <div key={`label-${step.id}`} className="px-2">
              <p className={`text-xs font-medium ${currentStep === step.id ? 'text-app-blue-900' : 'text-muted-foreground'}`}>
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StepNavigation;
