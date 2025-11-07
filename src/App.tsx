import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DocumentProvider } from "./contexts/DocumentContext";
import PDFChat from "./pages/PDFChat";
import PDFDetail from "./pages/PDFDetail";
import Quiz from "./pages/Quiz";
import Podcast from "./pages/Podcast";
import Validation from "./pages/Validation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DocumentProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<PDFChat />} />
              <Route path="/pdfchat" element={<PDFChat />} />
              <Route path="/pdf/:id" element={<PDFDetail />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/podcast" element={<Podcast />} />
              <Route path="/validation" element={<Validation />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </DocumentProvider>
  </QueryClientProvider>
);

export default App;
