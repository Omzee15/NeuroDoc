import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { audioService, type PodcastAudio } from "./audioService";

const podcastApiKey1 = import.meta.env.VITE_PODCAST_GEMINI_API;
const podcastApiKey2 = import.meta.env.VITE_PODCAST_GEMINI_API_2;

// Configuration constants
const MAX_CONVERSATION_TURNS = 10; // Reduced from 50 to 10 exchanges

export interface ConversationTurn {
  role: 'host' | 'expert';
  content: string;
}

export interface PodcastScript {
  id: string;
  pdfId: string;
  title: string;
  createdAt: string;
  duration: string; // Estimated duration based on word count
  conversation: ConversationTurn[];
  skeleton: string;
  sectionSummaries: string;
  isGenerating?: boolean;
  totalTurns?: number;
  progress?: number;
  // Audio generation properties
  audioState?: PodcastAudio;
  isGeneratingAudio?: boolean;
  audioProgress?: number;
}

export class PodcastService {
  private hostModel: ChatGoogleGenerativeAI;
  private expertModel: ChatGoogleGenerativeAI;
  private lastRequestTime: number = 0;
  private readonly REQUEST_DELAY = 2000; // 2 seconds between requests

  constructor() {
    // Validate API keys
    if (!podcastApiKey1) {
      console.error('VITE_PODCAST_GEMINI_API environment variable is not set');
    }
    if (!podcastApiKey2) {
      console.error('VITE_PODCAST_GEMINI_API_2 environment variable is not set');
    }
    
    console.log('🔑 Initializing Gemini models with separate API keys');
    
    // Initialize two separate Gemini instances with different API keys for better rate limits
    this.hostModel = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: podcastApiKey1, // Use first API key for host
      maxOutputTokens: 2048,
      temperature: 0.7, // Slightly higher temperature for more creative host questions
    });

    this.expertModel = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: podcastApiKey2, // Use second API key for expert  
      maxOutputTokens: 2048,
      temperature: 0.5, // Lower temperature for more factual expert responses
    });
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      const waitTime = this.REQUEST_DELAY - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.waitForRateLimit();
        return await operation();
      } catch (error) {
        const isRateLimit = error.message?.includes('429') || 
                           error.message?.includes('rate limit') ||
                           error.message?.includes('quota');
        
        if (isRateLimit && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`🔄 Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  private async extractSkeletonAndSummaries(content: string): Promise<{ skeleton: string; sectionSummaries: string }> {
    console.log(`📊 Extracting document structure...`, { contentLength: content.length });
    
    const structureModel = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: podcastApiKey1, // Use first API key for structure analysis
      maxOutputTokens: 2048,
      temperature: 0.1, // Very low temperature for consistent structural analysis
    });

    const structurePrompt = ChatPromptTemplate.fromTemplate(`
      You are an expert document analyzer. Given the following document content, create:
      1. A detailed hierarchical skeleton outlining the main topics, subtopics, and key points.
      2. A concise summary for each major section that explains what readers will learn.

      FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
      ---SKELETON START---
      [The hierarchical skeleton here]
      ---SKELETON END---
      ---SUMMARIES START---
      [The section-by-section summaries here]
      ---SUMMARIES END---

      Document Content:
      {content}
    `);

    try {
      console.log(`📝 Sending structure analysis request...`);
      const result = await this.retryWithBackoff(async () => {
        return await structurePrompt.pipe(structureModel).invoke({ content });
      });

      const responseText = result.text;
      console.log(`📋 Structure analysis response received:`, {
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 300) + '...'
      });

      const skeleton = responseText.match(/---SKELETON START---([\s\S]*?)---SKELETON END---/)?.[1]?.trim() || '';
      const summaries = responseText.match(/---SUMMARIES START---([\s\S]*?)---SUMMARIES END---/)?.[1]?.trim() || '';

      console.log(`✅ Structure extraction completed:`, {
        skeletonFound: !!skeleton,
        summariesFound: !!summaries,
        skeletonLength: skeleton.length,
        summariesLength: summaries.length
      });

      if (!skeleton || !summaries) {
        console.warn(`⚠️ Missing structure parts:`, {
          skeleton: skeleton ? 'Found' : 'Missing',
          summaries: summaries ? 'Found' : 'Missing',
          fullResponse: responseText
        });
      }

      return { skeleton, sectionSummaries: summaries };
    } catch (error) {
      console.error(`❌ Error in structure extraction:`, error);
      throw error;
    }
  }

  private async generateConversationTurn(
    role: 'host' | 'expert',
    context: string,
    previousMessages: ConversationTurn[],
    skeleton: string,
    sectionSummaries: string
  ): Promise<string> {
    console.log(`🎙️ Generating ${role} turn`, {
      previousMessageCount: previousMessages.length,
      lastMessage: previousMessages[previousMessages.length - 1]
    });

    const model = role === 'host' ? this.hostModel : this.expertModel;
    
    const systemPrompt = role === 'host' 
      ? `You are a curious and engaging podcast host for NeuroDoc. Your role is to:
         - Ask insightful questions based on the document's structure
         - Show genuine interest in the expert's responses
         - Build on previous answers to create natural conversation flow
         - Focus on making complex topics accessible to listeners
         - Keep questions clear and specific
         - Always start with "Welcome to NeuroDoc" for the first message
         Use the provided skeleton to guide your questions through the document's structure.
         Each response should be a single question or brief follow-up comment.`
      : `You are a knowledgeable expert discussing the document's content on NeuroDoc. Your role is to:
         - Provide clear, accurate explanations based on the document
         - Use examples and analogies to make concepts accessible
         - Keep responses concise but informative (100-150 words)
         - Stay strictly within the scope of the document content
         - Acknowledge and build upon the host's questions
         You have deep knowledge of the document's content. Base your answers on the provided context.`;

    try {
      // Use a simpler approach that avoids complex message formatting
      let conversationContext = "";
      
      if (previousMessages.length > 0) {
        conversationContext = "\n\nPrevious conversation:\n";
        previousMessages.forEach((msg, index) => {
          conversationContext += `${msg.role === 'host' ? 'Host' : 'Expert'}: ${msg.content}\n`;
        });
      }

      const fullPrompt = `${systemPrompt}

Document Structure:
${skeleton}

Section Summaries:
${sectionSummaries}${conversationContext}

Now, as the ${role}, provide your next response:`;

      console.log(`📝 Sending prompt to ${role} model:`, {
        promptLength: fullPrompt.length,
        promptPreview: fullPrompt.substring(0, 200) + '...',
        apiKey: role === 'host' ? 'podcastApiKey1 (host)' : 'podcastApiKey2 (expert)'
      });

      const response = await this.retryWithBackoff(async () => {
        return await model.invoke(fullPrompt);
      });
      
      const responseText = typeof response.content === 'string' ? response.content : response.content.toString();
      
      console.log(`✅ ${role} response received:`, {
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 100) + '...'
      });

      return responseText;
    } catch (error) {
      console.error(`❌ Error generating ${role} turn:`, error);
      console.error(`Error details:`, {
        errorMessage: error.message,
        errorStack: error.stack,
        previousMessageCount: previousMessages.length,
        role
      });
      throw error;
    }
  }

  async generatePodcast(pdfId: string, title: string, content: string): Promise<PodcastScript> {
    console.log(`🚀 Starting podcast generation for: ${title}`, {
      pdfId,
      contentLength: content.length
    });

    try {
      // First, extract the skeleton and summaries
      console.log(`📋 Extracting skeleton and summaries...`);
      const { skeleton, sectionSummaries } = await this.extractSkeletonAndSummaries(content);
      console.log(`✅ Skeleton and summaries extracted:`, {
        skeletonLength: skeleton.length,
        summariesLength: sectionSummaries.length
      });

      // Initialize conversation array
      const conversation: ConversationTurn[] = [];

      // Generate initial host introduction
      console.log(`🎤 Generating host introduction...`);
      const introPrompt = ChatPromptTemplate.fromTemplate(`
        Create a brief, engaging podcast introduction for NeuroDoc discussing "{title}".
        Start with "Welcome to NeuroDoc! Today we'll be discussing..."
        Keep it under 50 words and make it sound natural and conversational.
        Focus on what listeners will learn from this document.
      `);

      const intro = await this.retryWithBackoff(async () => {
        return await introPrompt.pipe(this.hostModel).invoke({ title });
      });
      const introText = typeof intro.content === 'string' ? intro.content : intro.content.toString();
      conversation.push({ role: 'host', content: introText });
      console.log(`✅ Host introduction generated:`, introText.substring(0, 100) + '...');

      // Generate conversation turns
      console.log(`💬 Starting conversation generation (${MAX_CONVERSATION_TURNS} turns)...`);
      for (let i = 0; i < MAX_CONVERSATION_TURNS; i++) {
        try {
          console.log(`📝 Generating turn ${i + 1}/${MAX_CONVERSATION_TURNS}`);
          // Generate next turn based on whose turn it is
          const currentRole = i % 2 === 0 ? 'expert' : 'host';
          const apiKeyUsed = currentRole === 'host' ? 'podcastApiKey1' : 'podcastApiKey2';
          console.log(`🔑 Using ${apiKeyUsed} for ${currentRole} turn`);
          
          const response = await this.generateConversationTurn(
            currentRole,
            content,
            conversation,
            skeleton,
            sectionSummaries
          );
          conversation.push({ role: currentRole, content: response });
          console.log(`✅ Turn ${i + 1} completed (${currentRole})`);
          
          // Add a small delay between turns to avoid rate limits
          if (i < 49) { // Don't wait after the last turn
            console.log(`⏱️ Waiting 1s before next turn...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`❌ Error generating conversation turn ${i + 1}:`, error);
          break;
        }
      }

      // Calculate estimated duration (rough estimate: ~125 words per minute)
      console.log(`⏱️ Calculating duration...`);
      const totalWords = conversation.reduce((acc, turn) => acc + turn.content.split(' ').length, 0);
      const durationMinutes = Math.ceil(totalWords / 125);
      const duration = `${durationMinutes}:${(0).toString().padStart(2, '0')}`;
      console.log(`✅ Duration calculated: ${duration} (${totalWords} words)`);

      // Create and return the podcast script
      const podcastScript: PodcastScript = {
        id: crypto.randomUUID(),
        pdfId,
        title,
        createdAt: new Date().toISOString(),
        duration,
        conversation,
        skeleton,
        sectionSummaries,
        isGenerating: false,
      };

      console.log(`🎉 Podcast generation completed!`, {
        id: podcastScript.id,
        totalTurns: conversation.length,
        duration: podcastScript.duration
      });

      return podcastScript;
    } catch (error) {
      console.error(`❌ Error in podcast generation:`, error);
      throw error;
    }
  }

  async generatePodcastProgressive(
    pdfId: string, 
    title: string, 
    content: string,
    onProgress: (podcast: PodcastScript) => void
  ): Promise<PodcastScript> {
    console.log(`🚀 Starting progressive podcast generation for: ${title}`, {
      pdfId,
      contentLength: content.length
    });

    try {
      // First, extract the skeleton and summaries
      console.log(`📋 Extracting skeleton and summaries...`);
      const { skeleton, sectionSummaries } = await this.extractSkeletonAndSummaries(content);
      console.log(`✅ Skeleton and summaries extracted`);

      // Initialize conversation array
      const conversation: ConversationTurn[] = [];

      // Generate initial host introduction
      console.log(`🎤 Generating host introduction...`);
      const introPrompt = ChatPromptTemplate.fromTemplate(`
        Create a brief, engaging podcast introduction for NeuroDoc discussing "{title}".
        Start with "Welcome to NeuroDoc! Today we'll be discussing..."
        Keep it under 50 words and make it sound natural and conversational.
        Focus on what listeners will learn from this document.
      `);

      const intro = await this.retryWithBackoff(async () => {
        return await introPrompt.pipe(this.hostModel).invoke({ title });
      });
      const introText = typeof intro.content === 'string' ? intro.content : intro.content.toString();
      conversation.push({ role: 'host', content: introText });
      console.log(`✅ Host introduction generated`);

      // Create initial podcast script
      const podcastScript: PodcastScript = {
        id: crypto.randomUUID(),
        pdfId,
        title,
        createdAt: new Date().toISOString(),
        duration: "0:00",
        conversation: [...conversation],
        skeleton,
        sectionSummaries,
        isGenerating: true,
        totalTurns: MAX_CONVERSATION_TURNS,
        progress: 0,
      };

      // Notify initial progress
      onProgress(podcastScript);

      // Generate conversation turns
      console.log(`💬 Starting progressive conversation generation (${MAX_CONVERSATION_TURNS} turns)...`);
      for (let i = 0; i < MAX_CONVERSATION_TURNS; i++) {
        try {
          console.log(`📝 Generating turn ${i + 1}/${MAX_CONVERSATION_TURNS}`);
          const currentRole = i % 2 === 0 ? 'expert' : 'host';
          
          const response = await this.generateConversationTurn(
            currentRole,
            content,
            conversation,
            skeleton,
            sectionSummaries
          );
          conversation.push({ role: currentRole, content: response });
          
          // Calculate progress and duration
          const progressPercent = ((i + 1) / MAX_CONVERSATION_TURNS) * 100;
          const totalWords = conversation.reduce((acc, turn) => acc + turn.content.split(' ').length, 0);
          const durationMinutes = Math.ceil(totalWords / 125);
          const duration = `${durationMinutes}:${(0).toString().padStart(2, '0')}`;

          // Update podcast script
          const updatedScript: PodcastScript = {
            ...podcastScript,
            conversation: [...conversation],
            duration,
            progress: progressPercent,
            isGenerating: i < 49, // Still generating if not the last turn
          };

          // Notify progress
          onProgress(updatedScript);
          
          console.log(`✅ Turn ${i + 1} completed (${currentRole}) - ${progressPercent.toFixed(1)}%`);
          
          // Add a small delay between turns to avoid rate limits
          if (i < 49) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`❌ Error generating conversation turn ${i + 1}:`, error);
          
          // Mark as completed with error
          const errorScript: PodcastScript = {
            ...podcastScript,
            conversation: [...conversation],
            isGenerating: false,
            progress: 100,
          };
          onProgress(errorScript);
          break;
        }
      }

      // Final podcast script
      const totalWords = conversation.reduce((acc, turn) => acc + turn.content.split(' ').length, 0);
      const durationMinutes = Math.ceil(totalWords / 125);
      const duration = `${durationMinutes}:${(0).toString().padStart(2, '0')}`;

      const finalScript: PodcastScript = {
        ...podcastScript,
        conversation: [...conversation],
        duration,
        isGenerating: false,
        progress: 100,
      };

      console.log(`🎉 Progressive podcast generation completed!`, {
        id: finalScript.id,
        totalTurns: conversation.length,
        duration: finalScript.duration
      });

      return finalScript;
    } catch (error) {
      console.error(`❌ Error in progressive podcast generation:`, error);
      throw error;
    }
  }

  /**
   * Generate podcast with audio - first generates text script, then audio
   */
  async generatePodcastWithAudio(
    pdfId: string,
    pdfTitle: string,
    content: string,
    onProgress: (podcast: PodcastScript) => void
  ): Promise<PodcastScript> {
    try {
      console.log('🎵 Starting podcast generation with audio...');
      
      // Step 1: Generate text script with progress tracking
      const textScript = await this.generatePodcastProgressive(
        pdfId,
        pdfTitle, 
        content,
        (scriptProgress) => {
          // Forward text generation progress (0-50% of total)
          const adjustedProgress = {
            ...scriptProgress,
            progress: (scriptProgress.progress || 0) * 0.5, // Text is 50% of total process
          };
          onProgress(adjustedProgress);
        }
      );

      console.log('✅ Text script completed, starting audio generation...');

      // Step 2: Generate audio with progress tracking  
      const audioState = await audioService.generatePodcastAudio(
        textScript.conversation,
        (audioProgress) => {
          // Update podcast with audio progress (50-100% of total)
          const totalProgress = 50 + (audioProgress.progress * 0.5); // Audio is remaining 50%
          
          const updatedScript: PodcastScript = {
            ...textScript,
            audioState: audioProgress,
            isGeneratingAudio: audioProgress.isGenerating,
            audioProgress: audioProgress.progress,
            progress: totalProgress,
          };
          
          onProgress(updatedScript);
        }
      );

      // Final result with completed audio
      const finalScript: PodcastScript = {
        ...textScript,
        audioState,
        isGeneratingAudio: false,
        audioProgress: 100,
        progress: 100,
      };

      console.log('🎉 Podcast with audio generation completed!');
      return finalScript;

    } catch (error) {
      console.error('❌ Error generating podcast with audio:', error);
      throw error;
    }
  }

  /**
   * Generate audio for an existing podcast script
   */
  async generateAudioForScript(
    script: PodcastScript,
    onProgress: (audioState: PodcastAudio) => void
  ): Promise<PodcastAudio> {
    try {
      console.log('🎵 Generating audio for existing script...');
      
      if (!script.conversation || script.conversation.length === 0) {
        throw new Error('No conversation found in script');
      }

      return await audioService.generatePodcastAudio(script.conversation, onProgress);
    } catch (error) {
      console.error('❌ Error generating audio for script:', error);
      throw error;
    }
  }
}

export const podcastService = new PodcastService();