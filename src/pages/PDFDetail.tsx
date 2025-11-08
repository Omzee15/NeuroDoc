import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Trash2, Eye, MessageSquare, Brain, Mic, CheckCircle, RefreshCw, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDocuments } from "@/contexts/DocumentContext";
import { useToast } from "@/hooks/use-toast";
import { geminiService } from "@/services/geminiService";
import { useState } from "react";

const PDFDetail = () => {
  const { id } = useParams();
  const { getDocumentById, removeDocument, updateDocument, generateValidationReport } = useDocuments();
  const { toast } = useToast();
  const [regeneratingSummary, setRegeneratingSummary] = useState(false);
  const [generatingValidation, setGeneratingValidation] = useState(false);
  
  const pdf = getDocumentById(id || '');

  const handleDeletePDF = () => {
    if (pdf) {
      removeDocument(pdf.id);
      toast({
        title: 'Document Deleted',
        description: `${pdf.name} has been removed`,
      });
      // Navigate back to main page
      window.location.href = '/';
    }
  };

  const handleRegenerateSummary = async () => {
    if (!pdf || !pdf.content) return;
    
    setRegeneratingSummary(true);
    try {
      const newSummary = await geminiService.generatePDFSummary(pdf.name, pdf.content);
      updateDocument(pdf.id, { summary: newSummary });
      toast({
        title: 'Summary Regenerated',
        description: 'The AI summary has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate summary. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingSummary(false);
    }
  };

  const handleGenerateValidation = async () => {
    if (!pdf) return;
    
    setGeneratingValidation(true);
    try {
      const report = await generateValidationReport(pdf.id);
      toast({
        title: 'Content Safety Analysis Complete',
        description: `Safety analysis completed with ${report.totalIssues} ${report.totalIssues === 0 ? 'issues found - content appears safe' : 'safety concerns identified'}.`,
      });
    } catch (error) {
      toast({
        title: 'Content Safety Analysis Failed',
        description: 'Failed to analyze content safety. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingValidation(false);
    }
  };

  if (!pdf) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Document Not Found</h1>
        <p className="text-muted-foreground">The requested document could not be found.</p>
        <Button onClick={() => window.location.href = '/'}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{pdf.name}</h1>
          <p className="text-muted-foreground mt-1">
            Document Overview and Details
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {pdf.status}
        </Badge>
      </div>

      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
          <CardDescription>Key details about this PDF</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">File Size</p>
              <p className="text-lg font-semibold">{pdf.size}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pages</p>
              <p className="text-lg font-semibold">{pdf.pages}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upload Date</p>
              <p className="text-lg font-semibold">{pdf.uploadDate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-semibold capitalize">{pdf.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>What would you like to do with this PDF?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start gap-2">
              <Eye className="h-4 w-4" />
              View Full PDF
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat with PDF
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <Brain className="h-4 w-4" />
              Generate Quiz
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <Mic className="h-4 w-4" />
              Create Podcast
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button 
              variant="outline" 
              className="justify-start gap-2"
              onClick={handleGenerateValidation}
              disabled={generatingValidation || pdf.validationStatus === 'validating'}
            >
              {generatingValidation || pdf.validationStatus === 'validating' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  {pdf.validationReport ? 'Re-analyze Content Safety' : 'Analyze Content Safety'}
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              className="justify-start gap-2 text-destructive hover:text-destructive"
              onClick={handleDeletePDF}
            >
              <Trash2 className="h-4 w-4" />
              Delete Document
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Status Card */}
      {(pdf.validationReport || pdf.validationStatus === 'validating') && (
        <Card>
          <CardHeader>
            <CardTitle>Content Safety Analysis</CardTitle>
            <CardDescription>Safety and accuracy assessment</CardDescription>
          </CardHeader>
          <CardContent>
            {pdf.validationStatus === 'validating' && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">
                  Analyzing content for safety issues and harmful content...
                </p>
              </div>
            )}
            {pdf.validationReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className={`text-2xl font-bold ${
                      pdf.validationReport.totalScore >= 90 ? 'text-green-600' :
                      pdf.validationReport.totalScore >= 70 ? 'text-yellow-600' :
                      pdf.validationReport.totalScore >= 50 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {pdf.validationReport.totalScore}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {pdf.validationReport.totalIssues}
                    </div>
                    <div className="text-sm text-muted-foreground">Issues Found</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {pdf.validationReport.categories.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Categories</div>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/validation'}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Full Safety Report
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Summary</CardTitle>
              <CardDescription>Automatically generated summary</CardDescription>
            </div>
            {pdf.status === 'processed' && pdf.content && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRegenerateSummary}
                disabled={regeneratingSummary}
              >
                {regeneratingSummary ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(pdf.status === 'uploading' || pdf.status === 'processing_summary') && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">
                {pdf.status === 'uploading' ? 'Processing document...' : 'Generating AI summary...'}
              </p>
            </div>
          )}
          {pdf.status === 'error' && (
            <p className="text-sm text-destructive">
              Failed to process document. Please try re-uploading.
            </p>
          )}
          {pdf.status === 'processed' && pdf.summary && (
            <div className="prose prose-sm max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {pdf.summary}
              </p>
            </div>
          )}
          {pdf.status === 'processed' && !pdf.summary && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Summary generation is in progress. Please refresh the page in a moment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFDetail;
