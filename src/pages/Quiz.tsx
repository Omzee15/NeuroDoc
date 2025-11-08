import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Plus, Clock, FileText, PlayCircle, Edit, Trash2 } from "lucide-react";
import { QuizGenerationDialog } from "@/components/QuizGenerationDialog";
import { QuizTakingDialog } from "@/components/QuizTakingDialog";
import { useDocuments } from "@/contexts/DocumentContext";
import { useState } from "react";
import { Quiz as QuizType } from "@/services/quizService";

const Quiz = () => {
  const { quizzes, removeQuiz, documents } = useDocuments();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizType | null>(null);
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);

  const handleQuizGenerated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDeleteQuiz = (quizId: string) => {
    if (window.confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      removeQuiz(quizId);
    }
  };

  const handleTakeQuiz = (quiz: QuizType) => {
    setSelectedQuiz(quiz);
    setIsQuizDialogOpen(true);
  };

  const getQuizTypeIcon = (type: string) => {
    return type === 'mcq' ? <Brain className="h-4 w-4" /> : <Edit className="h-4 w-4" />;
  };

  const getQuizTypeLabel = (type: string) => {
    return type === 'mcq' ? 'Multiple Choice' : 'Subjective';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quiz Generation</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage AI-generated quizzes from your PDFs
          </p>
        </div>
        <QuizGenerationDialog onQuizGenerated={handleQuizGenerated}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Generate New Quiz
          </Button>
        </QuizGenerationDialog>
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No quizzes yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first AI-powered quiz from a PDF document
            </p>
            <QuizGenerationDialog onQuizGenerated={handleQuizGenerated}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Generate Quiz
              </Button>
            </QuizGenerationDialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => {
            const sourceDocument = documents.find(doc => doc.id === quiz.pdfId);
            
            return (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base leading-tight line-clamp-2">
                        {quiz.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {getQuizTypeIcon(quiz.type)}
                        <span>{getQuizTypeLabel(quiz.type)}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Quiz Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {quiz.totalQuestions} questions
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getDifficultyColor(quiz.difficulty)}`}
                      >
                        {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  {/* Source Document */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span className="truncate">
                      {sourceDocument?.name || quiz.pdfName}
                    </span>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Created {formatDate(quiz.createdAt)}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => handleTakeQuiz(quiz)}
                    >
                      <PlayCircle className="h-3 w-3" />
                      Take Quiz
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="px-2"
                      onClick={() => handleDeleteQuiz(quiz.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats Section */}
      {quizzes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{quizzes.length}</div>
              <div className="text-sm text-muted-foreground">Total Quizzes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {quizzes.filter(q => q.type === 'mcq').length}
              </div>
              <div className="text-sm text-muted-foreground">Multiple Choice</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {quizzes.filter(q => q.type === 'subjective').length}
              </div>
              <div className="text-sm text-muted-foreground">Subjective</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quiz Taking Dialog */}
      <QuizTakingDialog
        quiz={selectedQuiz}
        isOpen={isQuizDialogOpen}
        onClose={() => {
          setIsQuizDialogOpen(false);
          setSelectedQuiz(null);
        }}
      />
    </div>
  );
};

export default Quiz;
