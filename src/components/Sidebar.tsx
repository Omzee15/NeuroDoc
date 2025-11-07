import { FileText, Brain, Mic, Globe, LayoutDashboard } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  isOpen: boolean;
}

const menuItems = [
  { title: "Overview", icon: LayoutDashboard, path: "/" },
  { title: "PDF", icon: FileText, path: "/pdf" },
  { title: "Quiz / Generation", icon: Brain, path: "/quiz" },
  { title: "Podcast it", icon: Mic, path: "/podcast" },
  { title: "Sites & Content Validation", icon: Globe, path: "/validation" },
];

// Mock PDF list
const pdfList = [
  { id: "1", name: "Research Paper 2024.pdf", pages: 45 },
  { id: "2", name: "Business Report.pdf", pages: 23 },
  { id: "3", name: "User Manual.pdf", pages: 67 },
];

export const Sidebar = ({ isOpen }: SidebarProps) => {
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
              Your PDFs
            </h2>
            {pdfList.length > 0 ? (
              pdfList.map((pdf) => (
                <button
                  key={pdf.id}
                  className="w-full flex items-start gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent hover:text-accent-foreground text-left"
                >
                  <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{pdf.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pdf.pages} pages
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground px-3 py-2">
                No PDFs uploaded yet
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
};
