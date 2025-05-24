import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useUser } from '@/contexts/UserContext';
import { toast } from '@/components/ui/sonner';

interface ClearHistoryDialogProps {
  className?: string;
}

const ClearHistoryDialog: React.FC<ClearHistoryDialogProps> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const { clearEvaluationHistory } = useUser();

  const handleClearHistory = () => {
    clearEvaluationHistory();
    setOpen(false);
    toast.success('Evaluation history cleared successfully');
  };

  return (
    <>
      <Button
        id="clear-history-button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={`text-muted-foreground hover:text-app-red-700 ${className}`}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Clear History
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Evaluation History</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear your evaluation history? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearHistory} className="bg-red-600 hover:bg-red-700">
              Clear History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClearHistoryDialog;
