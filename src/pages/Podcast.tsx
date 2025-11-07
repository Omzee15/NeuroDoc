import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Play, Pause, Download, Plus } from "lucide-react";
import { useState } from "react";

const podcasts = [
  {
    id: "1",
    title: "Research Paper 2024 Summary",
    duration: "12:34",
    createdDate: "2024-01-15",
  },
  {
    id: "2",
    title: "Business Report Overview",
    duration: "8:45",
    createdDate: "2024-01-14",
  },
];

const Podcast = () => {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Podcast Generation</h1>
          <p className="text-muted-foreground mt-1">
            Convert your PDFs into audio summaries
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Podcast
        </Button>
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
                  <div>
                    <CardTitle className="text-lg">{podcast.title}</CardTitle>
                    <CardDescription>
                      Duration: {podcast.duration} • Created {podcast.createdDate}
                    </CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button
                  size="lg"
                  onClick={() =>
                    setPlayingId(playingId === podcast.id ? null : podcast.id)
                  }
                  className="rounded-full"
                >
                  {playingId === podcast.id ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-1" />
                  )}
                </Button>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-primary rounded-full" />
                </div>
                <span className="text-sm text-muted-foreground">
                  {podcast.duration}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {podcasts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No podcasts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first podcast from a PDF document
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Podcast
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Podcast;
