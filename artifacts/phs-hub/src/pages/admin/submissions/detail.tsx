import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetSubmission, 
  useUpdateSubmission, 
  useApproveSubmission, 
  usePublishSubmission,
  useGenerateAiContent,
  useListSubmissionNotes,
  useAddSubmissionNote,
  useListSubmissionMedia,
  useDeleteMedia,
  useGetAiOutput,
  getGetSubmissionQueryKey,
  getListSubmissionNotesQueryKey,
  getGetDashboardStatsQueryKey,
  getListSubmissionsQueryKey,
  getListSubmissionMediaQueryKey,
  getGetAiOutputQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  ArrowLeft, CheckCircle, Sparkles, MessageSquare, 
  Trash2, FileText, Image as ImageIcon, Send, Link as LinkIcon, Download, Copy
} from "lucide-react";

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const submissionId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newNote, setNewNote] = useState("");

  const { data: sub, isLoading } = useGetSubmission(submissionId, {
    query: { enabled: !!submissionId, queryKey: getGetSubmissionQueryKey(submissionId) }
  });

  const { data: notes, isLoading: isLoadingNotes } = useListSubmissionNotes(submissionId, {
    query: { enabled: !!submissionId, queryKey: getListSubmissionNotesQueryKey(submissionId) }
  });

  const { data: media, isLoading: isLoadingMedia } = useListSubmissionMedia(submissionId, {
    query: { enabled: !!submissionId, queryKey: getListSubmissionMediaQueryKey(submissionId) }
  });

  const { data: aiOutput } = useGetAiOutput(submissionId, {
    query: { enabled: !!submissionId && !!sub?.aiGenerated, queryKey: getGetAiOutputQueryKey(submissionId) }
  });

  const updateStatus = useUpdateSubmission();
  const approve = useApproveSubmission();
  const publish = usePublishSubmission();
  const generateAi = useGenerateAiContent();
  const addNote = useAddSubmissionNote();
  const deleteMedia = useDeleteMedia();

  const handleStatusChange = (newStatus: any) => {
    updateStatus.mutate(
      { id: submissionId, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSubmissionQueryKey(submissionId) });
          queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          toast({ title: "Status updated", description: `Changed to ${newStatus.replace('_', ' ')}` });
        }
      }
    );
  };

  const handleApprove = () => {
    approve.mutate(
      { id: submissionId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSubmissionQueryKey(submissionId) });
          toast({ title: "Submission Approved" });
        }
      }
    );
  };

  const handlePublish = () => {
    publish.mutate(
      { id: submissionId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSubmissionQueryKey(submissionId) });
          toast({ title: "Submission Published" });
        }
      }
    );
  };

  const handleGenerateAi = () => {
    generateAi.mutate(
      { id: submissionId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSubmissionQueryKey(submissionId) });
          toast({ title: "AI Content Generation Started", description: "This might take a few moments." });
        }
      }
    );
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote.mutate(
      { id: submissionId, data: { content: newNote } },
      {
        onSuccess: () => {
          setNewNote("");
          queryClient.invalidateQueries({ queryKey: getListSubmissionNotesQueryKey(submissionId) });
          toast({ title: "Note added" });
        }
      }
    );
  };

  const handleDeleteMedia = (mediaId: number) => {
    if (confirm("Are you sure you want to delete this file?")) {
      deleteMedia.mutate(
        { mediaId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSubmissionMediaQueryKey(submissionId) });
            toast({ title: "Media deleted" });
          }
        }
      );
    }
  };

  const copyToClipboard = (text: string | undefined | null, name: string) => {
    if (!text) {
      toast({ title: `No ${name} available`, variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(text);
    toast({ title: `Copied ${name}` });
  };

  if (isLoading) {
    return <AdminLayout><div className="space-y-4"><Skeleton className="h-10 w-1/4"/><Skeleton className="h-[600px] w-full"/></div></AdminLayout>;
  }

  if (!sub) return <AdminLayout><div>Submission not found</div></AdminLayout>;

  // Separate media by type
  const photos = media?.filter(m => m.mediaType === 'photo') || [];
  const documents = media?.filter(m => m.mediaType === 'document') || [];
  const videoLinks = String(sub.formData?.videoLinks || "").split('\n').filter(l => l.trim() !== "");

  return (
    <AdminLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/submissions"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold tracking-tight" data-testid="text-horseName">{sub.horseName || "Unnamed Horse"}</h1>
            <Badge variant={sub.status === 'published' ? 'default' : 'secondary'} className="text-sm">
              {sub.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className="text-muted-foreground">{sub.breed} • {sub.age} yrs • Submitted by {sub.sellerName}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {sub.status === 'new' && (
            <Button onClick={() => handleStatusChange('processing')} variant="outline" data-testid="button-startProcessing">Start Processing</Button>
          )}
          {(sub.status === 'processing' || sub.status === 'awaiting_review') && (
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700" data-testid="button-approve">
              <CheckCircle className="mr-2 h-4 w-4" /> Approve
            </Button>
          )}
          {sub.status === 'approved' && (
            <Button onClick={handlePublish} className="bg-primary hover:bg-primary/90" data-testid="button-publish">
              Publish Listing
            </Button>
          )}
          <Button asChild variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-aiContent">
            <Link href={`/admin/submissions/${sub.id}/ai`}>
              <Sparkles className="mr-2 h-4 w-4" /> AI Content
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="form">
            <TabsList className="w-full justify-start border-b rounded-none h-auto bg-transparent p-0">
              <TabsTrigger value="form" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2" data-testid="tab-form">
                Original Seller Submission
              </TabsTrigger>
              <TabsTrigger value="media" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2" data-testid="tab-media">
                Media & Docs
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2" data-testid="tab-history">
                Status History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="pt-6">
              <Card>
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">Form Data</CardTitle>
                      <CardDescription>Read-only view of the data exactly as provided by the seller.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {Object.entries(sub.formData || {})
                      .filter(([key, value]) => key !== "agreeToDeclaration" && key !== "videoLinks")
                      .map(([key, value]) => {
                      if (!value || value === "") return null;
                      const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                        <div key={key} className="border-b pb-4 last:border-0 md:last:border-b-0">
                          <div className="text-sm font-medium text-muted-foreground mb-1">{title}</div>
                          <div className="text-base whitespace-pre-wrap">{String(value)}</div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="media" className="pt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5"/> Photos ({photos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMedia ? <Skeleton className="h-32 w-full" /> : photos.length === 0 ? (
                    <div className="text-muted-foreground text-sm italic">No photos uploaded.</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {photos.map(p => (
                        <div key={p.id} className="relative group rounded-md overflow-hidden border">
                          <img src={p.url} alt={p.originalName} className="object-cover w-full h-32" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="icon" variant="secondary" onClick={() => window.open(p.url, "_blank")}><Eye className="h-4 w-4" /></Button>
                            <Button size="icon" variant="destructive" onClick={() => handleDeleteMedia(p.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><LinkIcon className="h-5 w-5"/> Video Links</CardTitle>
                </CardHeader>
                <CardContent>
                  {videoLinks.length === 0 ? (
                    <div className="text-muted-foreground text-sm italic">No video links provided.</div>
                  ) : (
                    <ul className="space-y-2">
                      {videoLinks.map((link, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{link}</a>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5"/> Documents ({documents.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMedia ? <Skeleton className="h-20 w-full" /> : documents.length === 0 ? (
                    <div className="text-muted-foreground text-sm italic">No documents uploaded.</div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map(d => (
                        <div key={d.id} className="flex items-center justify-between p-3 border rounded-md">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{d.originalName}</p>
                              <p className="text-xs text-muted-foreground">{(d.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => window.open(d.url, "_blank")}><Download className="h-4 w-4 mr-1"/> View</Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteMedia(d.id)}><Trash2 className="h-4 w-4"/></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="pt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted-foreground/20 before:to-transparent">
                    {sub.statusHistory?.map((history: any, i: number) => (
                      <div key={history.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-primary bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-4 rounded-md border bg-card">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline">{history.toStatus.replace('_', ' ')}</Badge>
                            <time className="text-xs text-muted-foreground">{format(new Date(history.changedAt), 'MMM d, h:mm a')}</time>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> AI Generation Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm">Status</span>
                <Badge variant={sub.aiGenerated ? "default" : "secondary"}>
                  {sub.aiGenerated ? "Generated" : "Not Generated"}
                </Badge>
              </div>
              {!sub.aiGenerated && (
                <Button onClick={handleGenerateAi} disabled={generateAi.isPending} className="w-full" data-testid="button-generateAi">
                  {generateAi.isPending ? "Generating..." : "Generate AI Content"}
                </Button>
              )}
              {sub.aiGenerated && (
                <div className="space-y-2">
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/admin/submissions/${sub.id}/ai`}>Review & Edit Outputs</Link>
                  </Button>
                  <Separator className="my-4" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Exports</p>
                  <Button variant="ghost" className="w-full justify-start text-sm h-8" onClick={() => copyToClipboard(aiOutput?.masterListing, "Master Listing")}>
                    <Copy className="h-3 w-3 mr-2" /> Copy Master Listing
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm h-8" onClick={() => copyToClipboard(aiOutput?.shortListing, "Short Listing")}>
                    <Copy className="h-3 w-3 mr-2" /> Copy Short Listing
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm h-8" onClick={() => copyToClipboard(aiOutput?.socialCaption, "Social Caption")}>
                    <Copy className="h-3 w-3 mr-2" /> Copy Social Caption
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm h-8" onClick={() => copyToClipboard(aiOutput?.hashtags, "Hashtags")}>
                    <Copy className="h-3 w-3 mr-2" /> Copy Hashtags
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm h-8" onClick={() => copyToClipboard(aiOutput?.reelBrief, "Reel Brief")}>
                    <Download className="h-3 w-3 mr-2" /> Export Reel Brief
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-4">
              <div className="flex gap-2">
                <Textarea 
                  placeholder="Add a note..." 
                  value={newNote} 
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px]"
                  data-testid="textarea-newNote"
                />
              </div>
              <Button onClick={handleAddNote} disabled={addNote.isPending || !newNote.trim()} className="self-end" data-testid="button-saveNote">
                <Send className="h-4 w-4 mr-2" /> Save Note
              </Button>
              
              <Separator />
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {isLoadingNotes ? (
                  <Skeleton className="h-16 w-full" />
                ) : notes?.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">No internal notes yet.</div>
                ) : (
                  notes?.map((note: any) => (
                    <div key={note.id} className="bg-muted p-3 rounded-lg text-sm">
                      <div className="text-xs text-muted-foreground mb-1">
                        {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                      </div>
                      <div>{note.content}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
