import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText, ScanText, PenTool, AlertTriangle, CheckCircle, Menu, Edit } from "lucide-react";
import { AppStep } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MainNavigationProps {
  currentStep: AppStep;
  onStepChange: (step: AppStep) => void;
}

const MainNavigation: React.FC<MainNavigationProps> = ({
  currentStep,
  onStepChange
}) => {
  const isMobile = useIsMobile();

  // Define the navigation items
  const navItems = [
    {
      id: 'scanQuestion' as AppStep,
      icon: FileText,
      label: 'Scan Question',
      color: 'bg-app-blue-500',
      hoverColor: 'hover:bg-app-blue-600',
      activeColor: 'ring-app-blue-400'
    },
    {
      id: 'manualAnswer' as AppStep,
      icon: Edit,
      label: 'Manual Answer',
      color: 'bg-app-blue-500',
      hoverColor: 'hover:bg-app-blue-600',
      activeColor: 'ring-app-blue-400'
    },
    {
      id: 'scanAnswer' as AppStep,
      icon: ScanText,
      label: 'Scan Answer',
      color: 'bg-app-teal-500',
      hoverColor: 'hover:bg-app-teal-600',
      activeColor: 'ring-app-teal-400'
    },
    {
      id: 'evaluate' as AppStep,
      icon: PenTool,
      label: 'Evaluate Answer',
      color: 'bg-app-blue-500',
      hoverColor: 'hover:bg-app-blue-600',
      activeColor: 'ring-app-blue-400'
    },
    {
      id: 'handwritingStats' as AppStep,
      icon: AlertTriangle,
      label: 'Results & Stats',
      color: 'bg-app-teal-500',
      hoverColor: 'hover:bg-app-teal-600',
      activeColor: 'ring-app-teal-400'
    },
    {
      id: 'results' as AppStep,
      icon: CheckCircle,
      label: 'View Results',
      color: 'bg-app-blue-500',
      hoverColor: 'hover:bg-app-blue-600',
      activeColor: 'ring-app-blue-400'
    }
  ];

  // Find the current step item
  const currentStepItem = navItems.find(item => item.id === currentStep);

  // Render mobile dropdown menu
  if (isMobile) {
    return (
      <div className="mb-6 px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className={`
                w-full flex items-center justify-between
                ${currentStepItem?.color} text-white
                ${currentStepItem?.hoverColor}
                py-6 px-4 rounded-lg shadow-md
              `}
            >
              <div className="flex items-center">
                {currentStepItem && <currentStepItem.icon className="mr-2" size={20} />}
                <span className="font-medium">{currentStepItem?.label || 'Select Step'}</span>
              </div>
              <Menu size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full min-w-[200px]">
            {navItems.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className={`flex items-center py-3 ${currentStep === item.id ? 'bg-slate-100' : ''}`}
                onClick={() => onStepChange(item.id)}
              >
                <item.icon className="mr-2 text-slate-600" size={18} />
                <span>{item.label}</span>
                {currentStep === item.id && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-app-blue-500"></div>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Progress indicator */}
        <div className="mt-4 bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-app-blue-500 rounded-full"
            style={{
              width: `${(navItems.findIndex(item => item.id === currentStep) + 1) * 20}%`
            }}
          ></div>
        </div>

        {/* No offline/online test button for mobile */}
      </div>
    );
  }

  // Render desktop navigation
  return (
    <div className="mb-8">
      <div className="flex flex-wrap justify-center gap-6">
        {navItems.map((item) => (
          <div key={item.id} className="flex flex-col items-center">
            <Button
              onClick={() => onStepChange(item.id)}
              className={`
                flex items-center justify-center
                w-24 h-24 rounded-full p-0
                shadow-lg transition-all duration-300
                ${item.color} text-white
                ${item.hoverColor}
                ${currentStep === item.id ? `ring-4 ${item.activeColor} ring-offset-4` : ''}
                transform hover:scale-110 active:scale-95
              `}
              aria-label={item.label}
            >
              <item.icon size={28} />
            </Button>
            <span className="text-base font-semibold text-black mt-3">{item.label}</span>
            {currentStep === item.id && (
              <div className="mt-1 h-1 w-10 bg-app-blue-500 rounded-full"></div>
            )}
          </div>
        ))}
      </div>

      {/* No offline/online test button here */}
    </div>
  );
};

export default MainNavigation;
