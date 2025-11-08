import React, { createContext, useContext, useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { PodcastScript } from '../services/podcastService';
import { ValidationReport, pdfValidationService } from '../services/pdfValidationService';
import { Quiz, QuizAttempt, quizService, QuizGenerationOptions } from '../services/quizService';

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
  fileDataBase64?: string; // Store file data as base64 string for localStorage persistence
  content?: string; // For storing document content/text
  summary?: string; // AI-generated summary (backward compatibility - defaults to short)
  shortSummary?: string; // AI-generated short summary
  detailedSummary?: string; // AI-generated detailed summary
  highlightPhrases?: string[]; // AI-extracted important phrases for highlighting
  validationReport?: ValidationReport; // PDF validation report
  validationStatus?: 'pending' | 'validating' | 'completed' | 'failed';
  validationText?: string; // Direct text validation result
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
  generateDirectValidation: (documentId: string) => Promise<string>;
  getValidationText: (documentId: string) => string | undefined;
  // Quiz-related methods
  quizzes: Quiz[];
  addQuiz: (quiz: Quiz) => void;
  removeQuiz: (id: string) => void;
  getQuizById: (id: string) => Quiz | undefined;
  getQuizzesForDocument: (pdfId: string) => Quiz[];
  generateQuiz: (options: QuizGenerationOptions) => Promise<Quiz>;
  quizAttempts: QuizAttempt[];
  addQuizAttempt: (attempt: QuizAttempt) => void;
  // Summary-related methods
  generateSummaryByType: (documentId: string, type: 'short' | 'detailed') => Promise<string>;
  // Highlighting-related methods
  generateHighlights: (documentId: string) => Promise<string[]>;
  getAttemptsForQuiz: (quizId: string) => QuizAttempt[];
  isGeneratingQuiz: boolean;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

const STORAGE_KEY = 'neurodoc_documents';
const MESSAGES_STORAGE_KEY = 'neurodoc_chat_messages';
const CHAT_SESSIONS_STORAGE_KEY = 'neurodoc_chat_sessions';
const PODCASTS_STORAGE_KEY = 'neurodoc_podcasts';
const QUIZZES_STORAGE_KEY = 'neurodoc_quizzes';
const QUIZ_ATTEMPTS_STORAGE_KEY = 'neurodoc_quiz_attempts';

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
    
    const loadedDocuments = JSON.parse(stored) as Document[];
    
    // Recreate blob URLs for documents that have base64 data
    return loadedDocuments.map(doc => {
      if (doc.fileDataBase64 && !doc.fileUrl) {
        try {
          // Convert base64 back to binary
          const binaryString = atob(doc.fileDataBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Create new blob URL
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const fileUrl = URL.createObjectURL(blob);
          
          return { ...doc, fileUrl };
        } catch (error) {
          console.error('Failed to recreate blob URL for document:', doc.name, error);
          return doc;
        }
      }
      return doc;
    });
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

// Helper function to load quizzes from localStorage
const loadQuizzesFromStorage = (): Quiz[] => {
  try {
    const stored = localStorage.getItem(QUIZZES_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load quizzes from storage:', error);
    return [];
  }
};

// Helper function to load quiz attempts from localStorage
const loadQuizAttemptsFromStorage = (): QuizAttempt[] => {
  try {
    const stored = localStorage.getItem(QUIZ_ATTEMPTS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load quiz attempts from storage:', error);
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

// Helper function to save quizzes to localStorage
const saveQuizzesToStorage = (quizzes: Quiz[]) => {
  try {
    localStorage.setItem(QUIZZES_STORAGE_KEY, JSON.stringify(quizzes));
  } catch (error) {
    console.error('Failed to save quizzes to storage:', error);
  }
};

// Helper function to save quiz attempts to localStorage
const saveQuizAttemptsToStorage = (attempts: QuizAttempt[]) => {
  try {
    localStorage.setItem(QUIZ_ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
  } catch (error) {
    console.error('Failed to save quiz attempts to storage:', error);
  }
};

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<Document[]>(() => loadDocumentsFromStorage());
  const [messages, setMessages] = useState<Message[]>(() => loadMessagesFromStorage());
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => loadChatSessionsFromStorage());
  const [podcasts, setPodcasts] = useState<PodcastScript[]>(() => loadPodcastsFromStorage());
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => loadQuizzesFromStorage());
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>(() => loadQuizAttemptsFromStorage());
  const [currentChatSession, setCurrentChatSession] = useState<string | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);

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

  // Save to localStorage whenever quizzes change
  useEffect(() => {
    saveQuizzesToStorage(quizzes);
  }, [quizzes]);

  // Save to localStorage whenever quiz attempts change
  useEffect(() => {
    saveQuizAttemptsToStorage(quizAttempts);
  }, [quizAttempts]);

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
    
    try {
      // Create blob URL for the file
      const fileUrl = URL.createObjectURL(file);
      
      // Only store file data for smaller files to avoid localStorage issues
      let fileDataBase64: string | undefined;
      if (file.size < 5 * 1024 * 1024) { // Only store files smaller than 5MB as base64
        try {
          const arrayBuffer = await file.arrayBuffer();
          fileDataBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        } catch (base64Error) {
          console.warn('Failed to create base64 for file, skipping base64 storage:', base64Error);
          // Continue without base64 storage
        }
      }
      
      const newDocument: Document = {
        id: documentId,
        name: file.name,
        size: formatFileSize(file.size),
        pages: estimatePages(file.size),
        uploadDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        status: 'uploading',
        fileUrl,
        fileDataBase64,
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
        
        // Generate AI summary (default to short summary for initial processing)
        const summary = await geminiService.generatePDFSummary(file.name, content, 'short');
        
        // Update document with summary and mark as processed
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === newDocument.id 
              ? { ...doc, status: 'processed' as const, summary, shortSummary: summary }
              : doc
          )
        );
      } catch (processingError) {
        console.error('Error processing document:', processingError);
        // Mark as error if processing fails
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === newDocument.id 
              ? { ...doc, status: 'error' as const }
              : doc
          )
        );
        throw processingError; // Re-throw to let the UI handle it
      }

      return newDocument;
    } catch (uploadError) {
      console.error('Error uploading document:', uploadError);
      throw new Error(`Failed to upload ${file.name}: ${uploadError.message || 'Unknown error'}`);
    }
  };

  const removeDocument = (id: string) => {
    // Clean up blob URL to prevent memory leaks
    const document = documents.find(doc => doc.id === id);
    if (document?.fileUrl) {
      URL.revokeObjectURL(document.fileUrl);
    }
    
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
    if (!document) {
      console.error('Document not found for ID:', documentId);
      return null;
    }
    
    try {
      // First try to use stored file data (most reliable)
      if (document.fileDataBase64) {
        try {
          // Convert base64 back to binary
          const binaryString = atob(document.fileDataBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const file = new File([bytes], document.name, {
            type: 'application/pdf',
            lastModified: new Date(document.uploadDate).getTime(),
          });
          return file;
        } catch (base64Error) {
          console.warn('Failed to convert base64 to file, trying blob URL:', base64Error);
          // Fall through to blob URL method
        }
      }
      
      // Fallback to blob URL if file data is not available
      if (document.fileUrl) {
        try {
          const response = await fetch(document.fileUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch from blob URL: ${response.status}`);
          }
          const blob = await response.blob();
          
          // Create a File object from the blob
          const file = new File([blob], document.name, {
            type: 'application/pdf',
            lastModified: new Date(document.uploadDate).getTime(),
          });
          
          return file;
        } catch (blobError) {
          console.warn('Failed to fetch from blob URL:', blobError);
          // Fall through to error
        }
      }
      
      console.error('No valid file data or blob URL available for document:', document.name);
      return null;
    } catch (error) {
      console.error('Failed to get file from store:', error);
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

  const generateDirectValidation = async (documentId: string): Promise<string> => {
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

      // Generate direct validation text
      const validationText = await pdfValidationService.validateContentDirectly(file);
      
      // Update document with validation text
      updateDocument(documentId, {
        validationText,
        validationStatus: 'completed'
      });

      return validationText;
    } catch (error) {
      console.error('Failed to generate direct validation:', error);
      updateDocument(documentId, { validationStatus: 'failed' });
      throw error;
    }
  };

  const getValidationText = (documentId: string): string | undefined => {
    const document = getDocumentById(documentId);
    return document?.validationText;
  };

  // Summary generation function
  const generateSummaryByType = async (documentId: string, type: 'short' | 'detailed'): Promise<string> => {
    const document = getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    if (!document.content) {
      throw new Error('Document content not available');
    }

    try {
      const summary = await geminiService.generatePDFSummary(document.name, document.content, type);
      
      // Update document with the appropriate summary type
      const updates: Partial<Document> = {};
      if (type === 'short') {
        updates.shortSummary = summary;
        updates.summary = summary; // For backward compatibility
      } else {
        updates.detailedSummary = summary;
      }
      
      updateDocument(documentId, updates);
      return summary;
    } catch (error) {
      console.error(`Failed to generate ${type} summary:`, error);
      throw error;
    }
  };

  // Highlighting generation function
  const generateHighlights = async (documentId: string): Promise<string[]> => {
    const document = getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    if (!document.content) {
      throw new Error('Document content not available');
    }

    try {
      const phrases = await geminiService.extractImportantPhrases(document.name, document.content);
      
      // Update document with highlight phrases
      updateDocument(documentId, { highlightPhrases: phrases });
      return phrases;
    } catch (error) {
      console.error('Failed to generate highlights:', error);
      throw error;
    }
  };

  // Quiz-related functions
  const addQuiz = (quiz: Quiz) => {
    setQuizzes(prev => [...prev, quiz]);
  };

  const removeQuiz = (id: string) => {
    setQuizzes(prev => prev.filter(quiz => quiz.id !== id));
    // Also remove related attempts
    setQuizAttempts(prev => prev.filter(attempt => attempt.quizId !== id));
  };

  const getQuizById = (id: string): Quiz | undefined => {
    return quizzes.find(quiz => quiz.id === id);
  };

  const getQuizzesForDocument = (pdfId: string): Quiz[] => {
    return quizzes.filter(quiz => quiz.pdfId === pdfId);
  };

  const generateQuiz = async (options: QuizGenerationOptions): Promise<Quiz> => {
    setIsGeneratingQuiz(true);
    try {
      const quiz = await quizService.generateQuiz(options);
      addQuiz(quiz);
      return quiz;
    } catch (error) {
      console.error('Failed to generate quiz:', error);
      throw error;
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const addQuizAttempt = (attempt: QuizAttempt) => {
    setQuizAttempts(prev => [...prev, attempt]);
  };

  const getAttemptsForQuiz = (quizId: string): QuizAttempt[] => {
    return quizAttempts.filter(attempt => attempt.quizId === quizId);
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
    generateDirectValidation,
    getValidationText,
    quizzes,
    addQuiz,
    removeQuiz,
    getQuizById,
    getQuizzesForDocument,
    generateQuiz,
    quizAttempts,
    addQuizAttempt,
    getAttemptsForQuiz,
    isGeneratingQuiz,
    generateSummaryByType,
    generateHighlights,
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