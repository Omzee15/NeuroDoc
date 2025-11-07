import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Trash2, FileText } from 'lucide-react';
import { useDocuments, type ChatSession } from '@/contexts/DocumentContext';

interface ChatSidebarProps {
  isOpen: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen }) => {
  const {
    documents,
    chatSessions,
    currentChatSession,
    setCurrentChatSession,
    createChatSession,
    deleteChatSession,
    getMessagesForSession,
  } = useDocuments();

  const handleCreateChat = (pdfId: string, pdfName: string) => {
    const newSessionId = createChatSession(pdfId, pdfName);
    setCurrentChatSession(newSessionId);
  };

  const handleDeleteChat = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteChatSession(sessionId);
  };

  const handleSelectChat = (sessionId: string) => {
    setCurrentChatSession(sessionId);
  };

  const getMessageCount = (sessionId: string) => {
    return getMessagesForSession(sessionId).length;
  };

  const processedDocuments = documents.filter(doc => doc.status === 'processed');

  if (!isOpen) return null;

  return (
    <Card className="w-80 h-full border-r">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Chat Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="p-4 space-y-4">
            {/* Existing Chat Sessions */}
            {chatSessions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Active Chats
                </h3>
                <div className="space-y-2">
                  {chatSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSelectChat(session.id)}
                      className={`group p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                        currentChatSession === session.id
                          ? 'bg-accent border-primary'
                          : 'bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            <p className="text-sm font-medium truncate">
                              {session.pdfName}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {getMessageCount(session.id)} messages
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteChat(session.id, e)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create New Chats */}
            {processedDocuments.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Create New Chat
                </h3>
                <div className="space-y-2">
                  {processedDocuments.map((doc) => {
                    const hasExistingChat = chatSessions.some(
                      session => session.pdfId === doc.id
                    );
                    
                    if (hasExistingChat) return null;

                    return (
                      <div
                        key={doc.id}
                        className="p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => handleCreateChat(doc.id, doc.name)}
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {doc.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Click to start chatting
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Documents State */}
            {processedDocuments.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No processed documents available
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload and process some PDFs to start chatting
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};