import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Mic, Plus, FileText, Clock, Calendar, User, MessageCircle, Loader2, ChevronLeft, ChevronRight, Trash2, Play, Pause, Download, Volume2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useDocuments } from "@/contexts/DocumentContext";
import { podcastService, type PodcastScript, type ConversationTurn } from "@/services/podcastService";
import { audioService, type PodcastAudio, type AudioSegment } from "@/services/audioService";
import { useToast } from "@/hooks/use-toast";

interface ConversationViewerProps {
  conversation: ConversationTurn[];
  showPagination?: boolean;
  currentPage?: number;
  messagesPerPage?: number;
  onPageChange?: (page: number) => void;
  isLiveGeneration?: boolean;
}

const ConversationViewer = ({ 
  conversation, 
  showPagination = false, 
  currentPage = 1, 
  messagesPerPage = 10,
  onPageChange,
  isLiveGeneration = false
}: ConversationViewerProps) => {
  const startIndex = (currentPage - 1) * messagesPerPage;
  const endIndex = startIndex + messagesPerPage;
  const displayedMessages = showPagination ? conversation.slice(startIndex, endIndex) : conversation;
  const totalPages = Math.ceil(conversation.length / messagesPerPage);

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {displayedMessages.map((turn, index) => {
          const actualIndex = showPagination ? startIndex + index : index;
          const isLatestMessage = isLiveGeneration && actualIndex === conversation.length - 1;
          
          return (
            <div 
              key={actualIndex} 
              className={`flex gap-3 ${isLatestMessage ? 'animate-pulse bg-blue-50 p-2 rounded-lg' : ''}`}
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                turn.role === 'host' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
              }`}>
                {turn.role === 'host' ? <User className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {turn.role === 'host' ? 'Host' : 'Expert'}
                  </span>
                  <Badge variant={turn.role === 'host' ? 'default' : 'secondary'} className="text-xs">
                    Turn {actualIndex + 1}
                  </Badge>
                  {isLatestMessage && (
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                      Latest
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {turn.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, conversation.length)} of {conversation.length} messages
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Audio Player Component - Simplified for popover
const AudioPlayer = ({ audioState }: { audioState: PodcastAudio }) => {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const playSegment = (segmentId: string) => {
    const segment = audioState.segments.find(s => s.id === segmentId);
    if (!segment || !segment.audioUrl) return;

    if (audioRef.current) {
      if (currentlyPlaying === segmentId && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.src = segment.audioUrl;
        audioRef.current.play();
        setCurrentlyPlaying(segmentId);
        setIsPlaying(true);
      }
    }
  };

  const playFullPodcast = () => {
    if (audioState.fullAudioUrl && audioRef.current) {
      if (currentlyPlaying === 'full' && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.src = audioState.fullAudioUrl;
        audioRef.current.play();
        setCurrentlyPlaying('full');
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Audio Playback</h4>
        {audioState.fullAudioUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={playFullPodcast}
            className="flex items-center gap-1 text-xs"
          >
            {currentlyPlaying === 'full' && isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            Play All
          </Button>
        )}
      </div>

      {audioState.isGenerating && (
        <div className="bg-blue-50 p-3 rounded">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Generating Audio...</span>
          </div>
          <Progress value={audioState.progress} className="h-1" />
          <div className="text-xs text-muted-foreground mt-1">
            {Math.round(audioState.progress)}% complete
          </div>
        </div>
      )}

      <div className="space-y-1 max-h-32 overflow-y-auto">
        {audioState.segments.map((segment, index) => (
          <div key={segment.id} className="flex items-center justify-between p-2 border rounded text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                segment.role === 'host' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
              }`}>
                {segment.role === 'host' ? <Mic className="h-2 w-2" /> : <User className="h-2 w-2" />}
              </div>
              <span className="font-medium capitalize flex-shrink-0">{segment.role}</span>
              <span className="text-muted-foreground truncate">{segment.text.substring(0, 30)}...</span>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {segment.isGenerating && (
                <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
              )}
              {segment.error && (
                <Badge variant="destructive" className="text-xs py-0">Error</Badge>
              )}
              {segment.audioUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playSegment(segment.id)}
                  className="h-6 w-6 p-0"
                >
                  {currentlyPlaying === segment.id && isPlaying ? 
                    <Pause className="h-3 w-3" /> : 
                    <Play className="h-3 w-3" />
                  }
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <audio
        ref={audioRef}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentlyPlaying(null);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
    </div>
  );
};

const Podcast = () => {
  const { documents, podcasts, addPodcast, removePodcast } = useDocuments();
  const { toast } = useToast();
  const [selectedDocument, setSelectedDocument] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewingScript, setViewingScript] = useState<PodcastScript | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingPodcast, setGeneratingPodcast] = useState<PodcastScript | null>(null);
  const [showLiveGeneration, setShowLiveGeneration] = useState(false);
  
  // Audio-related state
  const [generateWithAudio, setGenerateWithAudio] = useState(false);
  const [currentPlayingSegment, setCurrentPlayingSegment] = useState<string | null>(null);
  const [currentPlayingPodcast, setCurrentPlayingPodcast] = useState<string | null>(null);
  const [isPlayingFullPodcast, setIsPlayingFullPodcast] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const processedDocuments = documents.filter(doc => doc.status === 'processed' && doc.content);

  const handleCreatePodcast = async () => {
    if (!selectedDocument) {
      toast({
        title: "No Document Selected",
        description: "Please select a document to generate a podcast from.",
        variant: "destructive",
      });
      return;
    }

    const document = documents.find(doc => doc.id === selectedDocument);
    if (!document || !document.content) {
      toast({
        title: "Document Error",
        description: "Selected document content is not available.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setShowLiveGeneration(true);
    
    // Create initial podcast state for live tracking
    const initialPodcast: PodcastScript = {
      id: crypto.randomUUID(),
      pdfId: document.id,
      title: `${document.name} Discussion`,
      createdAt: new Date().toISOString(),
      duration: "0:00",
      conversation: [],
      skeleton: "",
      sectionSummaries: "",
      isGenerating: true,
      totalTurns: 10,
      progress: 0,
    };
    setGeneratingPodcast(initialPodcast);
    
    // Show initial toast with time estimate
    const timeEstimate = generateWithAudio ? "5-10 minutes" : "2-5 minutes";
    const processDescription = generateWithAudio ? 
      "Creating conversation script and generating audio in real-time..." : 
      "Creating conversation script in real-time...";
    
    toast({
      title: "Starting Podcast Generation",
      description: `${processDescription} This may take ${timeEstimate}.`,
    });

    try {
      let finalPodcastScript: PodcastScript;
      
      if (generateWithAudio) {
        // Generate podcast with audio
        finalPodcastScript = await podcastService.generatePodcastWithAudio(
          document.id,
          `${document.name} Discussion`,
          document.content,
          (progress: PodcastScript) => {
            console.log('Progress update received:', {
              conversationLength: progress.conversation.length,
              progress: progress.progress,
              isGenerating: progress.isGenerating,
              isGeneratingAudio: progress.isGeneratingAudio,
              audioProgress: progress.audioProgress
            });
            setGeneratingPodcast({ ...progress });
          }
        );
      } else {
        // Generate text-only podcast
        finalPodcastScript = await podcastService.generatePodcastProgressive(
          document.id,
          `${document.name} Discussion`,
          document.content,
          (progress: PodcastScript) => {
            console.log('Progress update received:', {
              conversationLength: progress.conversation.length,
              progress: progress.progress,
              isGenerating: progress.isGenerating
            });
            setGeneratingPodcast({ ...progress });
          }
        );
      }
      
      // Final completion
      addPodcast(finalPodcastScript);
      setViewingScript(finalPodcastScript);
      setGeneratingPodcast(null);
      setShowLiveGeneration(false);
      
      const successMessage = generateWithAudio ? 
        `Successfully created ${finalPodcastScript.conversation.length}-turn conversation with audio for ${document.name}` :
        `Successfully created ${finalPodcastScript.conversation.length}-turn conversation script for ${document.name}`;
      
      toast({
        title: "Podcast Generated!",
        description: successMessage,
      });
    } catch (error) {
      console.error('Error generating podcast:', error);
      setGeneratingPodcast(null);
      setShowLiveGeneration(false);
      toast({
        title: "Generation Failed",
        description: "Failed to generate podcast. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeletePodcast = (podcastId: string, podcastTitle: string) => {
    removePodcast(podcastId);
    toast({
      title: "Podcast Deleted",
      description: `"${podcastTitle}" has been removed from your podcasts.`,
    });
    
    // Close script viewer if it was viewing the deleted podcast
    if (viewingScript?.id === podcastId) {
      setViewingScript(null);
    }
  };

  const handleGenerateAudioForScript = async (script: PodcastScript) => {
    if (!script) return;
    
    setIsGenerating(true);
    
    try {
      toast({
        title: "Generating Audio",
        description: "Creating AI voice audio for your podcast script. This may take 3-5 minutes...",
      });

      const audioState = await podcastService.generateAudioForScript(
        script,
        (audioProgress) => {
          // Update the viewing script with audio progress
          setViewingScript(prev => prev ? {
            ...prev,
            audioState: audioProgress,
            isGeneratingAudio: audioProgress.isGenerating,
            audioProgress: audioProgress.progress,
          } : null);
        }
      );

      // Update the script in the documents context with the audio state
      const updatedScript = {
        ...script,
        audioState,
        isGeneratingAudio: false,
        audioProgress: 100,
      };
      
      // Update podcast in the documents context
      addPodcast(updatedScript);
      setViewingScript(updatedScript);
      
      toast({
        title: "Audio Generated!",
        description: "AI voice audio has been successfully created for your podcast.",
      });
      
    } catch (error) {
      console.error('Error generating audio for script:', error);
      toast({
        title: "Audio Generation Failed",
        description: "Failed to generate audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPodcast = (podcast: PodcastScript) => {
    if (!podcast.audioState || !podcast.audioState.fullAudioUrl) {
      toast({
        title: "No Audio Available",
        description: "This podcast doesn't have audio yet. Generate audio first to play it.",
        variant: "destructive",
      });
      return;
    }

    if (audioRef.current) {
      if (currentPlayingPodcast === podcast.id && isPlayingFullPodcast) {
        // Pause current podcast
        audioRef.current.pause();
        setIsPlayingFullPodcast(false);
        setCurrentPlayingPodcast(null);
      } else {
        // Play new podcast
        audioRef.current.src = podcast.audioState.fullAudioUrl;
        audioRef.current.play();
        setCurrentPlayingPodcast(podcast.id);
        setIsPlayingFullPodcast(true);
      }
    }
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Podcast Generation</h1>
          <p className="text-muted-foreground mt-1">
            Convert your PDFs into engaging conversation scripts
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Podcast
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate New Podcast</DialogTitle>
              <DialogDescription>
                Select a processed document to generate a conversation script between two AI hosts.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Document</label>
                <Select value={selectedDocument} onValueChange={setSelectedDocument}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a document..." />
                  </SelectTrigger>
                  <SelectContent>
                    {processedDocuments.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {doc.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      Generate Audio
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Create AI-generated voice audio for the conversation
                    </div>
                  </div>
                  <Button
                    variant={generateWithAudio ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGenerateWithAudio(!generateWithAudio)}
                  >
                    {generateWithAudio ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                
                {generateWithAudio && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    <p>⚡ Audio generation will use ElevenLabs AI voices</p>
                    <p>⏱️ This will increase generation time to 5-10 minutes</p>
                  </div>
                )}
              </div>
              
              {processedDocuments.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    No processed documents available. Upload and process a PDF first.
                  </p>
                </div>
              )}
              
              <Button 
                onClick={handleCreatePodcast}
                disabled={!selectedDocument || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {generateWithAudio ? "Generating Script & Audio..." : "Generating Script..."}
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    {generateWithAudio ? "Generate Podcast with Audio" : "Generate Podcast Script"}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Live Generation Section */}
      {((showLiveGeneration && generatingPodcast) || isGenerating) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  Creating: {generatingPodcast?.title || 'Podcast'}
                </CardTitle>
                <CardDescription>
                  {generatingPodcast?.conversation ? 
                    "Generating conversation in real-time between AI hosts..." :
                    "Setting up podcast generation..."
                  }
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <Badge variant="outline" className="bg-white mb-2">
                    {generatingPodcast?.progress ? `${Math.round(generatingPodcast.progress)}%` : '0%'} complete
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Generating podcast script
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {generatingPodcast?.conversation?.length > 0 && generatingPodcast?.progress && generatingPodcast.progress > 0 
                      ? `~${Math.round((100 - generatingPodcast.progress) * 3 / 100)} min remaining`
                      : 'Estimated: 2-5 min'}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLiveGeneration(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Hide
                </Button>
              </div>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${generatingPodcast?.progress || 0}%` }}
              ></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Duration: {generatingPodcast?.duration || '0:00'}
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {generatingPodcast?.conversation?.length || 0} exchanges generated
                </div>
                <div className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                  {!generatingPodcast?.conversation?.length || generatingPodcast.conversation.length === 0 
                    ? "Extracting document structure..." 
                    : `Generating ${generatingPodcast.conversation.length % 2 === 0 ? 'expert' : 'host'} response...`}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Live Script Generation
                </h3>
                <div 
                  className="rounded-md border p-4 bg-white max-h-96 overflow-y-auto"
                  ref={(el) => {
                    // Auto scroll to bottom when new content is added
                    if (el && generatingPodcast?.isGenerating) {
                      el.scrollTop = el.scrollHeight;
                    }
                  }}
                >
                  {generatingPodcast?.conversation ? (
                    <ConversationViewer 
                      conversation={generatingPodcast.conversation}
                      showPagination={false}
                      isLiveGeneration={true}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Setting up podcast generation...</p>
                    </div>
                  )}
                  {generatingPodcast?.conversation?.length > 0 && generatingPodcast?.isGenerating && (
                    <div className="mt-4 p-2 bg-blue-50 rounded border flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating next response...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Podcasts Section */}
      {podcasts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">My Podcasts</h2>
            <Badge variant="outline">{podcasts.length}</Badge>
          </div>
          
          <div className="grid gap-4">
            {podcasts.map((podcast) => (
              <Card key={podcast.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Mic className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{podcast.title}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {podcast.duration}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(podcast.createdAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {podcast.conversation.length} exchanges
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingScript(podcast)}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        View Script
                      </Button>
                      {podcast.audioState?.fullAudioUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePlayPodcast(podcast)}
                          className={`gap-1 ${
                            currentPlayingPodcast === podcast.id && isPlayingFullPodcast
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : ''
                          }`}
                        >
                          {currentPlayingPodcast === podcast.id && isPlayingFullPodcast ? (
                            <>
                              <Pause className="h-3 w-3" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" />
                              Play
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePodcast(podcast.id, podcast.title)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {podcasts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Mic className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No podcasts yet</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Create your first podcast from a PDF document
            </p>
          </CardContent>
        </Card>
      )}

      {/* Script Viewer Dialog */}
      <Dialog open={!!viewingScript} onOpenChange={() => setViewingScript(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewingScript?.title}
            </DialogTitle>
            <DialogDescription>
              Generated podcast script with {viewingScript?.conversation.length} conversation turns
            </DialogDescription>
          </DialogHeader>
          
          {viewingScript && (
            <div className="space-y-4">
              {/* Metadata */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Duration: {viewingScript.duration}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created: {formatDate(viewingScript.createdAt)}
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {viewingScript.conversation.length} exchanges
                </div>
              </div>
              
              <Separator />
              
              {/* Conversation Script */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Podcast Script
                </h3>
                <div className="rounded-md border p-4 max-h-[50vh] overflow-y-auto">
                  <ConversationViewer 
                    conversation={viewingScript.conversation}
                    showPagination={true}
                    currentPage={currentPage}
                    messagesPerPage={10}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </div>

              {/* Audio Player */}
              {viewingScript.audioState && (
                <>
                  <Separator />
                  <AudioPlayer audioState={viewingScript.audioState} />
                </>
              )}

              {/* Generate Audio Button for existing scripts */}
              {!viewingScript.audioState && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      Audio Generation
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Generate AI voice audio for this podcast script using ElevenLabs.
                    </p>
                    <Button
                      onClick={() => handleGenerateAudioForScript(viewingScript)}
                      disabled={isGenerating}
                      className="flex items-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating Audio...
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-4 w-4" />
                          Generate Audio
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Minimized Generation Indicator */}
      {!showLiveGeneration && generatingPodcast && generatingPodcast?.isGenerating && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg p-3 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
              <span className="text-sm font-medium">Generating Podcast...</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowLiveGeneration(true)}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-secondary h-1 rounded-full">
              <div 
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${generatingPodcast?.progress || 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-muted-foreground">
              {Math.round(generatingPodcast?.progress || 0)}% complete
            </div>
          </div>
        </div>
      )}
      
      {/* Main listing audio player */}
      <audio
        ref={audioRef}
        onEnded={() => {
          setCurrentPlayingPodcast(null);
          setIsPlayingFullPodcast(false);
        }}
        onPause={() => setIsPlayingFullPodcast(false)}
        onPlay={() => setIsPlayingFullPodcast(true)}
      />
    </div>
  );
};

export default Podcast;
