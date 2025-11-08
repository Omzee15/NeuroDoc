import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Globe, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  FileText, 
  Calendar,
  Loader2,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useDocuments } from "@/contexts/DocumentContext";
import { useToast } from "@/hooks/use-toast";

const Validation = () => {
  const { documents, generateDirectValidation, getValidationText } = useDocuments();
  const { toast } = useToast();
  const [generatingValidation, setGeneratingValidation] = useState<string | null>(null);

  const processedDocuments = documents.filter(doc => doc.status === 'processed');

  const handleGenerateValidation = async (documentId: string) => {
    setGeneratingValidation(documentId);
    
    try {
      const validationText = await generateDirectValidation(documentId);
      toast({
        title: "Content Safety Analysis Complete",
        description: "Analysis completed successfully. Check the results below.",
      });
    } catch (error) {
      console.error('Validation failed:', error);
      toast({
        title: "Content Safety Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze content safety",
        variant: "destructive",
      });
    } finally {
      setGeneratingValidation(null);
    }
  };

  const getValidationStatusColor = (document: any) => {
    switch (document.validationStatus) {
      case 'completed':
        return 'text-green-600';
      case 'validating':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSeverityBadgeColor = (issueCount: number, score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-700';
    if (score >= 70) return 'bg-yellow-100 text-yellow-700';
    if (score >= 50) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Safety Validation</h1>
          <p className="text-muted-foreground mt-1">
            Analyze your PDF documents for harmful content, malpractices, and factual accuracy
          </p>
        </div>
      </div>

      {processedDocuments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="p-4 rounded-full bg-muted mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Documents Available</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Upload and process some PDF documents to start validation
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {processedDocuments.map((document) => {
          const validationText = getValidationText(document.id);
          const isValidating = generatingValidation === document.id || document.validationStatus === 'validating';
          
          return (
            <Card key={document.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Globe className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{document.name}</CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Uploaded {formatDate(document.uploadDate)}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {document.pages} pages
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {/* Status Badge */}
                    {document.validationStatus === 'completed' && validationText && (
                      <div className="flex items-center gap-2">
                        {validationText.includes('✅') ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-500 text-sm font-medium">Safe</span>
                          </>
                        ) : validationText.includes('⚠️') ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-orange-500 text-sm font-medium">Issues Found</span>
                          </>
                        ) : validationText.includes('❌') ? (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-red-500 text-sm font-medium">Analysis Failed</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                            <span className="text-blue-500 text-sm font-medium">Analyzed</span>
                          </>
                        )}
                      </div>
                    )}
                    {document.validationStatus === 'validating' && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                        <span className="text-blue-500 text-sm font-medium">Analyzing</span>
                      </div>
                    )}
                    {document.validationStatus === 'failed' && (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-500 text-sm font-medium">Failed</span>
                      </div>
                    )}
                    {!document.validationStatus && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-500 text-sm font-medium">Not Analyzed</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {validationText && document.validationStatus === 'completed' ? (
                  <div className="space-y-4">
                    {/* Validation Results */}
                    <div className={`p-4 rounded-lg border-l-4 ${
                      validationText.includes('✅') ? 'bg-green-50 border-l-green-500' :
                      validationText.includes('⚠️') ? 'bg-orange-50 border-l-orange-500' :
                      validationText.includes('❌') ? 'bg-red-50 border-l-red-500' :
                      'bg-blue-50 border-l-blue-500'
                    }`}>
                      <div className="prose prose-sm max-w-none">
                        <div className={`whitespace-pre-wrap ${
                          validationText.includes('✅') ? 'text-green-700' :
                          validationText.includes('⚠️') ? 'text-orange-700' :
                          validationText.includes('❌') ? 'text-red-700' :
                          'text-blue-700'
                        }`}>
                          {validationText}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleGenerateValidation(document.id)}
                        disabled={isValidating}
                        className="gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                        Re-analyze Content
                      </Button>
                    </div>
                  </div>
                ) : isValidating ? (
                  <div className="text-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
                    <p className="text-sm text-muted-foreground">
                      Analyzing content for safety issues and harmful content...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Checking for malpractices, incorrect information, and harmful content
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="p-4 rounded-full bg-muted mb-4 mx-auto w-fit">
                      <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium mb-2">No Content Analysis</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Analyze content for safety issues, harmful content, and malpractices
                    </p>
                    <Button
                      onClick={() => handleGenerateValidation(document.id)}
                      className="gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Analyze Content Safety
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Validation;
