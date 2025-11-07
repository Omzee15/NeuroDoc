import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Brain, Mic, Globe } from "lucide-react";

const stats = [
  {
    title: "Total PDFs",
    value: "3",
    description: "Documents analyzed",
    icon: FileText,
  },
  {
    title: "Quizzes Generated",
    value: "12",
    description: "Questions created",
    icon: Brain,
  },
  {
    title: "Podcasts",
    value: "2",
    description: "Audio summaries",
    icon: Mic,
  },
  {
    title: "Validations",
    value: "5",
    description: "Content checks",
    icon: Globe,
  },
];

const Overview = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Your PDF analysis dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest PDF analysis activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg border">
              <FileText className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Research Paper 2024.pdf</p>
                <p className="text-sm text-muted-foreground">Uploaded 2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg border">
              <Brain className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Generated quiz from Business Report</p>
                <p className="text-sm text-muted-foreground">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg border">
              <Mic className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Created podcast from User Manual</p>
                <p className="text-sm text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
