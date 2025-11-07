import { FileText, Brain, Mic, Globe, LayoutDashboard, Loader2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useDocuments } from "@/contexts/DocumentContext";

interface SidebarProps {
  isOpen: boolean;
}

const menuItems = [
  { title: "Podcast it", icon: Mic, path: "/podcast" },
  { title: "Sites & Content Validation", icon: Globe, path: "/validation" },
  { title: "Quiz / Generation", icon: Brain, path: "/quiz" },
  { title: "PDFChat", icon: FileText, path: "/pdfchat" },
];

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const { documents } = useDocuments();

  if (!isOpen) return null;

  return (
    <aside className="fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] bg-card border-r border-border">
      <ScrollArea className="h-full">
        <div className="p-4">
          {/* Navigation */}
          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Navigation
            </h2>
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                activeClassName="bg-accent text-accent-foreground font-medium"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>

          <Separator className="my-6" />

          {/* PDF List */}
          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Your Documents ({documents.length})
            </h2>
            {documents.length > 0 ? (
              documents.map((doc) => (
                <NavLink
                  key={doc.id}
                  to={`/pdf/${doc.id}`}
                  className="w-full flex items-start gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent hover:text-accent-foreground text-left"
                  activeClassName="bg-accent text-accent-foreground font-medium"
                >
                  <div className="relative">
                    <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {(doc.status === 'uploading' || doc.status === 'processing_summary') && (
                      <Loader2 className="h-3 w-3 absolute -top-1 -right-1 animate-spin text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{doc.name}</p>
                      {doc.status === 'uploading' && (
                        <Badge variant="secondary" className="text-xs">
                          Uploading
                        </Badge>
                      )}
                      {doc.status === 'processing_summary' && (
                        <Badge variant="secondary" className="text-xs">
                          Processing
                        </Badge>
                      )}
                      {doc.status === 'error' && (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {doc.pages} pages • {doc.size}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {doc.uploadDate}
                    </p>
                  </div>
                </NavLink>
              ))
            ) : (
              <div className="px-3 py-4 text-center">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  No documents uploaded yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Click "Upload PDF" to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
};
