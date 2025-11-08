import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff, Download } from 'lucide-react';

// Set up the worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.mjs';

interface PDFViewerProps {
  fileUrl: string;
  highlightPhrases?: string[];
  showHighlights?: boolean;
  onHighlightsToggle?: (show: boolean) => void;
  fileName?: string; // Add fileName prop for download
}

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  dir: string;
  fontName: string;
}

interface TextContent {
  items: TextItem[];
  styles: Record<string, any>;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ 
  fileUrl, 
  highlightPhrases = [], 
  showHighlights = false, 
  onHighlightsToggle,
  fileName = 'document.pdf'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);

  useEffect(() => {
    loadPDF();
  }, [fileUrl]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, showHighlights, highlightPhrases]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const loadingTask = pdfjsLib.getDocument(fileUrl);
      const pdf = await loadingTask.promise;
      
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Failed to load PDF');
    } finally {
      setLoading(false);
    }
  };

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };

      // Render the page  
      const renderTask = page.render(renderContext);
      await renderTask.promise;

      // Render highlights if enabled
      if (showHighlights && highlightPhrases.length > 0) {
        await renderHighlights(page, viewport);
      } else {
        // Clear highlights
        if (highlightLayerRef.current) {
          highlightLayerRef.current.innerHTML = '';
        }
      }
    } catch (err) {
      console.error('Error rendering page:', err);
      setError('Failed to render page');
    }
  };

  const renderHighlights = async (page: pdfjsLib.PDFPageProxy, viewport: pdfjsLib.PageViewport) => {
    if (!highlightLayerRef.current) return;

    try {
      // Get text content from the page
      const textContent = await page.getTextContent() as TextContent;
      
      // Clear previous highlights
      highlightLayerRef.current.innerHTML = '';

      // Create highlight elements with stricter matching
      const highlightElements: HTMLElement[] = [];

      textContent.items.forEach((item: TextItem, index) => {
        // Get the text content
        const itemText = item.str.trim();
        
        // Skip empty or very short text items (less than 3 characters)
        if (!itemText || itemText.length < 3) return;

        // Find exact phrase matches with stricter criteria
        const matchingPhrases = highlightPhrases.filter(phrase => {
          const phraseText = phrase.trim();
          const itemTextLower = itemText.toLowerCase();
          const phraseTextLower = phraseText.toLowerCase();
          
          // Skip very short phrases
          if (phraseText.length < 3) return false;
          
          // Exact match (case-insensitive)
          if (itemTextLower === phraseTextLower) return true;
          
          // For multi-word phrases, check if the item contains the complete phrase
          if (phraseText.includes(' ')) {
            return itemTextLower.includes(phraseTextLower);
          }
          
          // For single words, require exact word match (not just substring)
          const itemWords = itemTextLower.split(/\W+/);
          return itemWords.includes(phraseTextLower);
        });

        if (matchingPhrases.length > 0) {
          // Calculate position more accurately
          const transform = item.transform;
          
          // PDF coordinate system: origin at bottom-left
          // Canvas coordinate system: origin at top-left
          const x = transform[4];
          const y = transform[5];
          const textWidth = item.width;
          const textHeight = item.height || 12; // Fallback height

          // Transform to viewport coordinates
          const [canvasX, canvasY] = viewport.convertToViewportPoint(x, y);
          const scaledWidth = textWidth * viewport.scale;
          const scaledHeight = textHeight * viewport.scale;

          // Create highlight element with better positioning
          const highlight = document.createElement('div');
          highlight.style.position = 'absolute';
          highlight.style.left = `${Math.round(canvasX)}px`;
          highlight.style.top = `${Math.round(canvasY - scaledHeight)}px`; // Adjust for text baseline
          highlight.style.width = `${Math.round(scaledWidth)}px`;
          highlight.style.height = `${Math.round(scaledHeight * 1.2)}px`; // Slightly taller for better coverage
          highlight.style.backgroundColor = 'rgba(255, 235, 59, 0.4)'; // Slightly more visible
          highlight.style.pointerEvents = 'none';
          highlight.style.borderRadius = '2px';
          highlight.style.zIndex = '10';
          highlight.title = `Highlighted: "${itemText}" (matches: ${matchingPhrases.join(', ')})`;

          highlightElements.push(highlight);
        }
      });

      // Add all highlights to the container
      highlightElements.forEach(element => {
        highlightLayerRef.current?.appendChild(element);
      });

      console.log(`Created ${highlightElements.length} highlights for ${highlightPhrases.length} phrases`);

    } catch (err) {
      console.error('Error rendering highlights:', err);
    }
  };

  const nextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const downloadHighlightedPDF = async () => {
    try {
      // Create a canvas for each page with highlights
      const highlightedCanvas = document.createElement('canvas');
      const ctx = highlightedCanvas.getContext('2d');
      if (!ctx || !pdfDoc) return;

      // Set canvas size same as current page
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 2 }); // Higher scale for better quality
      highlightedCanvas.width = viewport.width;
      highlightedCanvas.height = viewport.height;

      // Render PDF page to canvas
      await page.render({
        canvasContext: ctx,
        canvas: highlightedCanvas,
        viewport: viewport
      }).promise;

      // Add highlights on top if they exist
      if (showHighlights && highlightPhrases.length > 0) {
        const textContent = await page.getTextContent() as TextContent;
        
        textContent.items.forEach((item: TextItem) => {
          const itemText = item.str.trim();
          if (!itemText || itemText.length < 3) return;

          const matchingPhrases = highlightPhrases.filter(phrase => {
            const phraseText = phrase.trim();
            const itemTextLower = itemText.toLowerCase();
            const phraseTextLower = phraseText.toLowerCase();
            
            if (phraseText.length < 3) return false;
            if (itemTextLower === phraseTextLower) return true;
            if (phraseText.includes(' ')) {
              return itemTextLower.includes(phraseTextLower);
            }
            const itemWords = itemTextLower.split(/\W+/);
            return itemWords.includes(phraseTextLower);
          });

          if (matchingPhrases.length > 0) {
            const transform = item.transform;
            const x = transform[4];
            const y = transform[5];
            const textWidth = item.width;
            const textHeight = item.height || 12;

            // Transform to viewport coordinates
            const [canvasX, canvasY] = viewport.convertToViewportPoint(x, y);
            
            // Draw highlight rectangle
            ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
            ctx.fillRect(canvasX, canvasY - textHeight * viewport.scale, 
                        textWidth * viewport.scale, textHeight * viewport.scale * 1.2);
          }
        });
      }

      // Convert canvas to blob and download
      highlightedCanvas.toBlob(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName.replace('.pdf', '_highlighted.png');
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');

    } catch (error) {
      console.error('Error downloading highlighted PDF:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading PDF...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* PDF Controls */}
      <div className="flex items-center justify-between mb-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage <= 1}>
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {numPages}
          </span>
          <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage >= numPages}>
            Next
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
            Zoom Out
          </Button>
          <span className="text-sm">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3}>
            Zoom In
          </Button>
        </div>

        {onHighlightsToggle && (
          <div className="flex items-center gap-2">
            <Button
              variant={showHighlights ? "default" : "outline"}
              size="sm"
              onClick={() => onHighlightsToggle(!showHighlights)}
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
            
            {showHighlights && highlightPhrases.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={downloadHighlightedPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Highlighted
              </Button>
            )}
          </div>
        )}
      </div>

      {/* PDF Viewer */}
      <div 
        ref={containerRef}
        className="relative border rounded-lg overflow-auto bg-white"
        style={{ maxHeight: '70vh' }}
      >
        <canvas ref={canvasRef} className="block" />
        
        {/* Highlight Layer */}
        <div 
          ref={highlightLayerRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ 
            width: canvasRef.current?.width || 0,
            height: canvasRef.current?.height || 0 
          }}
        />
      </div>

      {/* Highlight Info */}
      {showHighlights && highlightPhrases.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Highlighted Phrases ({highlightPhrases.length}):</h4>
          <div className="flex flex-wrap gap-1">
            {highlightPhrases.map((phrase, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs"
              >
                {phrase}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;