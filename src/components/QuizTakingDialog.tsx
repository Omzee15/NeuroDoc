import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Brain, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Award, 
  FileText,
  RotateCcw,
  PlayCircle
} from "lucide-react";
import { Quiz, MCQQuestion, SubjectiveQuestion, QuizAttempt } from "@/services/quizService";
import { useDocuments } from "@/contexts/DocumentContext";
import { quizService } from "@/services/quizService";
import { toast } from "sonner";

interface QuizTakingDialogProps {
  quiz: Quiz | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuizTakingDialog = ({ quiz, isOpen, onClose }: QuizTakingDialogProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});
  
  const { addQuizAttempt } = useDocuments();

  useEffect(() => {
    if (isOpen && quiz) {
      setStartTime(new Date());
      setCurrentQuestionIndex(0);
      setAnswers({});
      setIsSubmitted(false);
      setScore(null);
      setTimeSpent(0);
      setValidationResults({});
    }
  }, [isOpen, quiz]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && startTime && !isSubmitted) {
      interval = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isOpen, startTime, isSubmitted]);

  if (!quiz) return null;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const canProceed = answers[currentQuestion.id] !== undefined;

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const endTime = new Date();
      const totalTimeSpent = Math.floor((endTime.getTime() - (startTime?.getTime() || Date.now())) / 1000);
      
      let calculatedScore = 0;
      let validation: Record<string, any> = {};

      if (quiz.type === 'mcq') {
        calculatedScore = quizService.calculateMCQScore(quiz, answers);
      } else {
        validation = quizService.validateSubjectiveAnswers(quiz, answers);
        // For subjective, calculate average completeness score
        const scores = Object.values(validation).map((v: any) => v.completenessScore);
        calculatedScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      }

      const attempt: QuizAttempt = {
        id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        quizId: quiz.id,
        answers,
        score: calculatedScore,
        completedAt: endTime.toISOString(),
        timeSpent: totalTimeSpent
      };

      addQuizAttempt(attempt);
      setScore(calculatedScore);
      setTimeSpent(totalTimeSpent);
      setValidationResults(validation);
      setIsSubmitted(true);

      toast.success("Quiz completed successfully!", {
        description: `Your score: ${calculatedScore}%`
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error("Failed to submit quiz. Please try again.");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setIsSubmitted(false);
    setScore(null);
    setStartTime(new Date());
    setTimeSpent(0);
    setValidationResults({});
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Award className="h-6 w-6 text-green-600" />;
    if (score >= 60) return <CheckCircle className="h-6 w-6 text-yellow-600" />;
    return <XCircle className="h-6 w-6 text-red-600" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div>{quiz.title}</div>
              <div className="text-sm font-normal text-muted-foreground mt-1">
                {quiz.type === 'mcq' ? 'Multiple Choice Quiz' : 'Subjective Quiz'} • {quiz.questions.length} Questions
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatTime(timeSpent)}
            </div>
          </DialogTitle>
        </DialogHeader>

        {!isSubmitted ? (
          <div className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            {/* Question */}
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Badge variant="outline">
                    Q{currentQuestionIndex + 1}
                  </Badge>
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-relaxed">
                      {currentQuestion.question}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {currentQuestion.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {quiz.type === 'mcq' ? 'Multiple Choice' : 'Essay Question'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {currentQuestion.type === 'mcq' ? (
                  <RadioGroup
                    value={answers[currentQuestion.id] || ""}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    className="space-y-3"
                  >
                    {(currentQuestion as MCQQuestion).options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                        <Label 
                          htmlFor={`option-${index}`}
                          className="flex-1 cursor-pointer p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-medium">{String.fromCharCode(65 + index)})</span> {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Write your detailed answer here..."
                      className="min-h-[200px] resize-none"
                    />
                    <p className="text-sm text-muted-foreground">
                      💡 Tip: Provide a comprehensive answer covering the key concepts mentioned in the PDF.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={!canProceed}
                className={isLastQuestion ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {isLastQuestion ? 'Submit Quiz' : 'Next Question'}
              </Button>
            </div>
          </div>
        ) : (
          /* Results */
          <div className="space-y-6">
            <Card>
              <CardContent className="py-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  {getScoreIcon(score || 0)}
                  <div>
                    <h3 className="text-2xl font-bold">Quiz Completed!</h3>
                    <p className="text-muted-foreground">
                      You finished in {formatTime(timeSpent)}
                    </p>
                  </div>
                  <div className={`text-4xl font-bold ${getScoreColor(score || 0)}`}>
                    {score}%
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Results */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Question Review</h4>
              {quiz.questions.map((question, index) => {
                const userAnswer = answers[question.id];
                const userAnswerIndex = userAnswer ? parseInt(userAnswer) : -1;
                const isCorrect = quiz.type === 'mcq' ? 
                  userAnswerIndex === (question as MCQQuestion).correctAnswer :
                  undefined;

                return (
                  <Card key={question.id}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline">Q{index + 1}</Badge>
                        <div className="flex-1">
                          <CardTitle className="text-sm">{question.question}</CardTitle>
                        </div>
                        {quiz.type === 'mcq' && (
                          <div className="flex items-center gap-1">
                            {isCorrect ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {quiz.type === 'mcq' ? (
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Your answer: </span>
                            <span className={isCorrect ? "text-green-600" : "text-red-600"}>
                              {userAnswerIndex >= 0 ? `${String.fromCharCode(65 + userAnswerIndex)}) ${(question as MCQQuestion).options[userAnswerIndex]}` : 'No answer'}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div className="text-sm">
                              <span className="font-medium">Correct answer: </span>
                              <span className="text-green-600">
                                {String.fromCharCode(65 + (question as MCQQuestion).correctAnswer)}) {(question as MCQQuestion).options[(question as MCQQuestion).correctAnswer]}
                              </span>
                            </div>
                          )}
                          {(question as MCQQuestion).explanation && (
                            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                              <span className="font-medium">Explanation: </span>
                              {(question as MCQQuestion).explanation}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium text-sm">Your Answer:</span>
                            <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm">
                              {userAnswer || "No answer provided"}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-sm">Model Answer:</span>
                            <div className="mt-1 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm">
                              {(question as SubjectiveQuestion).modelAnswer}
                            </div>
                          </div>
                          {validationResults[question.id] && (
                            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                              <span className="font-medium">Analysis: </span>
                              Word count: {validationResults[question.id].wordCount} | 
                              Completeness: {Math.round(validationResults[question.id].completenessScore)}%
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
              <Button onClick={handleRestart} className="flex-1 gap-2">
                <RotateCcw className="h-4 w-4" />
                Retake Quiz
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};