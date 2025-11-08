import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Trash2, Eye, EyeOff, MessageSquare, Brain, Mic, CheckCircle, RefreshCw, Shield, Highlighter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDocuments } from "@/contexts/DocumentContext";
import { useToast } from "@/hooks/use-toast";
import { geminiService } from "@/services/geminiService";
import { useState } from "react";
import PDFViewer from "@/components/PDFViewer";

const PDFDetail = () => {
  const { id } = useParams();
  const { getDocumentById, removeDocument, updateDocument, generateDirectValidation, generateSummaryByType, generateHighlights } = useDocuments();
  const { toast } = useToast();
  const [regeneratingSummary, setRegeneratingSummary] = useState(false);
  const [generatingValidation, setGeneratingValidation] = useState(false);
  const [selectedSummaryType, setSelectedSummaryType] = useState<'short' | 'detailed'>('short');
  const [generatingHighlights, setGeneratingHighlights] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  
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

  const handleGenerateHighlights = async () => {
    if (!pdf || !pdf.content) return;
    
    setGeneratingHighlights(true);
    try {
      const phrases = await generateHighlights(pdf.id);
      setShowHighlights(true);
      toast({
        title: 'Highlights Generated',
        description: `Generated ${phrases.length} important phrases for highlighting.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate highlights. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingHighlights(false);
    }
  };

  const handleRegenerateSummary = async () => {
    if (!pdf || !pdf.content) return;
    
    setRegeneratingSummary(true);
    try {
      const newSummary = await generateSummaryByType(pdf.id, selectedSummaryType);
      toast({
        title: 'Summary Regenerated',
        description: `The AI ${selectedSummaryType} summary has been updated successfully.`,
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
      const validationText = await generateDirectValidation(pdf.id);
      toast({
        title: 'Content Safety Analysis Complete',
        description: 'Analysis completed successfully. Check the results in the validation section.',
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
            <Button 
              variant="outline" 
              className="justify-start gap-2"
              onClick={handleGenerateHighlights}
              disabled={generatingHighlights || !pdf.content}
            >
              {generatingHighlights ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Enhancing PDF...
                </>
              ) : (
                <>
                  <Highlighter className="h-4 w-4" />
                  Enhance PDF
                </>
              )}
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
                  {pdf.validationText ? 'Re-analyze Content Safety' : 'Analyze Content Safety'}
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
      {(pdf.validationText || pdf.validationStatus === 'validating') && (
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
            {pdf.validationText && (
              <div className={`p-4 rounded-lg border-l-4 ${
                pdf.validationText.includes('✅') ? 'bg-green-50 border-l-green-500' :
                pdf.validationText.includes('⚠️') ? 'bg-orange-50 border-l-orange-500' :
                pdf.validationText.includes('❌') ? 'bg-red-50 border-l-red-500' :
                'bg-blue-50 border-l-blue-500'
              }`}>
                <div className="prose prose-sm max-w-none">
                  <div className={`whitespace-pre-wrap ${
                    pdf.validationText.includes('✅') ? 'text-green-700' :
                    pdf.validationText.includes('⚠️') ? 'text-orange-700' :
                    pdf.validationText.includes('❌') ? 'text-red-700' :
                    'text-blue-700'
                  }`}>
                    {pdf.validationText}
                  </div>
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
              <div className="flex items-center gap-2">
                <Select value={selectedSummaryType} onValueChange={(value: 'short' | 'detailed') => setSelectedSummaryType(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Summary type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRegenerateSummary}
                  disabled={regeneratingSummary}
                >
                  {regeneratingSummary ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate {selectedSummaryType}
                    </>
                  )}
                </Button>
              </div>
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
          {pdf.status === 'processed' && (
            <div>
              {(() => {
                const currentSummary = selectedSummaryType === 'short' 
                  ? (pdf.shortSummary || pdf.summary) 
                  : pdf.detailedSummary;
                
                if (currentSummary) {
                  return (
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {currentSummary}
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground mb-4">
                        {selectedSummaryType === 'short' 
                          ? 'Short summary not available yet.' 
                          : 'Detailed summary not available yet.'}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRegenerateSummary}
                        disabled={regeneratingSummary}
                      >
                        {regeneratingSummary ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4 mr-2" />
                            Generate {selectedSummaryType} summary
                          </>
                        )}
                      </Button>
                    </div>
                  );
                }
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Highlighting Controls */}
      {pdf.status === 'processed' && pdf.content && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Highlighter className="h-5 w-5" />
              PDF Highlighting
            </CardTitle>
            <CardDescription>
              Generate and view important phrases highlighted in the PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                onClick={handleGenerateHighlights}
                disabled={generatingHighlights}
              >
                {generatingHighlights ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Highlighter className="h-4 w-4 mr-2" />
                    {pdf.highlightPhrases ? 'Regenerate Highlights' : 'Generate Highlights'}
                  </>
                )}
              </Button>

              {pdf.highlightPhrases && pdf.highlightPhrases.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowHighlights(!showHighlights)}
                >
                  {showHighlights ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Highlights
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Highlights
                    </>
                  )}
                </Button>
              )}

              {pdf.highlightPhrases && pdf.highlightPhrases.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {pdf.highlightPhrases.length} phrases available for highlighting
                </div>
              )}
            </div>

            {/* PDF Viewer with Highlighting */}
            {pdf.fileUrl && (
              <PDFViewer
                fileUrl={pdf.fileUrl}
                fileName={pdf.name}
                highlightPhrases={pdf.highlightPhrases || []}
                showHighlights={showHighlights}
                onHighlightsToggle={setShowHighlights}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PDFDetail;
