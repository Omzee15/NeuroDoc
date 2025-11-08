import { GoogleGenerativeAI } from '@google/generative-ai';
import { cleanMarkdownFormatting } from '../lib/utils';

// Initialize Gemini AI with PDF Chat API key (since this service is used for PDF operations)
const apiKey = import.meta.env.VITE_PDF_CHAT_GEMINI_API;
if (!apiKey) {
  console.error('VITE_PDF_CHAT_GEMINI_API environment variable is not set');
} else {
  console.log('PDF operations Gemini API key loaded successfully');
}

// Initialize PDF Chat specific Gemini AI
const pdfChatApiKey = import.meta.env.VITE_PDF_CHAT_GEMINI_API;
if (!pdfChatApiKey) {
  console.error('VITE_PDF_CHAT_GEMINI_API environment variable is not set');
} else {
  console.log('PDF Chat Gemini API key loaded successfully');
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const pdfChatGenAI = new GoogleGenerativeAI(pdfChatApiKey || '');

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mentionedPdfs?: string[];
}

export interface PDFContext {
  id: string;
  title: string;
  content?: string; // This would be extracted text from PDF in a real app
}

export class GeminiService {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  async sendMessage(
    message: string, 
    chatHistory: ChatMessage[], 
    mentionedPdfs: PDFContext[] = []
  ): Promise<string> {
    try {
      // Build context from mentioned PDFs
      let contextPrompt = '';
      if (mentionedPdfs.length > 0) {
        contextPrompt = `\n\nAvailable document content:\n${mentionedPdfs.map(pdf => 
          `=== ${pdf.title} ===\n${pdf.content || 'Content processing in progress'}`
        ).join('\n\n')}\n\nBASE YOUR RESPONSE STRICTLY ON THE PROVIDED DOCUMENT CONTENT.`;
      }

      // Build conversation history
      const historyPrompt = chatHistory.length > 0 
        ? `\n\nPrevious conversation:\n${chatHistory.map(msg => 
            `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
          ).join('\n')}\n\n`
        : '';

      // Construct the full prompt with clear instructions for deterministic responses
      const fullPrompt = `You are a precise document analysis assistant. Your role is to provide direct, factual answers based on document content.

RESPONSE GUIDELINES:
- Give definitive answers based on the provided documents
- State facts clearly and directly without uncertainty words like "probably", "might", "seems", "appears"
- If information is in the documents, present it as fact
- If information is NOT in the documents, clearly state "This information is not available in the provided documents"
- Use specific quotes or references from the documents when possible
- Be concise and to the point
- IMPORTANT: Do NOT use markdown formatting symbols like *, **, #, or other formatting. Write in plain text only.
- Present information in clear, natural sentences without special formatting

${contextPrompt}${historyPrompt}
Current question: ${message}

Provide a direct, factual response in plain text:`;

      // Add timeout to API call
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('API call timed out after 30 seconds')), 30000);
      });

      const apiPromise = this.model.generateContent(fullPrompt);

      const result = await Promise.race([apiPromise, timeoutPromise]);
      const response = await result.response;
      const rawText = response.text();
      
      // Clean any remaining markdown formatting as a backup measure
      const cleanText = cleanMarkdownFormatting(rawText);
      return cleanText;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          throw new Error('Request timed out. Please try again.');
        }
        throw new Error(`Failed to get response from Gemini: ${error.message}`);
      }
      throw new Error('Failed to get response from Gemini: Unknown error');
    }
  }

  async extractTextFromPDF(file: File): Promise<string> {
    // Placeholder for PDF text extraction
    // In a real implementation, you would use a PDF parsing library
    // like pdf-parse or pdfjs-dist to extract text
    return `[Text content from ${file.name} - This is a placeholder. 
In a real implementation, this would contain the actual extracted text from the PDF.]`;
  }

  async generatePDFSummary(title: string, content: string): Promise<string> {
    try {
      const prompt = `You are a professional document summarizer. Create a brief, concise summary of the following PDF document.

Document Title: ${title}

Document Content:
${content}

INSTRUCTIONS:
- Create a summary of MAXIMUM 8 lines (approximately 100-150 words)
- Focus on the most essential information and key points
- Use clear, direct language without unnecessary details
- Identify the main purpose, key topics, and important conclusions
- Make each line count - be precise and informative
- Avoid repetitive or filler content
- IMPORTANT: Write in plain text without any formatting symbols (no *, **, #, etc.)
- Present information in natural sentences without special formatting

Brief Summary in plain text:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const rawText = response.text();
      
      // Clean any remaining markdown formatting
      const cleanText = cleanMarkdownFormatting(rawText);
      return cleanText;
    } catch (error) {
      console.error('Error generating PDF summary:', error);
      return `Unable to generate summary for ${title}. Please try again later.`;
    }
  }
}

export const geminiService = new GeminiService();

// PDF Chat specific service using dedicated API key
export class PDFChatGeminiService {
  private model = pdfChatGenAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  async sendMessage(
    message: string,
    conversationHistory: ChatMessage[] = [],
    pdfContexts: PDFContext[] = []
  ): Promise<string> {
    try {
      console.log('PDF Chat - Sending message to Gemini:', message);
      
      // Build context from PDFs
      let pdfContext = '';
      if (pdfContexts && pdfContexts.length > 0) {
        pdfContext = pdfContexts.map(pdf => `
Document: ${pdf.title}
Content: ${pdf.content || 'No content available'}
`).join('\n');
      }

      // Build conversation history
      const historyText = conversationHistory.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n');

      const prompt = `${pdfContext ? `Context from uploaded PDFs:\n${pdfContext}\n` : ''}${historyText ? `Previous conversation:\n${historyText}\n` : ''}User: ${message}

INSTRUCTIONS:
- Provide helpful, accurate responses based on the PDF context and conversation history
- Write in plain, natural text without any formatting symbols
- Do NOT use markdown formatting (*, **, #, [], etc.) in your response
- Present information clearly and directly in regular text
- If referencing specific parts of documents, use simple language like "According to the document" or "The PDF mentions"

Please provide your response in plain text:`;

      console.log('PDF Chat - Sending prompt to Gemini');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const rawText = response.text();
      
      // Clean any remaining markdown formatting
      const cleanText = cleanMarkdownFormatting(rawText);
      
      console.log('PDF Chat - Received response from Gemini');
      return cleanText;
    } catch (error) {
      console.error('PDF Chat - Error calling Gemini API:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('429')) {
          return 'I apologize, but I\'m currently experiencing high demand. Please try again in a few moments.';
        } else if (error.message.includes('quota')) {
          return 'API quota exceeded. Please try again later.';
        }
      }
      
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  }
}

export const pdfChatGeminiService = new PDFChatGeminiService();