
import React, { useState } from 'react';
import { analyzeHandwritingFromText, evaluateAnswer, generateAnswerEvaluationJSON, generateHandwritingAnalysisJSON } from '@/utils/evaluationService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CheckCircle } from 'lucide-react';

const EvaluationDemo: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [totalMarks, setTotalMarks] = useState(10);
  const [modelAnswer, setModelAnswer] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('answer');

  const handleEvaluateAnswer = async () => {
    if (!question || !modelAnswer || !studentAnswer) return;

    const result = await evaluateAnswer(question, totalMarks, modelAnswer, studentAnswer);
    setEvaluationResult(generateAnswerEvaluationJSON(
      result.marksAwarded,
      result.keyPointsCovered,
      result.keyPointsMissing,
      result.evaluationReason
    ));
    setActiveTab('answer');
    setDialogOpen(true);
  };

  const handleAnalyzeHandwriting = () => {
    if (!studentAnswer) return;

    const result = analyzeHandwritingFromText(studentAnswer);
    setEvaluationResult(generateHandwritingAnalysisJSON(result.neatness_score, result.reason));
    setActiveTab('handwriting');
    setDialogOpen(true);
  };

  return (
    <Card className="border-app-teal-100 shadow-lg">
      <CardHeader className="bg-app-blue-50">
        <CardTitle className="text-app-blue-800 flex items-center gap-2">
          <FileText size={20} className="text-app-teal-600" />
          AI Evaluation Demo
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <Tabs defaultValue="answer" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="answer">Answer Evaluation</TabsTrigger>
            <TabsTrigger value="handwriting">Handwriting Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="answer" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Exam Question</Label>
              <Input
                id="question"
                placeholder="Enter the exam question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalMarks">Total Marks</Label>
                <Input
                  id="totalMarks"
                  type="number"
                  min="1"
                  max="100"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(parseInt(e.target.value) || 10)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelAnswer">Model Answer</Label>
              <Textarea
                id="modelAnswer"
                placeholder="Enter the model answer"
                className="min-h-[100px]"
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentAnswer">Student's Answer (Scanned Text)</Label>
              <Textarea
                id="studentAnswer"
                placeholder="Enter or paste scanned text from student's answer"
                className="min-h-[150px]"
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="handwriting" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="handwritingSample">Student's Handwriting Sample (Scanned Text)</Label>
              <Textarea
                id="handwritingSample"
                placeholder="Enter or paste scanned text from student's answer to analyze handwriting neatness"
                className="min-h-[250px]"
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t p-4 bg-app-blue-50">
        <div className="flex gap-3 w-full justify-end">
          <Button
            variant="outline"
            className="border-app-blue-300 hover:bg-app-blue-50"
            onClick={() => {
              setQuestion('');
              setModelAnswer('');
              setStudentAnswer('');
              setTotalMarks(10);
            }}
          >
            Clear
          </Button>

          {activeTab === 'answer' ? (
            <Button
              className="bg-app-teal-500 hover:bg-app-teal-600"
              onClick={handleEvaluateAnswer}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Evaluate Answer
            </Button>
          ) : (
            <Button
              className="bg-app-teal-500 hover:bg-app-teal-600"
              onClick={handleAnalyzeHandwriting}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Analyze Handwriting
            </Button>
          )}
        </div>
      </CardFooter>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeTab === 'answer' ? 'Answer Evaluation Results' : 'Handwriting Analysis Results'}
            </DialogTitle>
          </DialogHeader>

          <div className="bg-black/90 text-green-400 p-4 rounded-md font-mono text-sm overflow-auto max-h-96">
            <pre>{evaluationResult}</pre>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setDialogOpen(false)}
              className="bg-app-blue-500 hover:bg-app-blue-600"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EvaluationDemo;
