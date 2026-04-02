import { useState, useRef, useCallback, useEffect } from "react";
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
import { useQueryClient, useQuery } from "@tanstack/react-query";
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
  Trash2, FileText, Image as ImageIcon, Send, Link as LinkIcon, Download, Copy,
  UploadCloud, Video, Loader2, Eye, Film
} from "lucide-react";

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const submissionId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newNote, setNewNote] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<{ name: string; progress: number }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Creatomate reel state
  const [reelRenderId, setReelRenderId] = useState<string | null>(null);
  const [reelTemplateDbId, setReelTemplateDbId] = useState<number | null>(null);
  const [reelStatus, setReelStatus] = useState<"idle" | "pending" | "polling" | "succeeded" | "failed">("idle");
  const [reelUrl, setReelUrl] = useState<string | null>(null);
  const [reelError, setReelError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: reelTemplates = [] } = useQuery<{ id: number; name: string; description: string | null; isDefault: boolean }[]>({
    queryKey: ["reel-templates"],
    queryFn: async () => {
      const res = await fetch("/api/reel-templates");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Auto-select default or first template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  useEffect(() => {
    if (reelTemplates.length > 0 && !selectedTemplateId) {
      const def = reelTemplates.find((t) => t.isDefault) ?? reelTemplates[0];
      setSelectedTemplateId(String(def.id));
    }
  }, [reelTemplates, selectedTemplateId]);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const pollReelStatus = useCallback((renderId: string, templateDbId: number) => {
    stopPolling();
    setReelStatus("polling");
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/submissions/${submissionId}/reel/${renderId}?templateId=${templateDbId}`);
        if (!res.ok) throw new Error("Poll failed");
        const data = await res.json();
        if (data.status === "succeeded") {
          setReelStatus("succeeded");
          setReelUrl(data.url);
          stopPolling();
          toast({ title: "Reel ready!", description: "Your video has been rendered successfully." });
        } else if (data.status === "failed") {
          setReelStatus("failed");
          setReelError("Render failed. Please try again.");
          stopPolling();
        }
      } catch {
        // keep polling
      }
    }, 5000);
  }, [submissionId, toast]);

  const handleGenerateReel = async () => {
    if (!selectedTemplateId) {
      toast({ title: "Select a reel template first.", variant: "destructive" });
      return;
    }
    const templateDbId = parseInt(selectedTemplateId);
    setReelStatus("pending");
    setReelError(null);
    setReelUrl(null);
    setReelTemplateDbId(templateDbId);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/reel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: templateDbId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start render");
      setReelRenderId(data.renderId);
      if (data.status === "succeeded") {
        setReelStatus("succeeded");
        setReelUrl(data.url);
      } else {
        pollReelStatus(data.renderId, templateDbId);
      }
      toast({ title: "Reel render started!", description: "This usually takes 30–60 seconds." });
    } catch (err: any) {
      setReelStatus("failed");
      setReelError(err.message);
      toast({ title: "Reel failed", description: err.message, variant: "destructive" });
    }
  };

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

  const handleUploadFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const newEntries = files.map(f => ({ name: f.name, progress: 0 }));
    setUploadingFiles(prev => [...prev, ...newEntries]);

    await Promise.all(files.map(async (file) => {
      const mediaType = file.type.startsWith("image/") ? "photo"
        : file.type.startsWith("video/") ? "video"
        : "document";
      try {
        const urlRes = await fetch("/api/media/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId, filename: file.name, mimeType: file.type, mediaType }),
        });
        if (!urlRes.ok) throw new Error("Failed to get upload URL");
        const { uploadUrl } = await urlRes.json();

        const form = new FormData();
        form.append("file", file);
        const uploadRes = await fetch(uploadUrl, { method: "POST", body: form });
        if (!uploadRes.ok) throw new Error("Upload failed");

        setUploadingFiles(prev => prev.map(u => u.name === file.name ? { ...u, progress: 100 } : u));
      } catch (err) {
        toast({ title: `Failed to upload ${file.name}`, variant: "destructive" });
        setUploadingFiles(prev => prev.filter(u => u.name !== file.name));
      }
    }));

    queryClient.invalidateQueries({ queryKey: getListSubmissionMediaQueryKey(submissionId) });
    setTimeout(() => setUploadingFiles([]), 1500);
    toast({ title: "Upload complete" });
  }, [submissionId, queryClient, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleUploadFiles(files);
  }, [handleUploadFiles]);

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
  const uploadedVideos = media?.filter(m => m.mediaType === 'video') || [];
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
            <Button onClick={handleApprove} className="bg-[#24384e] hover:bg-[#1a2d3f]" data-testid="button-approve">
              <CheckCircle className="mr-2 h-4 w-4" /> Approve
            </Button>
          )}
          {sub.status === 'approved' && (
            <Button onClick={handlePublish} className="bg-primary hover:bg-primary/90" data-testid="button-publish">
              Publish Listing
            </Button>
          )}
          <Button asChild variant="outline" data-testid="button-downloadPdf">
            <a href={`/api/submissions/${sub.id}/pdf`} target="_blank" rel="noreferrer">
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </a>
          </Button>
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
                      const isSignatureImage = key === "signature" && typeof value === "string" && value.startsWith("data:image");
                      return (
                        <div key={key} className={`border-b pb-4 last:border-0 md:last:border-b-0 ${isSignatureImage ? "md:col-span-2" : ""}`}>
                          <div className="text-sm font-medium text-muted-foreground mb-2">{title}</div>
                          {isSignatureImage ? (
                            <div className="border rounded-lg bg-white p-3 inline-block">
                              <img
                                src={String(value)}
                                alt="Seller signature"
                                className="max-h-24 w-auto object-contain"
                              />
                            </div>
                          ) : (
                            <div className="text-base whitespace-pre-wrap">{String(value)}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="media" className="pt-6 space-y-6">
              {/* Upload Zone */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2"><UploadCloud className="h-5 w-5"/> Upload Photos & Videos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    data-testid="upload-dropzone"
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragging ? "border-[#24384e] bg-[#24384e]/5" : "border-muted-foreground/30 hover:border-[#24384e]/50 hover:bg-muted/30"}`}
                  >
                    <UploadCloud className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Drag & drop photos or videos here, or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP, MP4, MOV — up to 100 MB each</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        e.target.value = "";
                        handleUploadFiles(files);
                      }}
                    />
                  </div>

                  {uploadingFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadingFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 bg-muted rounded-lg px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-[#24384e]" />
                          <span className="text-sm truncate flex-1">{f.name}</span>
                          <span className="text-xs text-muted-foreground">{f.progress === 100 ? "Done" : "Uploading…"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Photos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5"/> Photos ({photos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMedia ? <Skeleton className="h-32 w-full" /> : photos.length === 0 ? (
                    <div className="text-muted-foreground text-sm italic">No photos yet — upload above.</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {photos.map(p => (
                        <div key={p.id} className="relative group rounded-md overflow-hidden border">
                          <img src={p.url} alt={p.originalName} className="object-cover w-full h-40" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="icon" variant="secondary" onClick={() => window.open(p.url, "_blank")}><Eye className="h-4 w-4" /></Button>
                            <Button size="icon" variant="destructive" onClick={() => handleDeleteMedia(p.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-xs truncate">{p.originalName}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Uploaded Videos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Video className="h-5 w-5"/> Videos ({uploadedVideos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMedia ? <Skeleton className="h-32 w-full" /> : uploadedVideos.length === 0 ? (
                    <div className="text-muted-foreground text-sm italic">No videos uploaded yet — upload above.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {uploadedVideos.map(v => (
                        <div key={v.id} className="border rounded-xl overflow-hidden bg-black">
                          <video src={v.url} controls className="w-full max-h-56 object-contain" />
                          <div className="flex items-center justify-between px-3 py-2 bg-muted">
                            <span className="text-sm truncate flex-1 mr-2">{v.originalName}</span>
                            <div className="flex gap-1 shrink-0">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(v.url, "_blank")}><Download className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteMedia(v.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Video Links from seller */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><LinkIcon className="h-5 w-5"/> Seller Video Links</CardTitle>
                </CardHeader>
                <CardContent>
                  {videoLinks.length === 0 ? (
                    <div className="text-muted-foreground text-sm italic">No video links provided by seller.</div>
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

              {/* Documents */}
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
                <Film className="h-4 w-4 text-rose-500" /> Generate Reel
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Automatically produce a branded video reel using the uploaded horse photos and AI-generated overlay text via Creatomate.
              </p>

              {reelStatus === "idle" || reelStatus === "failed" ? (
                <>
                  {reelTemplates.length === 0 ? (
                    <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                      No reel templates configured.{" "}
                      <a href="/admin/settings/reel-templates" className="underline font-medium">
                        Add one in Reel Templates settings.
                      </a>
                    </div>
                  ) : (
                    <>
                      {reelTemplates.length > 1 && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Template</label>
                          <select
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="w-full text-sm rounded-md border border-input bg-background px-3 py-1.5 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {reelTemplates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}{t.description ? ` — ${t.description}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <Button
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={handleGenerateReel}
                        data-testid="button-generateReel"
                      >
                        <Film className="h-4 w-4 mr-2" />
                        {reelStatus === "failed" ? "Retry Reel" : "Generate Reel"}
                      </Button>
                      {reelError && (
                        <p className="text-xs text-red-500 text-center">{reelError}</p>
                      )}
                    </>
                  )}
                </>
              ) : reelStatus === "pending" || reelStatus === "polling" ? (
                <div className="flex flex-col items-center gap-2 py-3">
                  <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
                  <p className="text-xs text-muted-foreground text-center">
                    {reelStatus === "pending" ? "Submitting to Creatomate…" : "Rendering video… This takes ~30–60 seconds."}
                  </p>
                </div>
              ) : reelStatus === "succeeded" && reelUrl ? (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden border bg-black">
                    <video src={reelUrl} controls className="w-full max-h-40 object-contain" />
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <a href={reelUrl} target="_blank" rel="noreferrer">
                        <Download className="h-3 w-3 mr-1" /> Download
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setReelStatus("idle"); setReelUrl(null); setReelRenderId(null); }}
                    >
                      Regenerate
                    </Button>
                  </div>
                </div>
              ) : null}
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
