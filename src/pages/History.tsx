import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser, EvaluationHistoryItem } from '@/contexts/UserContext';
import { History as HistoryIcon, Search, Calendar, User, FileText, Eye, ArrowLeft, Download, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/accessible-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from '@/hooks/use-mobile';
import ClearHistoryDialog from '@/components/ClearHistoryDialog';

const History: React.FC = () => {
  const navigate = useNavigate();
  const { evaluationHistory, isAuthenticated } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationHistoryItem | null>(null);
  const isMobile = useIsMobile();

  // If not authenticated, redirect to login
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Filter evaluations based on search term
  const filteredEvaluations = evaluationHistory.filter(
    (evaluation) =>
      evaluation.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.questionText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };

  // Handle download PDF
  const handleDownloadPDF = () => {
    toast.success("PDF download started", {
      description: "Your results PDF is being generated and will download shortly."
    });

    // Simulate download delay
    setTimeout(() => {
      toast.success("PDF downloaded successfully");
    }, 2000);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className={`flex items-center justify-between mb-6 ${isMobile ? 'flex-col gap-3 items-start' : ''}`}>
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-app-blue-600" />
            <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-app-blue-900`}>Evaluation History</h1>
          </div>
          <div className="flex gap-2">
            <ClearHistoryDialog className={isMobile ? "w-full" : ""} />
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="border-app-blue-200"
              size={isMobile ? "sm" : "default"}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>

        <Card className="shadow-md border-app-blue-100 mb-6">
          <CardHeader className={`bg-app-blue-50 ${isMobile ? 'py-3 px-4' : 'pb-4'}`}>
            <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} text-app-blue-900 flex items-center gap-2`}>
              <Search className="h-5 w-5 text-app-blue-600" />
              Search Evaluations
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? "p-3" : "p-4"}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isMobile ? "Search..." : "Search by student name or question..."}
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isMobile && searchTerm && (
              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="text-xs h-8 px-2 text-muted-foreground"
                >
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {filteredEvaluations.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <HistoryIcon className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} text-slate-300 mx-auto mb-4`} />
            <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-slate-700 mb-2`}>No evaluations found</h2>
            <p className="text-muted-foreground mb-6">
              {searchTerm ? "No evaluations match your search criteria." : "You haven't evaluated any answers yet."}
            </p>
            {searchTerm && !isMobile && (
              <Button
                variant="outline"
                onClick={() => setSearchTerm('')}
                className="border-app-blue-200"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvaluations.map((evaluation) => (
              <Card key={evaluation.id} className="shadow-sm hover:shadow-md transition-shadow border-slate-200">
                <CardContent className={isMobile ? "p-3" : "p-4"}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-app-teal-600" />
                        <h3 className={`font-medium text-app-blue-900 ${isMobile ? 'text-sm' : ''}`}>{evaluation.studentName}</h3>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className={isMobile ? 'text-xs' : 'text-sm'}>{formatDate(evaluation.date)}</span>
                      </div>

                      <div className="flex items-start gap-2 mb-2">
                        <FileText className="h-4 w-4 text-app-blue-600 mt-0.5" />
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-600 line-clamp-2`}>{evaluation.questionText}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>
                          Score: <span className="text-app-teal-600">{evaluation.marksAwarded}/{evaluation.totalMarks}</span>
                          <span className="text-muted-foreground ml-1">
                            ({Math.round((evaluation.marksAwarded / evaluation.totalMarks) * 100)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-app-blue-200 hover:bg-app-blue-50"
                          size={isMobile ? "sm" : "default"}
                          onClick={() => setSelectedEvaluation(evaluation)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {isMobile ? "View" : "View Details"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className={`${isMobile ? 'w-[95vw] max-w-[95vw] p-4' : 'sm:max-w-lg'}`}>
                        <DialogHeader>
                          <DialogTitle className={isMobile ? 'text-base' : ''}>Evaluation Details</DialogTitle>
                        </DialogHeader>
                        {selectedEvaluation && (
                          <div className="space-y-4 mt-2">
                            <div className="flex justify-between items-center pb-2 border-b">
                              <div>
                                <h3 className={`font-medium text-app-blue-900 ${isMobile ? 'text-sm' : ''}`}>{selectedEvaluation.studentName}</h3>
                                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>{formatDate(selectedEvaluation.date)}</p>
                              </div>
                              <div className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-app-teal-600`}>
                                {selectedEvaluation.marksAwarded}/{selectedEvaluation.totalMarks}
                              </div>
                            </div>

                            <div>
                              <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-app-blue-800 mb-1`}>Question</h4>
                              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-600 bg-slate-50 p-3 rounded-md border`}>
                                {selectedEvaluation.questionText}
                              </p>
                            </div>

                            <div className="border rounded-md overflow-hidden">
                              <img
                                src={selectedEvaluation.imageUrl}
                                alt="Answer sheet"
                                className="w-full h-auto object-contain"
                              />
                            </div>

                            <div className="flex justify-end">
                              <Button
                                onClick={handleDownloadPDF}
                                className="bg-app-teal-500 hover:bg-app-teal-600"
                                size={isMobile ? "sm" : "default"}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                {isMobile ? "Download" : "Download PDF"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default History;
