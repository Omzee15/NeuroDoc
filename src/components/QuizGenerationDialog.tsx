import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, FileText, Loader2, BookOpen, PenTool } from "lucide-react";
import { useDocuments } from "@/contexts/DocumentContext";
import { QuizGenerationOptions } from "@/services/quizService";
import { toast } from "sonner";

interface QuizGenerationDialogProps {
  children: React.ReactNode;
  onQuizGenerated?: () => void;
}

export const QuizGenerationDialog = ({ children, onQuizGenerated }: QuizGenerationDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string>("");
  const [quizType, setQuizType] = useState<'mcq' | 'subjective'>('mcq');
  const [numberOfQuestions, setNumberOfQuestions] = useState<string>("5");
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const { documents, generateQuiz, isGeneratingQuiz } = useDocuments();

  // Filter only processed documents with content
  const availablePdfs = documents.filter(doc => 
    doc.status === 'processed' && doc.content && doc.content.length > 100
  );

  const handleGenerateQuiz = async () => {
    if (!selectedPdf) {
      toast.error("Please select a PDF document");
      return;
    }

    const selectedDocument = documents.find(doc => doc.id === selectedPdf);
    if (!selectedDocument || !selectedDocument.content) {
      toast.error("Selected PDF has no content available");
      return;
    }

    const options: QuizGenerationOptions = {
      type: quizType,
      numberOfQuestions: parseInt(numberOfQuestions),
      difficulty,
      pdfContent: selectedDocument.content,
      pdfTitle: selectedDocument.name,
      pdfId: selectedDocument.id
    };

    try {
      toast.loading("Generating quiz with AI...", { id: "quiz-generation" });
      
      const quiz = await generateQuiz(options);
      
      toast.success(
        `Successfully generated ${quiz.questions.length} ${quizType.toUpperCase()} questions!`, 
        { id: "quiz-generation" }
      );
      
      setIsOpen(false);
      resetForm();
      onQuizGenerated?.();
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast.error(
        "Failed to generate quiz. Please check your internet connection and try again.",
        { id: "quiz-generation" }
      );
    }
  };

  const resetForm = () => {
    setSelectedPdf("");
    setQuizType('mcq');
    setNumberOfQuestions("5");
    setDifficulty('medium');
  };

  const getDifficultyDescription = (diff: string) => {
    switch (diff) {
      case 'easy':
        return 'Basic recall and understanding questions';
      case 'medium':
        return 'Application and analysis questions';
      case 'hard':
        return 'Complex synthesis and evaluation questions';
      default:
        return '';
    }
  };

  const selectedDocument = selectedPdf ? documents.find(doc => doc.id === selectedPdf) : null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Generate Quiz with AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* PDF Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Select PDF Document</Label>
            {availablePdfs.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No PDF documents with content available. Please upload and process a PDF first.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Select value={selectedPdf} onValueChange={setSelectedPdf}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a PDF document..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePdfs.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{doc.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {doc.pages} pages
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Document Preview */}
          {selectedDocument && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Selected Document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedDocument.name}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">{selectedDocument.size}</Badge>
                    <Badge variant="outline">{selectedDocument.pages} pages</Badge>
                  </div>
                </div>
                {selectedDocument.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {selectedDocument.summary}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quiz Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Quiz Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className={`cursor-pointer transition-all ${
                  quizType === 'mcq' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => setQuizType('mcq')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      quizType === 'mcq' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-medium">Multiple Choice</h3>
                      <p className="text-xs text-muted-foreground">4 options per question</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${
                  quizType === 'subjective' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => setQuizType('subjective')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      quizType === 'subjective' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <PenTool className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-medium">Subjective</h3>
                      <p className="text-xs text-muted-foreground">Essay-type answers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Number of Questions */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Number of Questions</Label>
            <Select value={numberOfQuestions} onValueChange={setNumberOfQuestions}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Questions</SelectItem>
                <SelectItem value="5">5 Questions</SelectItem>
                <SelectItem value="8">8 Questions</SelectItem>
                <SelectItem value="10">10 Questions</SelectItem>
                <SelectItem value="15">15 Questions</SelectItem>
                <SelectItem value="20">20 Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Difficulty Level */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Difficulty Level</Label>
            <Select value={difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setDifficulty(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">
                  <div>
                    <div className="font-medium">Easy</div>
                    <div className="text-xs text-muted-foreground">Basic recall and understanding</div>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div>
                    <div className="font-medium">Medium</div>
                    <div className="text-xs text-muted-foreground">Application and analysis</div>
                  </div>
                </SelectItem>
                <SelectItem value="hard">
                  <div>
                    <div className="font-medium">Hard</div>
                    <div className="text-xs text-muted-foreground">Complex synthesis and evaluation</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {getDifficultyDescription(difficulty)}
            </p>
          </div>

          {/* Generation Summary */}
          {selectedPdf && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-2">Generation Summary</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Document: {selectedDocument?.name}</p>
                  <p>• Type: {quizType === 'mcq' ? 'Multiple Choice Questions' : 'Subjective Questions'}</p>
                  <p>• Questions: {numberOfQuestions}</p>
                  <p>• Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</p>
                  <p className="mt-2 text-orange-600 dark:text-orange-400">
                    ⚡ This will use AI to analyze your PDF and generate custom questions
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              className="flex-1"
              disabled={isGeneratingQuiz}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateQuiz}
              className="flex-1"
              disabled={!selectedPdf || isGeneratingQuiz || availablePdfs.length === 0}
            >
              {isGeneratingQuiz ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Quiz
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};