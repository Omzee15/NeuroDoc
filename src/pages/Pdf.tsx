import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Trash2, Eye, Brain, Mic, Shield } from "lucide-react";
import { useDocuments } from "@/contexts/DocumentContext";
import { useNavigate } from "react-router-dom";

const Pdf = () => {
  const { documents, removeDocument } = useDocuments();
  const navigate = useNavigate();

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getValidationBadge = (document: any) => {
    if (document.validationReport) {
      const score = document.validationReport.totalScore;
      if (score >= 90) return { text: 'Excellent', color: 'bg-green-100 text-green-700' };
      if (score >= 70) return { text: 'Good', color: 'bg-yellow-100 text-yellow-700' };
      if (score >= 50) return { text: 'Fair', color: 'bg-orange-100 text-orange-700' };
      return { text: 'Poor', color: 'bg-red-100 text-red-700' };
    }
    if (document.validationStatus === 'validating') {
      return { text: 'Validating', color: 'bg-blue-100 text-blue-700' };
    }
    return null;
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">PDF Management</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your uploaded PDF documents
        </p>
      </div>

      <div className="grid gap-4">
        {documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <div className="p-4 rounded-full bg-muted mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Documents</h3>
              <p className="text-muted-foreground mb-4 text-center">
                Upload your first PDF document to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          documents.map((document) => {
            const validationBadge = getValidationBadge(document);
            
            return (
              <Card key={document.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{document.name}</CardTitle>
                          {validationBadge && (
                            <Badge className={validationBadge.color}>
                              {validationBadge.text}
                            </Badge>
                          )}
                        </div>
                        <CardDescription>
                          {document.pages} pages • {document.size} • Uploaded {formatDate(document.uploadDate)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => navigate(`/pdf/${document.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeDocument(document.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => navigate('/quiz')}
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Generate Quiz
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => navigate('/podcast')}
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Create Podcast
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => navigate('/validation')}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Validate Content
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Pdf;
