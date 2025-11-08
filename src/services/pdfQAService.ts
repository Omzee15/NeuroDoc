import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { pdfChatGeminiService } from './geminiService';
import { cleanMarkdownFormatting } from '../lib/utils';

// Configure PDF.js worker - using a more reliable CDN
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
}

export interface QAHighlight {
  question: string;
  answer: string;
  pageNumber: number;
  textBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class PDFQAService {
  
  /**
   * Extract text from PDF file
   */
  async extractTextFromPDF(file: File): Promise<string> {
    try {
      console.log('Extracting text from PDF:', file.name);
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map((item: any) => item.str || '')
            .join(' ');
          
          fullText += pageText + '\n';
        } catch (pageError) {
          console.warn(`Error extracting text from page ${i}:`, pageError);
          // Continue with other pages
        }
      }
      
      // Clean up text
      const cleanedText = fullText
        .replace(/\n+/g, ' ')
        .replace(/[^\x20-\x7F]+/g, '')
        .trim();
        
      console.log('Extracted text length:', cleanedText.length);
      return cleanedText;
        
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Run extractive QA using Gemini
   */
  async runExtractiveQA(context: string, question: string): Promise<string> {
    try {
      console.log('Running extractive QA for question:', question);
      
      // Check if context is available
      if (!context || context.length < 50) {
        console.warn('Context is too short or empty');
        return 'Context not available for answering this question';
      }
      
      // Truncate context if too long (Gemini has token limits)
      const truncatedContext = context.length > 4000 ? 
        context.substring(0, 4000) + '...[truncated]' : 
        context;

      const prompt = `You are an extractive question answering system. Given the following context, find the exact text that answers the question.

IMPORTANT INSTRUCTIONS:
- Return only the specific text from the context that answers the question
- Do NOT use any formatting symbols like *, **, #, [], or other markdown
- Write in plain text only
- Keep your response concise (maximum 100 words)
- Do not add explanations, just extract the answer

Context: ${truncatedContext}

Question: ${question}

Extract the exact answer in plain text:`;

      console.log('Sending request to PDF Chat Gemini...');
      const response = await pdfChatGeminiService.sendMessage(prompt, [], []);
      const cleanAnswer = cleanMarkdownFormatting(response.trim());
      console.log('Extracted answer:', cleanAnswer.substring(0, 50) + '...');
      return cleanAnswer;
    } catch (error) {
      console.error('Error running extractive QA:', error);
      return `Error: ${error.message || 'Could not process this question'}`;
    }
  }

  /**
   * Find text positions in PDF pages
   */
  async findTextInPDF(file: File, searchText: string): Promise<{
    pageNumber: number;
    bounds: { x: number; y: number; width: number; height: number };
  }[]> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const results: { pageNumber: number; bounds: { x: number; y: number; width: number; height: number } }[] = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Simple text matching - in a real implementation, you'd want fuzzy matching
        for (const item of textContent.items as any[]) {
          if (item.str.toLowerCase().includes(searchText.toLowerCase())) {
            results.push({
              pageNumber: i,
              bounds: {
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height
              }
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error finding text in PDF:', error);
      return [];
    }
  }

  /**
   * Create highlighted PDF with answers
   */
  async createHighlightedPDF(
    file: File, 
    qaHighlights: Array<{ question: string; answer: string }>
  ): Promise<Uint8Array> {
    try {
      console.log('Creating highlighted PDF with', qaHighlights.length, 'highlights');
      
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      const pages = pdfDoc.getPages();
      console.log('PDF has', pages.length, 'pages');
      
      // For simplicity, add all Q&A as text annotations on the first page
      if (pages.length > 0) {
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();
        
        // Add a semi-transparent overlay
        firstPage.drawRectangle({
          x: 10,
          y: height - 200,
          width: width - 20,
          height: 180,
          color: rgb(1, 1, 1), // White background
          opacity: 0.9,
        });
        
        // Add border
        firstPage.drawRectangle({
          x: 10,
          y: height - 200,
          width: width - 20,
          height: 180,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
        
        // Add title
        firstPage.drawText('Q&A Highlights', {
          x: 20,
          y: height - 30,
          size: 16,
          color: rgb(0, 0, 0),
        });
        
        // Add Q&A pairs
        let yPosition = height - 55;
        
        for (let i = 0; i < Math.min(qaHighlights.length, 5); i++) { // Limit to 5 Q&A pairs
          const { question, answer } = qaHighlights[i];
          
          // Add question
          firstPage.drawText(`Q${i + 1}: ${question.substring(0, 80)}${question.length > 80 ? '...' : ''}`, {
            x: 20,
            y: yPosition,
            size: 10,
            color: rgb(0, 0, 0.8), // Blue for questions
          });
          
          yPosition -= 15;
          
          // Add answer
          const truncatedAnswer = answer.substring(0, 100) + (answer.length > 100 ? '...' : '');
          firstPage.drawText(`A: ${truncatedAnswer}`, {
            x: 25,
            y: yPosition,
            size: 9,
            color: rgb(0, 0.6, 0), // Green for answers
          });
          
          yPosition -= 20;
          
          if (yPosition < height - 180) break; // Stop if we run out of space
        }
      }
      
      const pdfBytes = await pdfDoc.save();
      console.log('Generated highlighted PDF of size:', pdfBytes.length, 'bytes');
      return pdfBytes;
      
    } catch (error) {
      console.error('Error creating highlighted PDF:', error);
      throw new Error(`Failed to create highlighted PDF: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Process multiple questions and create highlighted PDF
   */
  async processQAHighlights(file: File, questions: string[]): Promise<{
    highlightedPDF: Uint8Array;
    qaResults: QAHighlight[];
  }> {
    try {
      console.log('Processing QA highlights for', questions.length, 'questions');
      
      // Extract text from PDF
      const context = await this.extractTextFromPDF(file);
      
      if (!context || context.length < 50) {
        throw new Error('Could not extract meaningful text from PDF. The PDF might be image-based or corrupted.');
      }
      
      // Run QA for each question
      const qaResults: QAHighlight[] = [];
      
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        console.log(`Processing question ${i + 1}/${questions.length}: ${question}`);
        
        const answer = await this.runExtractiveQA(context, question);
        qaResults.push({
          question,
          answer,
          pageNumber: 1, // Simplified - in real implementation, find actual page
        });
      }
      
      console.log('Generated', qaResults.length, 'Q&A pairs');
      
      // Create highlighted PDF
      const highlightedPDF = await this.createHighlightedPDF(
        file,
        qaResults.map(qa => ({ question: qa.question, answer: qa.answer }))
      );
      
      console.log('Created highlighted PDF of size:', highlightedPDF.length, 'bytes');
      
      return {
        highlightedPDF,
        qaResults
      };
      
    } catch (error) {
      console.error('Error processing QA highlights:', error);
      throw new Error(`Failed to process QA highlights: ${error.message || 'Unknown error'}`);
    }
  }
}

export const pdfQAService = new PDFQAService();
