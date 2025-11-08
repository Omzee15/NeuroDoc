import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
}

export type ValidationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ValidationIssue {
  id: string;
  type: string;
  severity: ValidationSeverity;
  title: string;
  description: string;
  pageNumber?: number;
  suggestion?: string;
  count?: number;
}

export interface ValidationCategory {
  name: string;
  issues: ValidationIssue[];
  score: number; // 0-100
  description: string;
}

export interface ValidationReport {
  id: string;
  documentId: string;
  documentName: string;
  totalScore: number; // Overall score 0-100
  totalIssues: number;
  categories: ValidationCategory[];
  generatedAt: string;
  processingTime: number; // in milliseconds
}

export interface PDFAnalysisData {
  pageCount: number;
  hasText: boolean;
  textLength: number;
  hasImages: boolean;
  imageCount: number;
  hasForms: boolean;
  hasBookmarks: boolean;
  hasMetadata: boolean;
  metadata: any;
  pages: {
    pageNumber: number;
    textContent: string;
    textLength: number;
    hasImages: boolean;
    imageCount: number;
    hasErrors: boolean;
  }[];
}

export class PDFValidationService {
  private gemini: GoogleGenerativeAI;

  constructor() {
    const apiKey = import.meta.env.VITE_PDF_CHAT_GEMINI_API;
    if (!apiKey) {
      console.warn('VITE_PDF_CHAT_GEMINI_API not found. AI-powered validation will be disabled.');
    }
    this.gemini = new GoogleGenerativeAI(apiKey || '');
  }

  private generateIssueId(): string {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async validatePDF(file: File): Promise<ValidationReport> {
    const startTime = Date.now();
    
    try {
      const analysisData = await this.analyzePDFStructure(file);
      const categories = await this.performValidationChecks(analysisData);
      
      const totalIssues = categories.reduce((sum, cat) => sum + cat.issues.length, 0);
      const totalScore = Math.round(categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length);
      
      return {
        id: `validation_${Date.now()}`,
        documentId: file.name + '_' + file.lastModified,
        documentName: file.name,
        totalScore,
        totalIssues,
        categories,
        generatedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('PDF validation failed:', error);
      throw new Error('Failed to validate PDF. Please ensure it\'s a valid PDF file.');
    }
  }

  private async analyzePDFStructure(file: File): Promise<PDFAnalysisData> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const analysisData: PDFAnalysisData = {
      pageCount: pdf.numPages,
      hasText: false,
      textLength: 0,
      hasImages: false,
      imageCount: 0,
      hasForms: false,
      hasBookmarks: false,
      hasMetadata: false,
      metadata: null,
      pages: [],
    };

    // Get metadata
    try {
      const metadata = await pdf.getMetadata();
      analysisData.hasMetadata = !!metadata.metadata || !!metadata.info;
      analysisData.metadata = metadata;
    } catch (error) {
      console.warn('Could not extract metadata:', error);
    }

    // Analyze each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const operatorList = await page.getOperatorList();
        
        let pageText = '';
        textContent.items.forEach((item: any) => {
          if (item.str) {
            pageText += item.str + ' ';
          }
        });

        // Count images by looking for image operators
        let imageCount = 0;
        for (let i = 0; i < operatorList.fnArray.length; i++) {
          if (operatorList.fnArray[i] === pdfjsLib.OPS.paintImageXObject ||
              operatorList.fnArray[i] === pdfjsLib.OPS.paintXObject) {
            imageCount++;
          }
        }

        const pageData = {
          pageNumber: pageNum,
          textContent: pageText.trim(),
          textLength: pageText.trim().length,
          hasImages: imageCount > 0,
          imageCount,
          hasErrors: false,
        };

        analysisData.pages.push(pageData);
        analysisData.textLength += pageData.textLength;
        if (pageData.hasImages) {
          analysisData.hasImages = true;
          analysisData.imageCount += imageCount;
        }
        if (pageData.textLength > 0) {
          analysisData.hasText = true;
        }
      } catch (error) {
        console.warn(`Error analyzing page ${pageNum}:`, error);
        analysisData.pages.push({
          pageNumber: pageNum,
          textContent: '',
          textLength: 0,
          hasImages: false,
          imageCount: 0,
          hasErrors: true,
        });
      }
    }

    return analysisData;
  }

  private async performValidationChecks(data: PDFAnalysisData): Promise<ValidationCategory[]> {
    const basicCategories = [
      this.validateTextContent(data),
      this.validateStructure(data),
      this.validateAccessibility(data),
      this.validateMetadata(data),
      this.validateImages(data),
      this.validatePageConsistency(data),
    ];

    // Add AI-powered content validation if API key is available
    try {
      const aiCategory = await this.validateContentWithAI(data);
      return [...basicCategories, aiCategory];
    } catch (error) {
      console.warn('AI validation failed, using basic validation only:', error);
      return basicCategories;
    }
  }

  private async validateContentWithAI(data: PDFAnalysisData): Promise<ValidationCategory> {
    const issues: ValidationIssue[] = [];

    if (!this.gemini || !import.meta.env.VITE_PDF_CHAT_GEMINI_API || !data.hasText) {
      return {
        name: 'AI Content Analysis',
        description: 'AI-powered semantic content analysis',
        issues: [],
        score: 100,
      };
    }

    try {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      // Sample first few pages for analysis (to avoid token limits)
      const sampleText = data.pages
        .slice(0, 5) // First 5 pages
        .map(page => page.textContent)
        .join('\n')
        .substring(0, 8000); // Limit to ~8000 chars

      if (sampleText.length < 100) {
        return {
          name: 'AI Content Analysis',
          description: 'AI-powered semantic content analysis',
          issues: [],
          score: 95,
        };
      }

      const prompt = `
You are a content safety validator. Analyze the following PDF text content for potential safety and content issues. Focus specifically on:

1. INCORRECT CONTENT: Factual errors, misleading information, false claims, unsubstantiated statements
2. HARMFUL CONTENT: Content that could cause harm including:
   - Dangerous instructions or procedures
   - Misleading medical advice
   - Unsafe practices or recommendations
   - Discriminatory or hateful language
   - Inappropriate content for general audiences
3. MALPRACTICES: Content describing or promoting:
   - Unethical business practices
   - Legal violations or illegal activities
   - Professional misconduct
   - Academic dishonesty or plagiarism
   - Fraudulent activities

IMPORTANT: 
- If the content appears safe and contains no significant issues, return an empty array []
- Only flag genuine safety concerns, not minor formatting or stylistic issues
- Be precise and specific about what makes content problematic
- Focus on content that could actually harm readers or promote bad practices

Text to analyze:
"""
${sampleText}
"""

Respond with a JSON array of issues. Each issue should have:
- type: "incorrect_content" | "harmful_content" | "malpractice" | "safety_concern"
- severity: "low" | "medium" | "high" | "critical"
- title: string (brief description of the specific issue)
- description: string (detailed explanation of why this is problematic)
- suggestion: string (how to address or correct the issue)

If no safety issues are found, return: []
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse AI response
      try {
        const aiIssues = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
        
        if (Array.isArray(aiIssues) && aiIssues.length === 0) {
          // No issues found - document is safe
          issues.push({
            id: this.generateIssueId(),
            type: 'content_safe',
            severity: 'low',
            title: 'Content Safety Verified',
            description: 'AI analysis found no harmful content, malpractices, or significant factual errors in this document.',
            suggestion: 'Document appears safe for general use. Continue with regular content review as needed.',
          });
        } else if (Array.isArray(aiIssues)) {
          aiIssues.forEach((issue: any, index: number) => {
            if (issue.type && issue.severity && issue.title && issue.description) {
              issues.push({
                id: this.generateIssueId(),
                type: issue.type,
                severity: issue.severity,
                title: issue.title,
                description: issue.description,
                suggestion: issue.suggestion || 'Review the flagged content and consider removal or revision.',
              });
            }
          });
        }
      } catch (parseError) {
        console.warn('Failed to parse AI validation response:', parseError);
        // Add a generic safety check completed message if parsing fails
        issues.push({
          id: this.generateIssueId(),
          type: 'validation_completed',
          severity: 'low',
          title: 'Content Safety Check Completed',
          description: 'Content safety validation was performed but results could not be fully parsed. Manual review recommended.',
          suggestion: 'Consider performing a manual content review for safety and accuracy.',
        });
      }

    } catch (error) {
      console.warn('AI content validation failed:', error);
      // Don't throw error, just return empty results
    }

    // Calculate score based on issues found
    let score = 100;
    let hasSafetyIssues = false;
    
    issues.forEach(issue => {
      if (issue.type !== 'content_safe' && issue.type !== 'validation_completed') {
        hasSafetyIssues = true;
        switch (issue.severity) {
          case 'critical': score -= 30; break; // More severe penalty for safety issues
          case 'high': score -= 20; break;
          case 'medium': score -= 15; break;
          case 'low': score -= 5; break;
        }
      }
    });

    // If only safe content markers exist, ensure high score
    if (!hasSafetyIssues && issues.some(issue => issue.type === 'content_safe')) {
      score = 95; // High score for verified safe content
    }

    return {
      name: 'Content Safety Analysis',
      description: 'AI-powered analysis for harmful content, malpractices, and factual accuracy',
      issues,
      score: Math.max(0, score),
    };
  }

  private validateTextContent(data: PDFAnalysisData): ValidationCategory {
    const issues: ValidationIssue[] = [];

    // Check for no text content
    if (!data.hasText) {
      issues.push({
        id: this.generateIssueId(),
        type: 'no_text',
        severity: 'critical',
        title: 'No Text Content Found',
        description: 'This PDF appears to contain no extractable text content.',
        suggestion: 'Consider using OCR if this is a scanned document, or ensure the PDF contains selectable text.',
      });
    }

    // Check for minimal text content
    if (data.hasText && data.textLength < 100) {
      issues.push({
        id: this.generateIssueId(),
        type: 'minimal_text',
        severity: 'high',
        title: 'Minimal Text Content',
        description: `Only ${data.textLength} characters of text found across all pages.`,
        suggestion: 'Verify that the PDF contains the expected content or consider OCR for scanned documents.',
      });
    }

    // Check for pages with no text
    const emptyPages = data.pages.filter(page => page.textLength === 0);
    if (emptyPages.length > 0) {
      issues.push({
        id: this.generateIssueId(),
        type: 'empty_pages',
        severity: 'medium',
        title: 'Empty Pages Detected',
        description: `Found ${emptyPages.length} pages with no text content.`,
        pageNumber: emptyPages[0].pageNumber,
        count: emptyPages.length,
        suggestion: 'Review these pages to ensure they contain the expected content.',
      });
    }

    // Check for extremely long pages (potential formatting issues)
    const longPages = data.pages.filter(page => page.textLength > 10000);
    if (longPages.length > 0) {
      issues.push({
        id: this.generateIssueId(),
        type: 'long_pages',
        severity: 'low',
        title: 'Very Long Pages Detected',
        description: `Found ${longPages.length} pages with unusually large amounts of text.`,
        count: longPages.length,
        suggestion: 'These pages might have formatting issues or contain unstructured data.',
      });
    }

    // Calculate score based on text quality
    let score = 100;
    if (!data.hasText) score = 0;
    else if (data.textLength < 100) score = 20;
    else if (emptyPages.length > data.pageCount * 0.3) score -= 30;
    else if (emptyPages.length > 0) score -= 15;
    
    return {
      name: 'Text Content',
      description: 'Analysis of text extraction and content quality',
      issues,
      score: Math.max(0, score),
    };
  }

  private validateStructure(data: PDFAnalysisData): ValidationCategory {
    const issues: ValidationIssue[] = [];

    // Check for corrupted pages
    const corruptedPages = data.pages.filter(page => page.hasErrors);
    if (corruptedPages.length > 0) {
      issues.push({
        id: this.generateIssueId(),
        type: 'corrupted_pages',
        severity: 'critical',
        title: 'Corrupted Pages Found',
        description: `${corruptedPages.length} pages could not be processed properly.`,
        count: corruptedPages.length,
        suggestion: 'These pages may be corrupted or contain unsupported elements.',
      });
    }

    // Check for single page document (might indicate issue)
    if (data.pageCount === 1 && data.textLength > 5000) {
      issues.push({
        id: this.generateIssueId(),
        type: 'single_long_page',
        severity: 'medium',
        title: 'Single Page with Extensive Content',
        description: 'Large amount of content compressed into a single page.',
        suggestion: 'Consider if this content should be split across multiple pages for better readability.',
      });
    }

    // Check for no bookmarks in multi-page document
    if (data.pageCount > 10 && !data.hasBookmarks) {
      issues.push({
        id: this.generateIssueId(),
        type: 'no_bookmarks',
        severity: 'low',
        title: 'Missing Document Bookmarks',
        description: 'Multi-page document lacks navigation bookmarks.',
        suggestion: 'Consider adding bookmarks for better document navigation.',
      });
    }

    let score = 100;
    if (corruptedPages.length > 0) score -= (corruptedPages.length / data.pageCount) * 60;
    if (!data.hasBookmarks && data.pageCount > 10) score -= 10;

    return {
      name: 'Document Structure',
      description: 'Analysis of document organization and integrity',
      issues,
      score: Math.max(0, score),
    };
  }

  private validateAccessibility(data: PDFAnalysisData): ValidationCategory {
    const issues: ValidationIssue[] = [];

    // Check for image-only pages (accessibility concern)
    const imageOnlyPages = data.pages.filter(page => page.hasImages && page.textLength === 0);
    if (imageOnlyPages.length > 0) {
      issues.push({
        id: this.generateIssueId(),
        type: 'image_only_pages',
        severity: 'high',
        title: 'Image-Only Pages Found',
        description: `${imageOnlyPages.length} pages contain only images without text.`,
        count: imageOnlyPages.length,
        suggestion: 'Add alt text or OCR-extracted text to improve accessibility.',
      });
    }

    // Check for lack of metadata
    if (!data.hasMetadata) {
      issues.push({
        id: this.generateIssueId(),
        type: 'no_metadata',
        severity: 'medium',
        title: 'Missing Document Metadata',
        description: 'Document lacks title, author, or description metadata.',
        suggestion: 'Add document metadata to improve searchability and accessibility.',
      });
    }

    let score = 100;
    if (imageOnlyPages.length > 0) score -= (imageOnlyPages.length / data.pageCount) * 40;
    if (!data.hasMetadata) score -= 20;

    return {
      name: 'Accessibility',
      description: 'Analysis of document accessibility features',
      issues,
      score: Math.max(0, score),
    };
  }

  private validateMetadata(data: PDFAnalysisData): ValidationCategory {
    const issues: ValidationIssue[] = [];

    if (data.hasMetadata && data.metadata) {
      // Check for basic metadata fields
      const info = data.metadata.info || {};
      
      if (!info.Title) {
        issues.push({
          id: this.generateIssueId(),
          type: 'missing_title',
          severity: 'low',
          title: 'Missing Document Title',
          description: 'Document metadata lacks a title field.',
          suggestion: 'Add a descriptive title to improve document identification.',
        });
      }

      if (!info.Author && !info.Creator) {
        issues.push({
          id: this.generateIssueId(),
          type: 'missing_author',
          severity: 'low',
          title: 'Missing Author Information',
          description: 'Document metadata lacks author or creator information.',
          suggestion: 'Add author information for better document attribution.',
        });
      }

      // Check for creation date
      if (!info.CreationDate && !info.ModDate) {
        issues.push({
          id: this.generateIssueId(),
          type: 'missing_date',
          severity: 'low',
          title: 'Missing Date Information',
          description: 'Document lacks creation or modification date information.',
          suggestion: 'Date information helps with document versioning and organization.',
        });
      }
    }

    let score = data.hasMetadata ? 80 : 40;
    if (data.hasMetadata) {
      const info = data.metadata?.info || {};
      if (info.Title) score += 5;
      if (info.Author || info.Creator) score += 5;
      if (info.CreationDate || info.ModDate) score += 10;
    }

    return {
      name: 'Metadata Quality',
      description: 'Analysis of document metadata and properties',
      issues,
      score: Math.min(100, score),
    };
  }

  private validateImages(data: PDFAnalysisData): ValidationCategory {
    const issues: ValidationIssue[] = [];

    if (data.hasImages) {
      // Check for pages with excessive images
      const heavyImagePages = data.pages.filter(page => page.imageCount > 10);
      if (heavyImagePages.length > 0) {
        issues.push({
          id: this.generateIssueId(),
          type: 'excessive_images',
          severity: 'medium',
          title: 'Pages with Excessive Images',
          description: `${heavyImagePages.length} pages contain more than 10 images each.`,
          count: heavyImagePages.length,
          suggestion: 'Consider optimizing image usage for better document performance.',
        });
      }
    } else if (data.pageCount > 1 && !data.hasImages && data.textLength < 1000) {
      // Multi-page document with minimal text and no images might be scanned
      issues.push({
        id: this.generateIssueId(),
        type: 'possible_scanned',
        severity: 'medium',
        title: 'Possibly Scanned Document',
        description: 'Multi-page document with minimal text and no images detected.',
        suggestion: 'This might be a scanned document that needs OCR processing.',
      });
    }

    let score = 100;
    if (issues.length > 0) score -= issues.length * 15;

    return {
      name: 'Image Quality',
      description: 'Analysis of images and visual elements',
      issues,
      score: Math.max(0, score),
    };
  }

  private validatePageConsistency(data: PDFAnalysisData): ValidationCategory {
    const issues: ValidationIssue[] = [];

    if (data.pageCount > 1) {
      // Check for significant variance in page content length
      const pageLengths = data.pages.map(p => p.textLength);
      const avgLength = pageLengths.reduce((sum, len) => sum + len, 0) / pageLengths.length;
      const variance = pageLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / pageLengths.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev > avgLength * 0.8 && avgLength > 100) {
        issues.push({
          id: this.generateIssueId(),
          type: 'inconsistent_pages',
          severity: 'low',
          title: 'Inconsistent Page Content Length',
          description: 'Significant variation in content length between pages.',
          suggestion: 'Review document formatting for consistency.',
        });
      }

      // Check for alternating empty/full pages (might indicate scanning issues)
      let alternatingPattern = 0;
      for (let i = 1; i < data.pages.length; i++) {
        const current = data.pages[i].textLength === 0;
        const previous = data.pages[i - 1].textLength === 0;
        if (current !== previous) alternatingPattern++;
      }

      if (alternatingPattern > data.pageCount * 0.6) {
        issues.push({
          id: this.generateIssueId(),
          type: 'alternating_content',
          severity: 'medium',
          title: 'Alternating Empty/Full Pages',
          description: 'Pattern of alternating empty and content pages detected.',
          suggestion: 'This might indicate a scanning or formatting issue.',
        });
      }
    }

    let score = 100 - (issues.length * 20);

    return {
      name: 'Page Consistency',
      description: 'Analysis of consistency across document pages',
      issues,
      score: Math.max(0, score),
    };
  }
}

export const pdfValidationService = new PDFValidationService();