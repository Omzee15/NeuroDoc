import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Trash2, Eye } from "lucide-react";

const pdfs = [
  {
    id: "1",
    name: "Research Paper 2024.pdf",
    size: "2.4 MB",
    pages: 45,
    uploadDate: "2024-01-15",
  },
  {
    id: "2",
    name: "Business Report.pdf",
    size: "1.8 MB",
    pages: 23,
    uploadDate: "2024-01-14",
  },
  {
    id: "3",
    name: "User Manual.pdf",
    size: "5.2 MB",
    pages: 67,
    uploadDate: "2024-01-13",
  },
];

const Pdf = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">PDF Management</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your uploaded PDF documents
        </p>
      </div>

      <div className="grid gap-4">
        {pdfs.map((pdf) => (
          <Card key={pdf.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{pdf.name}</CardTitle>
                    <CardDescription>
                      {pdf.pages} pages • {pdf.size} • Uploaded {pdf.uploadDate}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm">
                  Generate Quiz
                </Button>
                <Button variant="secondary" size="sm">
                  Create Podcast
                </Button>
                <Button variant="secondary" size="sm">
                  Validate Content
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Pdf;
