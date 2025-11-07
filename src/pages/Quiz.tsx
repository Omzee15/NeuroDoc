import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Plus } from "lucide-react";

const quizzes = [
  {
    id: "1",
    title: "Research Paper 2024 Quiz",
    questions: 10,
    difficulty: "Medium",
    createdDate: "2024-01-15",
  },
  {
    id: "2",
    title: "Business Report Assessment",
    questions: 8,
    difficulty: "Easy",
    createdDate: "2024-01-14",
  },
];

const Quiz = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quiz Generation</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage quizzes from your PDFs
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Generate New Quiz
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  <CardDescription>
                    {quiz.questions} questions • {quiz.difficulty} difficulty
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="default" size="sm" className="flex-1">
                  Take Quiz
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Edit
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Created {quiz.createdDate}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {quizzes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No quizzes yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first quiz from a PDF document
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Generate Quiz
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Quiz;
