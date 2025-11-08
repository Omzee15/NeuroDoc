import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Brain, Mic, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { useDocuments } from "@/contexts/DocumentContext";

const Overview = () => {
  const { documents, podcasts } = useDocuments();

  // Calculate stats from real data
  const totalDocs = documents.length;
  const processedDocs = documents.filter(doc => doc.status === 'processed').length;
  const validatedDocs = documents.filter(doc => doc.validationText).length;
  const safeDocs = documents.filter(doc => doc.validationText?.includes('✅')).length;
  const issuesDocs = documents.filter(doc => doc.validationText?.includes('⚠️')).length;
  const totalPodcasts = podcasts.length;

  const stats = [
    {
      title: "Total Documents",
      value: totalDocs.toString(),
      description: `${processedDocs} processed`,
      icon: FileText,
    },
    {
      title: "Content Analysis",
      value: validatedDocs.toString(),
      description: "Safety checks completed",
      icon: Shield,
    },
    {
      title: "Safe Content",
      value: safeDocs.toString(),
      description: "No safety issues found",
      icon: CheckCircle,
    },
    {
      title: "Podcasts Generated",
      value: totalPodcasts.toString(),
      description: "Audio conversations created",
      icon: Mic,
    },
  ];
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
            {documents.length > 0 ? (
              documents.slice(-3).reverse().map((doc) => (
                <div key={doc.id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.status === 'processed' ? 'Processed' : 'Uploaded'} • 
                      {doc.validationText ? ' Content validated' : ' Awaiting validation'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.validationText?.includes('✅') && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {doc.validationText?.includes('⚠️') && (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    <div className="text-sm text-muted-foreground">
                      {doc.pages ? `${doc.pages} pages` : 'PDF'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No documents uploaded yet</p>
                <p className="text-sm">Upload your first PDF to get started</p>
              </div>
            )}
            {podcasts.length > 0 && (
              <div className="flex items-center gap-4 p-3 rounded-lg border">
                <Mic className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium">Latest Podcast</p>
                  <p className="text-sm text-muted-foreground">Audio conversation generated</p>
                </div>
                <div className="text-sm text-muted-foreground">{podcasts.length} total</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
