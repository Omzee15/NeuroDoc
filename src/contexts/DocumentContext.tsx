import React, { createContext, useContext, useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { PodcastScript } from '../services/podcastService';
import { ValidationReport, pdfValidationService } from '../services/pdfValidationService';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  referencedPdfs?: string[]; // Array of PDF IDs that were mentioned
  chatSessionId?: string; // Which chat session this message belongs to
}

export interface ChatSession {
  id: string;
  name: string;
  pdfId: string; // ID of the PDF this chat is for
  pdfName: string; // Name of the PDF for display
  createdAt: string;
  lastMessageAt: string;
  userQueries: string[]; // Store all user queries for this chat session
}

export interface Document {
  id: string;
  name: string;
  size: string;
  pages: number;
  uploadDate: string;
  status: 'uploading' | 'processing_summary' | 'processed' | 'error';
  fileUrl?: string; // Store blob URL for the file
  content?: string; // For storing document content/text
  summary?: string; // AI-generated summary
  validationReport?: ValidationReport; // PDF validation report
  validationStatus?: 'pending' | 'validating' | 'completed' | 'failed';
}

interface DocumentContextType {
  documents: Document[];
  addDocument: (file: File) => Promise<Document>;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  getDocumentById: (id: string) => Document | undefined;
  getFileFromStore: (documentId: string) => Promise<File | null>;
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  chatSessions: ChatSession[];
  createChatSession: (pdfId: string, pdfName: string) => string;
  deleteChatSession: (sessionId: string) => void;
  getMessagesForSession: (sessionId: string) => Message[];
  currentChatSession: string | null;
  setCurrentChatSession: (sessionId: string | null) => void;
  addUserQuery: (sessionId: string, query: string) => void;
  getUserQueries: (sessionId: string) => string[];
  // Podcast-related methods
  podcasts: PodcastScript[];
  addPodcast: (podcast: PodcastScript) => void;
  removePodcast: (id: string) => void;
  getPodcastById: (id: string) => PodcastScript | undefined;
  getPodcastsForDocument: (pdfId: string) => PodcastScript[];
  // Validation-related methods
  generateValidationReport: (documentId: string) => Promise<ValidationReport>;
  getValidationReport: (documentId: string) => ValidationReport | undefined;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

const STORAGE_KEY = 'neurodoc_documents';
const MESSAGES_STORAGE_KEY = 'neurodoc_chat_messages';
const CHAT_SESSIONS_STORAGE_KEY = 'neurodoc_chat_sessions';
const PODCASTS_STORAGE_KEY = 'neurodoc_podcasts';

// Helper function to generate mock pages count based on file size
const estimatePages = (sizeInBytes: number): number => {
  // Rough estimate: 1 page ≈ 100KB for a text-heavy PDF
  const sizeInKB = sizeInBytes / 1024;
  return Math.max(1, Math.round(sizeInKB / 100));
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to load documents from localStorage
const loadDocumentsFromStorage = (): Document[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load documents from storage:', error);
    return [];
  }
};

// Helper function to load messages from localStorage
const loadMessagesFromStorage = (): Message[] => {
  try {
    const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load messages from storage:', error);
    return [];
  }
};

// Helper function to load chat sessions from localStorage
const loadChatSessionsFromStorage = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load chat sessions from storage:', error);
    return [];
  }
};

// Helper function to load podcasts from localStorage
const loadPodcastsFromStorage = (): PodcastScript[] => {
  try {
    const stored = localStorage.getItem(PODCASTS_STORAGE_KEY);
    if (!stored) return [];
    
    const parsedData = JSON.parse(stored);
    
    // Ensure the data is an array
    if (!Array.isArray(parsedData)) {
      console.warn('Invalid podcasts data format in storage, clearing...');
      localStorage.removeItem(PODCASTS_STORAGE_KEY);
      return [];
    }
    
    // Validate and clean up each podcast object
    const validPodcasts = parsedData.filter((podcast: any) => {
      return podcast && 
             typeof podcast.id === 'string' && 
             typeof podcast.pdfId === 'string' &&
             typeof podcast.title === 'string' &&
             Array.isArray(podcast.conversation);
    });
    
    // If we filtered out invalid podcasts, update storage later (not immediately)
    if (validPodcasts.length !== parsedData.length) {
      console.warn('Found invalid podcast data in storage, will clean up...');
      // Schedule cleanup for after component mount
      setTimeout(() => {
        try {
          localStorage.setItem(PODCASTS_STORAGE_KEY, JSON.stringify(validPodcasts));
        } catch (error) {
          console.error('Failed to cleanup podcast storage:', error);
        }
      }, 0);
    }
    
    return validPodcasts;
  } catch (error) {
    console.error('Failed to load podcasts from storage:', error);
    // Clear corrupted data
    localStorage.removeItem(PODCASTS_STORAGE_KEY);
    return [];
  }
};

// Helper function to save documents to localStorage
const saveDocumentsToStorage = (documents: Document[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  } catch (error) {
    console.error('Failed to save documents to storage:', error);
  }
};

// Helper function to save messages to localStorage
const saveMessagesToStorage = (messages: Message[]) => {
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save messages to storage:', error);
  }
};

// Helper function to save chat sessions to localStorage
const saveChatSessionsToStorage = (chatSessions: ChatSession[]) => {
  try {
    localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(chatSessions));
  } catch (error) {
    console.error('Failed to save chat sessions to storage:', error);
  }
};

// Helper function to save podcasts to localStorage
const savePodcastsToStorage = (podcasts: PodcastScript[]) => {
  try {
    localStorage.setItem(PODCASTS_STORAGE_KEY, JSON.stringify(podcasts));
  } catch (error) {
    console.error('Failed to save podcasts to storage:', error);
  }
};

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<Document[]>(() => loadDocumentsFromStorage());
  const [messages, setMessages] = useState<Message[]>(() => loadMessagesFromStorage());
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => loadChatSessionsFromStorage());
  const [podcasts, setPodcasts] = useState<PodcastScript[]>(() => loadPodcastsFromStorage());
  const [currentChatSession, setCurrentChatSession] = useState<string | null>(null);

  // Save to localStorage whenever documents change
  useEffect(() => {
    saveDocumentsToStorage(documents);
  }, [documents]);

  // Save to localStorage whenever messages change
  useEffect(() => {
    saveMessagesToStorage(messages);
  }, [messages]);

  // Save to localStorage whenever chat sessions change
  useEffect(() => {
    saveChatSessionsToStorage(chatSessions);
  }, [chatSessions]);

  // Save to localStorage whenever podcasts change
  useEffect(() => {
    savePodcastsToStorage(podcasts);
  }, [podcasts]);

  // Create default chat sessions for new documents
  useEffect(() => {
    documents.forEach(doc => {
      const existingSession = chatSessions.find(session => session.pdfId === doc.id);
      if (!existingSession && doc.status === 'processed') {
        const newSessionId = `chat-${doc.id}-${Date.now()}`;
        const newSession: ChatSession = {
          id: newSessionId,
          name: `Chat with ${doc.name}`,
          pdfId: doc.id,
          pdfName: doc.name,
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
          userQueries: [],
        };
        setChatSessions(prev => [...prev, newSession]);
        
        // Set as current chat session if no current session
        if (!currentChatSession) {
          setCurrentChatSession(newSessionId);
        }
      }
    });
  }, [documents, chatSessions, currentChatSession]);

  const addDocument = async (file: File): Promise<Document> => {
    const documentId = Date.now().toString();
    
    // Create blob URL for the file
    const fileUrl = URL.createObjectURL(file);
    
    const newDocument: Document = {
      id: documentId,
      name: file.name,
      size: formatFileSize(file.size),
      pages: estimatePages(file.size),
      uploadDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      status: 'uploading',
      fileUrl,
    };

    setDocuments(prev => [...prev, newDocument]);

    // Process the document and extract content
    try {
      // Extract text content from PDF
      const content = await geminiService.extractTextFromPDF(file);
      
      // Update status to processing summary
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === newDocument.id 
            ? { ...doc, status: 'processing_summary' as const, content }
            : doc
        )
      );
      
      // Generate AI summary
      const summary = await geminiService.generatePDFSummary(file.name, content);
      
      // Update document with summary and mark as processed
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === newDocument.id 
            ? { ...doc, status: 'processed' as const, summary }
            : doc
        )
      );
    } catch (error) {
      console.error('Error processing document:', error);
      // Mark as error if processing fails
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === newDocument.id 
            ? { ...doc, status: 'error' as const }
            : doc
        )
      );
    }

    return newDocument;
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const updateDocument = (id: string, updates: Partial<Document>) => {
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === id ? { ...doc, ...updates } : doc
      )
    );
  };

  const getDocumentById = (id: string): Document | undefined => {
    return documents.find(doc => doc.id === id);
  };

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      chatSessionId: message.chatSessionId || currentChatSession || undefined,
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Update last message time for the chat session
    if (newMessage.chatSessionId) {
      setChatSessions(prev => 
        prev.map(session => 
          session.id === newMessage.chatSessionId 
            ? { ...session, lastMessageAt: newMessage.timestamp }
            : session
        )
      );
    }
  };

  const clearMessages = () => {
    if (currentChatSession) {
      // Clear only messages for the current chat session
      setMessages(prev => prev.filter(msg => msg.chatSessionId !== currentChatSession));
    } else {
      // Clear all messages if no specific session
      setMessages([]);
    }
  };

  const createChatSession = (pdfId: string, pdfName: string): string => {
    const newSessionId = `chat-${pdfId}-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      name: `Chat with ${pdfName}`,
      pdfId,
      pdfName,
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      userQueries: [],
    };
    setChatSessions(prev => [...prev, newSession]);
    return newSessionId;
  };

  const deleteChatSession = (sessionId: string) => {
    setChatSessions(prev => prev.filter(session => session.id !== sessionId));
    setMessages(prev => prev.filter(msg => msg.chatSessionId !== sessionId));
    
    if (currentChatSession === sessionId) {
      setCurrentChatSession(null);
    }
  };

  const addUserQuery = (sessionId: string, query: string) => {
    if (!sessionId || !query.trim()) return;
    
    setChatSessions(prev => 
      prev.map(session => 
        session.id === sessionId 
          ? { ...session, userQueries: [...(session.userQueries || []), query] }
          : session
      )
    );
  };

  const getUserQueries = (sessionId: string): string[] => {
    if (!sessionId) return [];
    const session = chatSessions.find(session => session.id === sessionId);
    return session?.userQueries || [];
  };

  const getFileFromStore = async (documentId: string): Promise<File | null> => {
    const document = documents.find(d => d.id === documentId);
    if (!document?.fileUrl) {
      return null;
    }
    
    try {
      // Fetch the file from the blob URL
      const response = await fetch(document.fileUrl);
      const blob = await response.blob();
      
      // Create a File object from the blob
      const file = new File([blob], document.name, {
        type: 'application/pdf',
        lastModified: new Date(document.uploadDate).getTime(),
      });
      
      return file;
    } catch (error) {
      console.error('Failed to fetch file from blob URL:', error);
      return null;
    }
  };

  const getMessagesForSession = (sessionId: string): Message[] => {
    return messages.filter(msg => msg.chatSessionId === sessionId);
  };

  // Podcast methods
  const addPodcast = (podcast: PodcastScript) => {
    try {
      console.log('Adding podcast to context:', podcast.id, podcast.title);
      setPodcasts(prev => {
        // Check if podcast with same ID already exists
        const existingIndex = prev.findIndex(p => p.id === podcast.id);
        if (existingIndex !== -1) {
          // Update existing podcast
          const updated = [...prev];
          updated[existingIndex] = podcast;
          return updated;
        }
        // Add new podcast
        return [...prev, podcast];
      });
    } catch (error) {
      console.error('Error adding podcast to context:', error);
      throw error;
    }
  };

  const removePodcast = (id: string) => {
    setPodcasts(prev => prev.filter(p => p.id !== id));
  };

  const getPodcastById = (id: string): PodcastScript | undefined => {
    return podcasts.find(p => p.id === id);
  };

  const getPodcastsForDocument = (pdfId: string): PodcastScript[] => {
    return podcasts.filter(p => p.pdfId === pdfId);
  };

  const generateValidationReport = async (documentId: string): Promise<ValidationReport> => {
    const document = getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Update status to validating
    updateDocument(documentId, { validationStatus: 'validating' });

    try {
      // Get the file from storage
      const file = await getFileFromStore(documentId);
      if (!file) {
        throw new Error('File not found in storage');
      }

      // Generate validation report
      const report = await pdfValidationService.validatePDF(file);
      
      // Update document with validation report
      updateDocument(documentId, {
        validationReport: report,
        validationStatus: 'completed'
      });

      return report;
    } catch (error) {
      console.error('Failed to generate validation report:', error);
      updateDocument(documentId, { validationStatus: 'failed' });
      throw error;
    }
  };

  const getValidationReport = (documentId: string): ValidationReport | undefined => {
    const document = getDocumentById(documentId);
    return document?.validationReport;
  };

  const value: DocumentContextType = {
    documents,
    addDocument,
    removeDocument,
    updateDocument,
    getDocumentById,
    getFileFromStore,
    messages,
    addMessage,
    clearMessages,
    chatSessions,
    createChatSession,
    deleteChatSession,
    getMessagesForSession,
    currentChatSession,
    setCurrentChatSession,
    addUserQuery,
    getUserQueries,
    podcasts,
    addPodcast,
    removePodcast,
    getPodcastById,
    getPodcastsForDocument,
    generateValidationReport,
    getValidationReport,
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = (): DocumentContextType => {
  const context = useContext(DocumentContext);
  if (!context) {
    console.error('useDocuments called outside of DocumentProvider!');
    console.trace('Stack trace:');
    throw new Error('useDocuments must be used within a DocumentProvider. Make sure the component is wrapped with DocumentProvider.');
  }
  return context;
};