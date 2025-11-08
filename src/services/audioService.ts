import type { ConversationTurn } from './podcastService';

// ElevenLabs API configuration
const ELEVENLABS_API_KEY_1 = import.meta.env.VITE_ELEVENLABS_API;
const ELEVENLABS_API_KEY_2 = import.meta.env.VITE_ELEVENLABS_API2;

// Voice IDs for host and expert (free voices)
const HOST_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam - free voice
const EXPERT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel - free voice

// ElevenLabs API endpoint
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export interface AudioSegment {
  id: string;
  role: 'host' | 'expert';
  text: string;
  audioUrl?: string;
  audioBlob?: Blob;
  isGenerating: boolean;
  error?: string;
}

export interface PodcastAudio {
  segments: AudioSegment[];
  isGenerating: boolean;
  progress: number;
  totalSegments: number;
  completedSegments: number;
  fullAudioUrl?: string;
  error?: string;
}

export class AudioService {
  private hostApiKey: string;
  private expertApiKey: string;
  
  constructor() {
    this.hostApiKey = ELEVENLABS_API_KEY_1 || '';
    this.expertApiKey = ELEVENLABS_API_KEY_2 || '';
    
    if (!this.hostApiKey) {
      console.error('VITE_ELEVENLABS_API environment variable is not set');
    }
    if (!this.expertApiKey) {
      console.error('VITE_ELEVENLABS_API2 environment variable is not set');
    }
    
    console.log('🎵 AudioService initialized with dual ElevenLabs API keys');
  }

  /**
   * Generate audio for a single conversation turn
   */
  async generateTurnAudio(
    text: string, 
    role: 'host' | 'expert',
    onProgress?: (progress: { isGenerating: boolean; error?: string }) => void
  ): Promise<{ audioUrl: string; audioBlob: Blob }> {
    try {
      console.log(`🎙️ Generating ${role} audio:`, text.substring(0, 50) + '...');
      
      onProgress?.({ isGenerating: true });
      
      const voiceId = role === 'host' ? HOST_VOICE_ID : EXPERT_VOICE_ID;
      const apiKey = role === 'host' ? this.hostApiKey : this.expertApiKey;
      
      if (!apiKey) {
        throw new Error(`ElevenLabs API key not configured for ${role}`);
      }
      
      const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ElevenLabs API error for ${role}:`, response.status, errorText);
        
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded for ${role} voice. Please try again in a moment.`);
        } else if (response.status === 401) {
          throw new Error(`Invalid API key for ${role} voice`);
        } else if (response.status === 400) {
          throw new Error(`Invalid request for ${role} voice: ${errorText}`);
        }
        
        throw new Error(`Failed to generate ${role} audio: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      console.log(`✅ ${role} audio generated successfully`);
      onProgress?.({ isGenerating: false });
      
      return { audioUrl, audioBlob };
    } catch (error) {
      console.error(`Error generating ${role} audio:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to generate ${role} audio`;
      onProgress?.({ isGenerating: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  /**
   * Generate audio for entire podcast conversation
   */
  async generatePodcastAudio(
    conversation: ConversationTurn[],
    onProgress?: (progress: PodcastAudio) => void
  ): Promise<PodcastAudio> {
    try {
      console.log('🎵 Starting podcast audio generation for', conversation.length, 'segments');
      
      const totalSegments = conversation.length;
      const audioSegments: AudioSegment[] = conversation.map((turn, index) => ({
        id: `segment-${index}`,
        role: turn.role,
        text: turn.content,
        isGenerating: false
      }));

      let audioState: PodcastAudio = {
        segments: audioSegments,
        isGenerating: true,
        progress: 0,
        totalSegments,
        completedSegments: 0
      };

      // Notify initial state
      onProgress?.(audioState);

      // Generate audio for each segment
      for (let i = 0; i < conversation.length; i++) {
        const segment = audioSegments[i];
        
        try {
          console.log(`🎙️ Generating audio segment ${i + 1}/${totalSegments}`);
          
          // Update segment as generating
          segment.isGenerating = true;
          audioState = {
            ...audioState,
            segments: [...audioSegments]
          };
          onProgress?.(audioState);

          // Generate audio for this segment
          const { audioUrl, audioBlob } = await this.generateTurnAudio(
            segment.text,
            segment.role
          );

          // Update segment with generated audio
          segment.audioUrl = audioUrl;
          segment.audioBlob = audioBlob;
          segment.isGenerating = false;
          
          // Update progress
          const completedSegments = i + 1;
          const progress = (completedSegments / totalSegments) * 100;
          
          audioState = {
            ...audioState,
            segments: [...audioSegments],
            completedSegments,
            progress
          };
          
          console.log(`✅ Audio segment ${i + 1}/${totalSegments} completed (${Math.round(progress)}%)`);
          onProgress?.(audioState);
          
          // Add delay to respect rate limits
          if (i < conversation.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          }
          
        } catch (error) {
          console.error(`Error generating audio for segment ${i + 1}:`, error);
          segment.error = error instanceof Error ? error.message : 'Audio generation failed';
          segment.isGenerating = false;
          
          audioState = {
            ...audioState,
            segments: [...audioSegments]
          };
          onProgress?.(audioState);
          
          // Continue with next segment even if one fails
        }
      }

      // Generate combined audio file
      try {
        console.log('🔄 Combining audio segments...');
        const fullAudioUrl = await this.combineAudioSegments(audioSegments);
        audioState.fullAudioUrl = fullAudioUrl;
      } catch (error) {
        console.warn('Could not combine audio segments:', error);
        // This is not critical - individual segments can still be played
      }

      // Final state
      audioState.isGenerating = false;
      console.log('🎵 Podcast audio generation completed');
      onProgress?.(audioState);
      
      return audioState;
      
    } catch (error) {
      console.error('Error generating podcast audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Podcast audio generation failed';
      
      const errorState: PodcastAudio = {
        segments: conversation.map((turn, index) => ({
          id: `segment-${index}`,
          role: turn.role,
          text: turn.content,
          isGenerating: false,
          error: errorMessage
        })),
        isGenerating: false,
        progress: 0,
        totalSegments: conversation.length,
        completedSegments: 0,
        error: errorMessage
      };
      
      onProgress?.(errorState);
      return errorState;
    }
  }

  /**
   * Combine multiple audio segments into a single file
   */
  private async combineAudioSegments(segments: AudioSegment[]): Promise<string> {
    try {
      // Filter segments that have audio
      const audioSegments = segments.filter(s => s.audioBlob);
      
      if (audioSegments.length === 0) {
        throw new Error('No audio segments to combine');
      }

      if (audioSegments.length === 1) {
        // Return single audio URL if only one segment
        return audioSegments[0].audioUrl!;
      }

      // For multiple segments, we'll use Web Audio API to combine them
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffers: AudioBuffer[] = [];

      // Decode all audio segments
      for (const segment of audioSegments) {
        if (segment.audioBlob) {
          const arrayBuffer = await segment.audioBlob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          audioBuffers.push(audioBuffer);
        }
      }

      if (audioBuffers.length === 0) {
        throw new Error('No valid audio buffers to combine');
      }

      // Calculate total length
      const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
      const sampleRate = audioBuffers[0].sampleRate;
      const numberOfChannels = audioBuffers[0].numberOfChannels;

      // Create combined buffer
      const combinedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);

      // Copy all audio data
      let offset = 0;
      for (const buffer of audioBuffers) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          combinedBuffer.getChannelData(channel).set(channelData, offset);
        }
        offset += buffer.length;
      }

      // Convert to blob and create URL
      const offlineContext = new OfflineAudioContext(numberOfChannels, totalLength, sampleRate);
      const source = offlineContext.createBufferSource();
      source.buffer = combinedBuffer;
      source.connect(offlineContext.destination);
      source.start();

      const renderedBuffer = await offlineContext.startRendering();
      
      // Convert to WAV blob (simplified conversion)
      const wavBlob = this.audioBufferToWav(renderedBuffer);
      const combinedUrl = URL.createObjectURL(wavBlob);

      console.log('✅ Audio segments combined successfully');
      return combinedUrl;
      
    } catch (error) {
      console.error('Error combining audio segments:', error);
      throw error;
    }
  }

  /**
   * Convert AudioBuffer to WAV blob
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Clean up audio URLs to prevent memory leaks
   */
  cleanupAudioUrls(audioState: PodcastAudio): void {
    audioState.segments.forEach(segment => {
      if (segment.audioUrl) {
        URL.revokeObjectURL(segment.audioUrl);
      }
    });
    
    if (audioState.fullAudioUrl) {
      URL.revokeObjectURL(audioState.fullAudioUrl);
    }
  }
}

export const audioService = new AudioService();