import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, CheckCircle, XCircle, AlertCircle, Plus } from "lucide-react";

const validations = [
  {
    id: "1",
    title: "Research Paper 2024 Validation",
    status: "completed",
    accuracy: 95,
    issues: 2,
    date: "2024-01-15",
  },
  {
    id: "2",
    title: "Business Report Validation",
    status: "in-progress",
    accuracy: 0,
    issues: 0,
    date: "2024-01-15",
  },
];

const Validation = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Validation</h1>
          <p className="text-muted-foreground mt-1">
            Validate facts and check content accuracy
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Validation
        </Button>
      </div>

      <div className="grid gap-4">
        {validations.map((validation) => (
          <Card key={validation.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{validation.title}</CardTitle>
                    <CardDescription>
                      Validated {validation.date}
                    </CardDescription>
                  </div>
                </div>
                {validation.status === "completed" ? (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">Completed</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-yellow-500">In Progress</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {validation.status === "completed" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Accuracy Score
                    </span>
                    <span className="text-2xl font-bold text-green-500">
                      {validation.accuracy}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${validation.accuracy}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span>{validation.issues} issues found</span>
                    </div>
                    <Button variant="outline" size="sm">
                      View Report
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Validation in progress...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Validation;
