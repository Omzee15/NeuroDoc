import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Trash2, Eye, MessageSquare, Brain, Mic, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const pdfs = [
  {
    id: "1",
    name: "Research Paper 2024.pdf",
    size: "2.4 MB",
    pages: 45,
    uploadDate: "2024-01-15",
    status: "processed",
  },
  {
    id: "2",
    name: "Business Report.pdf",
    size: "1.8 MB",
    pages: 23,
    uploadDate: "2024-01-14",
    status: "processed",
  },
  {
    id: "3",
    name: "User Manual.pdf",
    size: "5.2 MB",
    pages: 67,
    uploadDate: "2024-01-13",
    status: "processed",
  },
];

const PDFDetail = () => {
  const { id } = useParams();
  const pdf = pdfs.find((p) => p.id === id);

  if (!pdf) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">PDF Not Found</h1>
        <p className="text-muted-foreground">The requested PDF could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{pdf.name}</h1>
          <p className="text-muted-foreground mt-1">
            PDF Overview and Details
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
            <Button variant="outline" className="justify-start gap-2 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>AI Summary</CardTitle>
          <CardDescription>Automatically generated summary</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This document contains {pdf.pages} pages of content covering various topics.
            The AI analysis has processed the document and extracted key information
            for quick reference and analysis.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFDetail;
