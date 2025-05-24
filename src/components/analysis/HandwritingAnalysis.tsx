import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, AlertTriangle, Info, ZoomIn, ZoomOut, RotateCw, Maximize, PenTool, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from '@/hooks/use-mobile';

interface HandwritingFeedback {
  category: string;
  score: number;
  feedback: string;
  suggestions: string[];
}

interface HandwritingAnalysisProps {
  imageUrl: string;
  overallScore: number;
  feedbackItems: HandwritingFeedback[];
}

const HandwritingAnalysis: React.FC<HandwritingAnalysisProps> = ({
  imageUrl,
  overallScore,
  feedbackItems
}) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('overview');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Helper function to determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 5) return "text-amber-600";
    return "text-red-600";
  };

  // Helper function to determine progress color based on score
  const getProgressColor = (score: number) => {
    if (score >= 8) return "bg-green-600";
    if (score >= 5) return "bg-amber-600";
    return "bg-red-600";
  };

  // Helper function to get emoji based on score
  const getScoreEmoji = (score: number) => {
    if (score >= 8) return "😀";
    if (score >= 5) return "🙂";
    return "😕";
  };

  // Zoom in function
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  // Zoom out function
  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  // Rotate function
  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Reset zoom and rotation
  const resetView = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  // Toggle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategory(prev => prev === category ? null : category);
  };

  return (
    <Card className="shadow-md border-app-blue-100">
      <CardHeader className="bg-app-blue-50 pb-4">
        <CardTitle className="text-lg text-app-blue-900 flex items-center gap-2">
          <PenTool className="h-5 w-5 text-app-blue-600" />
          Handwriting Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview" className="text-sm">
              <Info className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="details" className="text-sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="image" className="text-sm">
              <PenTool className="h-4 w-4 mr-2" />
              Sample
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="bg-app-blue-50 p-4 rounded-lg border border-app-blue-100">
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-app-blue-900">Overall Neatness Score</h3>
                    <div className="flex items-center">
                      <span className={`font-bold text-lg ${getScoreColor(overallScore)}`}>
                        {overallScore}/10
                      </span>
                      <span className="text-2xl ml-2">{getScoreEmoji(overallScore)}</span>
                    </div>
                  </div>
                  <Progress
                    value={overallScore * 10}
                    className="h-3 bg-app-blue-100"
                    indicatorClassName={getProgressColor(overallScore)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
                {feedbackItems.map((item, index) => (
                  <div
                    key={index}
                    className={`border rounded-md p-3 ${
                      selectedCategory === item.category
                        ? 'bg-app-blue-100 border-app-blue-300'
                        : 'bg-white hover:bg-app-blue-50'
                    } cursor-pointer transition-colors`}
                    onClick={() => toggleCategory(item.category)}
                  >
                    <div className="flex flex-col items-center text-center">
                      <h4 className="font-medium text-app-blue-800 mb-1">{item.category}</h4>
                      <div className={`text-xl font-bold ${getScoreColor(item.score)}`}>
                        {item.score}
                      </div>
                      <div className="text-2xl mt-1">{getScoreEmoji(item.score)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedCategory && (
                <div className="mt-4 p-4 bg-white rounded-md border border-app-blue-200">
                  {feedbackItems
                    .filter(item => item.category === selectedCategory)
                    .map((item, index) => (
                      <div key={index}>
                        <h4 className="font-medium text-app-blue-800 mb-2 flex items-center">
                          <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
                          {item.category} Feedback
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">{item.feedback}</p>
                        {item.suggestions.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-app-blue-700 mb-2">Improvement Suggestions:</h5>
                            <ul className="text-sm space-y-2 ml-1">
                              {item.suggestions.map((suggestion, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-slate-600">{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <div className="space-y-6">
                {feedbackItems.map((item, index) => (
                  <div key={index} className="border rounded-md p-4 bg-white">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.score >= 8 ? 'bg-green-100' :
                        item.score >= 5 ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        <span className="text-lg">{getScoreEmoji(item.score)}</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-app-blue-800">{item.category}</h4>
                        <div className="flex items-center">
                          <Progress
                            value={item.score * 10}
                            className="h-1.5 w-24 bg-app-blue-100"
                            indicatorClassName={getProgressColor(item.score)}
                          />
                          <span className={`ml-2 text-sm font-medium ${getScoreColor(item.score)}`}>
                            {item.score}/10
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-10">
                      <p className="text-sm text-muted-foreground mb-3">{item.feedback}</p>
                      {item.suggestions.length > 0 && (
                        <div className="mt-3 bg-slate-50 p-3 rounded-md border border-slate-100">
                          <h5 className="text-sm font-medium text-app-blue-700 mb-2 flex items-center">
                            <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
                            How to Improve
                          </h5>
                          <ul className="text-sm space-y-2">
                            {item.suggestions.map((suggestion, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600">{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="image" className="space-y-4">
            <div className="bg-app-blue-50 p-4 rounded-lg border border-app-blue-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-app-blue-900">Handwriting Sample</h3>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={zoomIn}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={zoomOut}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={rotate}
                    className="h-8 w-8 p-0"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetView}
                    className="h-8 w-8 p-0"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden bg-black flex items-center justify-center h-[400px]">
                <img
                  src={imageUrl}
                  alt="Handwriting sample"
                  className="max-w-full max-h-full object-contain transition-all duration-300"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  }}
                />
              </div>

              <div className="mt-4 text-sm text-center text-muted-foreground">
                Use the controls above to zoom and rotate the image for better analysis
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default HandwritingAnalysis;
