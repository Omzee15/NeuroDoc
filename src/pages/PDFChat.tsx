import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, Bot, User, Check, Loader2, MessageSquare, Download, FileText } from "lucide-react";
import { useDocuments, type Message } from "@/contexts/DocumentContext";
import { geminiService, type ChatMessage, type PDFContext } from "@/services/geminiService";
import { pdfQAService } from "@/services/pdfQAService";
import { ChatSidebar } from "@/components/ChatSidebar";

const PDFChat = () => {
  const { 
    documents, 
    addMessage, 
    chatSessions,
    createChatSession,
    deleteChatSession,
    getMessagesForSession,
    currentChatSession,
    setCurrentChatSession,
    addUserQuery,
    getUserQueries,
    getFileFromStore
  } = useDocuments();
  
  // Get messages for the current chat session
  const messages = currentChatSession ? getMessagesForSession(currentChatSession) : [];
  
  // PDF highlighting state
  const [showPDFHighlighting, setShowPDFHighlighting] = useState(false);
  const [generatingHighlightedPDF, setGeneratingHighlightedPDF] = useState(false);
  const [highlightedPDFUrl, setHighlightedPDFUrl] = useState<string | null>(null);
  
  // Initialize with welcome message if empty and there's a current session
  useEffect(() => {
    if (currentChatSession && messages.length === 0) {
      const currentSession = chatSessions.find(s => s.id === currentChatSession);
      if (currentSession) {
        addMessage({
          content: `Hello! I'm ready to help you analyze ${currentSession.pdfName}. You can ask questions about this document or mention it using @${currentSession.pdfName}.`,
          sender: "ai",
          chatSessionId: currentChatSession,
        });
      }
    }
  }, [currentChatSession, messages.length, chatSessions, addMessage]);
  
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredPDFs, setFilteredPDFs] = useState<typeof documents>([]);
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInput(value);
    setCursorPosition(cursorPos);

    // Check if user is typing @ mention
    const beforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.slice(lastAtIndex + 1);
      // Check if there's no space after @ (still typing the mention)
      if (!afterAt.includes(' ') && afterAt.length >= 0) {
        const filtered = documents.filter(doc =>
          doc.name.toLowerCase().includes(afterAt.toLowerCase())
        );
        setFilteredPDFs(filtered);
        setShowSuggestions(true);
        setActiveSuggestionIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handlePDFSelect = (pdfName: string) => {
    const beforeCursor = input.slice(0, cursorPosition);
    const afterCursor = input.slice(cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const beforeAt = beforeCursor.slice(0, lastAtIndex);
      const newInput = `${beforeAt}@${pdfName} ${afterCursor}`;
      setInput(newInput);
      setSelectedPDF(pdfName);
      setShowSuggestions(false);
      
      // Add confirmation message
      addMessage({
        content: `📄 ${pdfName} PDF selected. You can now ask questions about this document!`,
        sender: "ai",
      });
      
      // Focus back to input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Function to highlight @mentions in text
  const highlightMentions = (text: string) => {
    const parts = text.split(/(@\w+(?:\.\w+)*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const pdfName = part.substring(1);
        const isValidPDF = documents.some(doc => doc.name === pdfName);
        return (
          <span
            key={index}
            className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-medium ${
              isValidPDF 
                ? 'bg-primary/20 text-primary border border-primary/30' 
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && filteredPDFs.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => 
          prev < filteredPDFs.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => 
          prev > 0 ? prev - 1 : filteredPDFs.length - 1
        );
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        handlePDFSelect(filteredPDFs[activeSuggestionIndex].name);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentChatSession) return;

    try {
      const userQuery = input.trim();

      // Add user query to the session for tracking
      addUserQuery(currentChatSession, userQuery);

      // Extract mentioned PDFs from the message
      const mentionedPDFs: string[] = [];
      const atMentions = input.match(/@(\w+(?:\s+\w+)*)/g);
      if (atMentions) {
        mentionedPDFs.push(...atMentions.map(mention => mention.slice(1).trim()));
      }

      // Add user message
      addMessage({
        content: userQuery,
        sender: "user",
        referencedPdfs: mentionedPDFs,
        chatSessionId: currentChatSession || undefined,
      });

      setInput("");
      setSelectedPDF(null);
      setIsLoading(true);

      // Get mentioned PDF contexts
      const pdfContexts: PDFContext[] = mentionedPDFs
        .map(pdfName => {
          const doc = documents.find(d => 
            d.name.toLowerCase().includes(pdfName.toLowerCase()) ||
            d.name.toLowerCase().replace('.pdf', '').includes(pdfName.toLowerCase())
          );
          if (doc) {
            return {
              id: doc.id,
              title: doc.name,
              content: doc.content || 'Content is being processed...'
            } as PDFContext;
          }
          return null;
        })
        .filter((context): context is PDFContext => context !== null);

      // Convert messages to ChatMessage format for Gemini
      const chatHistory: ChatMessage[] = messages.map(msg => ({
        id: msg.id,
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        mentionedPdfs: msg.referencedPdfs
      }));

      // Get AI response
      const aiResponse = await geminiService.sendMessage(
        userQuery,
        chatHistory,
        pdfContexts
      );

      // Add AI response message
      addMessage({
        content: aiResponse,
        sender: "ai",
        chatSessionId: currentChatSession || undefined,
      });
    } catch (error) {
      console.error('Error in handleSend:', error);
      // Add error message
      addMessage({
        content: "I apologize, but I encountered an error while processing your request. Please try again.",
        sender: "ai",
        chatSessionId: currentChatSession || undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateHighlightedPDF = async () => {
    if (!currentChatSession) return;
    
    console.log('Generating highlighted PDF...');
    
    const currentSession = chatSessions.find(s => s.id === currentChatSession);
    if (!currentSession) {
      alert('Chat session not found');
      return;
    }
    
    const document = documents.find(d => d.id === currentSession.pdfId);
    if (!document) {
      alert('Document not found.');
      return;
    }
    
    // Get the file from blob URL using the document ID
    const file = await getFileFromStore(document.id);
    if (!file) {
      alert('PDF file not found. Please make sure the document is properly uploaded.');
      return;
    }
    
    const userQueries = getUserQueries(currentChatSession);
    if (userQueries.length === 0) {
      alert('No questions found to highlight. Please ask some questions first.');
      return;
    }
    
    setGeneratingHighlightedPDF(true);
    
    try {
      console.log('Processing questions:', userQueries);
      
      // Add timeout to prevent hanging indefinitely
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('PDF highlighting timed out after 60 seconds')), 60000);
      });
      
      const highlightingPromise = pdfQAService.processQAHighlights(file, userQueries);
      
      const result = await Promise.race([highlightingPromise, timeoutPromise]) as {
        highlightedPDF: Uint8Array;
        qaResults: any[];
      };
      console.log('Generated highlighted PDF');
      
      // Create blob URL for the highlighted PDF
      const blob = new Blob([new Uint8Array(result.highlightedPDF)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Clean up previous URL
      if (highlightedPDFUrl) {
        URL.revokeObjectURL(highlightedPDFUrl);
      }
      
      setHighlightedPDFUrl(url);
      console.log('Highlighted PDF ready for download');
      
    } catch (error) {
      console.error('Error generating highlighted PDF:', error);
      alert(`Failed to generate highlighted PDF: ${error.message || 'Unknown error'}`);
    } finally {
      setGeneratingHighlightedPDF(false);
    }
  };

  const downloadHighlightedPDF = () => {
    if (!highlightedPDFUrl || !currentChatSession) return;
    
    const currentSession = chatSessions.find(s => s.id === currentChatSession);
    if (!currentSession) return;
    
    const link = document.createElement('a');
    link.href = highlightedPDFUrl;
    link.download = `${currentSession.pdfName.replace('.pdf', '')}_highlighted.pdf`;
    link.click();
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Chat Sessions Sidebar */}
      <ChatSidebar isOpen={true} />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">PDF Chat</h1>
              {currentChatSession && (
                <p className="text-sm text-muted-foreground mt-1">
                  {chatSessions.find(s => s.id === currentChatSession)?.pdfName || 'Chat Session'}
                </p>
              )}
              {!currentChatSession && (
                <p className="text-sm text-muted-foreground mt-1">
                  Select a chat session to start chatting
                </p>
              )}
            </div>
          </div>

          {/* PDF Highlighting Controls */}
          {currentChatSession && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="pdf-highlighting"
                  checked={showPDFHighlighting}
                  onCheckedChange={setShowPDFHighlighting}
                />
                <Label htmlFor="pdf-highlighting" className="text-sm">
                  Show answers in PDF
                </Label>
              </div>
              
              {showPDFHighlighting && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateHighlightedPDF}
                    disabled={generatingHighlightedPDF || getUserQueries(currentChatSession).length === 0}
                  >
                    {generatingHighlightedPDF ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-3 w-3 mr-1" />
                        Generate Highlights
                      </>
                    )}
                  </Button>
                  
                  {highlightedPDFUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadHighlightedPDF}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download PDF
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      {currentChatSession ? (
        <Card className="flex-1 flex flex-col m-4">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages && messages.length > 0 ? messages.map((message) => {
                if (!message || !message.id) return null;
                return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.sender === "ai" && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="text-sm">{highlightMentions(message.content || '')}</div>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
                    </p>
                  </div>
                  {message.sender === "user" && (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
                );
              }) : (
                <div className="text-center text-muted-foreground">
                  <p>No messages yet. Start a conversation!</p>
                </div>
              )}            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="max-w-[70%] rounded-lg p-3 bg-muted">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="relative">
            {showSuggestions && filteredPDFs.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-lg shadow-lg max-h-32 overflow-y-auto z-10">
                {filteredPDFs.map((pdf, index) => (
                  <div
                    key={pdf.id}
                    className={`px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm ${
                      index === activeSuggestionIndex ? 'bg-muted' : ''
                    }`}
                    onClick={() => handlePDFSelect(pdf.name)}
                  >
                    <span className="text-muted-foreground">@</span>
                    <span>{pdf.name}</span>
                    {index === activeSuggestionIndex && (
                      <Check className="h-3 w-3 ml-auto text-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={currentChatSession ? "Ask about your PDFs... Use @pdf-name to reference specific documents" : "Select a chat session to start chatting"}
                className="flex-1"
                disabled={!currentChatSession}
              />
              <Button onClick={handleSend} size="icon" disabled={isLoading || !currentChatSession}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      ) : (
        <div className="flex-1 flex items-center justify-center m-4">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Chat Session Selected</h3>
            <p className="text-muted-foreground mb-4">
              Select an existing chat or create a new one from the sidebar to start chatting with your PDFs.
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PDFChat;
