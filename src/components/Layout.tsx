import { useState } from "react";
import { Menu, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center px-4 gap-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <h1 className="text-xl font-semibold">PDF Analyzer</h1>
        
        <div className="ml-auto">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Upload PDF
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="pt-16 flex w-full">
        <Sidebar isOpen={sidebarOpen} />
        
        <main
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? "ml-64" : "ml-0"
          }`}
        >
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
