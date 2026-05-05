import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
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
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, CheckCircle, Sparkles, MessageSquare, 
  Trash2, FileText, Image as ImageIcon, Send, Link as LinkIcon, Download, Copy,
  UploadCloud, Video, Loader2, Eye, Film, Lock, ClipboardEdit, Save, PhoneCall, FileDown,
  MailOpen, PackageCheck, AlertCircle, FileSignature, HardDrive, FolderOpen, ExternalLink
} from "lucide-react";
import { openOrcPrintWindow, generateOrcHtml } from "@/lib/orc-pdf";
import { openApprovalPackWindow, generateApprovalPackHtml, generateSellerEmailDraft } from "@/lib/approval-pack";
import { openListingAgreementWindow, generateListingAgreementHtml } from "@/lib/listing-agreement";
import { StatusBadge } from "@/components/status-badge";

// ── Google Drive Card ──────────────────────────────────────────────────────
function DriveCard({ submissionId, sub }: { submissionId: number; sub: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const driveSetupStatus: string = sub?.driveSetupStatus ?? "not_started";
  const driveFolderLink: string | null = sub?.driveFolderLink ?? null;
  const driveSetupError: string | null = sub?.driveSetupError ?? null;
  const driveOrcDocLink: string | null = sub?.driveOrcDocLink ?? null;
  const driveApprovalPackDocLink: string | null = sub?.driveApprovalPackDocLink ?? null;
  const driveListingAgreementDocLink: string | null = sub?.driveListingAgreementDocLink ?? null;

  const createFolderMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/drive/submissions/${submissionId}/create-folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error ?? res.statusText); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetSubmissionQueryKey(submissionId) });
      toast({ title: "Drive folder created", description: "Horse folder structure created in Google Drive." });
    },
    onError: (err: Error) => toast({ title: "Drive error", description: err.message, variant: "destructive" }),
  });

  const statusColors: Record<string, string> = {
    not_started: "text-muted-foreground",
    creating: "text-blue-600",
    done: "text-green-700",
    failed: "text-red-600",
  };
  const statusLabels: Record<string, string> = {
    not_started: "Not set up",
    creating: "Creating…",
    done: "Folder ready",
    failed: "Setup failed",
  };

  return (
    <Card>
      <CardHeader className="pb-3 border-b bg-muted/30">
        <CardTitle className="text-base flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-[#24384e]" /> Google Drive
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">Folder status</span>
          <span className={`text-xs font-semibold ${statusColors[driveSetupStatus] ?? ""}`}>
            {driveSetupStatus === "creating" && <Loader2 className="inline h-3 w-3 mr-1 animate-spin" />}
            {statusLabels[driveSetupStatus] ?? driveSetupStatus}
          </span>
        </div>

        {driveSetupError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">{driveSetupError}</p>
        )}

        {driveFolderLink ? (
          <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
            <a href={driveFolderLink} target="_blank" rel="noreferrer">
              <FolderOpen className="h-4 w-4" /> Open Horse Folder <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
            </a>
          </Button>
        ) : (
          <Button
            size="sm"
            className="w-full bg-[#24384e] hover:bg-[#1a2d3f]"
            onClick={() => createFolderMutation.mutate()}
            disabled={createFolderMutation.isPending || driveSetupStatus === "creating"}
          >
            {createFolderMutation.isPending ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <HardDrive className="h-3 w-3 mr-2" />}
            Create Drive Folder
          </Button>
        )}

        {driveSetupStatus === "done" && (
          <div className="space-y-1.5 pt-1 border-t">
            <p className="text-xs text-muted-foreground font-medium">Saved documents</p>
            {driveOrcDocLink ? (
              <a href={driveOrcDocLink} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                <ExternalLink className="h-3 w-3 flex-shrink-0" /> ORC
              </a>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">ORC — not yet saved</p>
            )}
            {driveApprovalPackDocLink ? (
              <a href={driveApprovalPackDocLink} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                <ExternalLink className="h-3 w-3 flex-shrink-0" /> Approval Pack
              </a>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">Approval Pack — not yet saved</p>
            )}
            {driveListingAgreementDocLink ? (
              <a href={driveListingAgreementDocLink} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                <ExternalLink className="h-3 w-3 flex-shrink-0" /> Listing Agreement
              </a>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">Listing Agreement — not yet saved</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const ALL_STATUSES = [
  { value: "new", label: "New" },
  { value: "awaiting_review", label: "Awaiting Review" },
  { value: "awaiting_seller_response", label: "Awaiting Seller Response" },
  { value: "needs_more_information", label: "Needs More Information" },
  { value: "ready_to_list", label: "Ready to List" },
  { value: "seller_review_sent", label: "Seller Review Sent" },
  { value: "approved_to_market", label: "Approved to Market" },
  { value: "live", label: "Live" },
  { value: "viewing_pending", label: "Viewing Pending" },
  { value: "sold_pending", label: "Sold Pending" },
  { value: "in_vetting", label: "In Vetting" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
] as const;

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const submissionId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [, navigate] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/submissions/${submissionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Submission deleted" });
      navigate("/admin/submissions");
    },
    onError: () => toast({ title: "Error", description: "Could not delete submission.", variant: "destructive" }),
  });

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

  const { data: sub, isLoading, refetch: refetchSubmission } = useGetSubmission(submissionId, {
    query: { enabled: !!submissionId, queryKey: getGetSubmissionQueryKey(submissionId) }
  });

  const { data: notes, isLoading: isLoadingNotes } = useListSubmissionNotes(submissionId, {
    query: { enabled: !!submissionId, queryKey: getListSubmissionNotesQueryKey(submissionId) }
  });

  const { data: media, isLoading: isLoadingMedia } = useListSubmissionMedia(submissionId, {
    query: { enabled: !!submissionId, queryKey: getListSubmissionMediaQueryKey(submissionId) }
  });

  const { data: aiOutput, refetch: refetchAiOutput } = useGetAiOutput(submissionId, {
    // Always enabled so ORC can be fetched even before full AI generation
    query: { enabled: !!submissionId, queryKey: getGetAiOutputQueryKey(submissionId) }
  });

  const updateStatus = useUpdateSubmission();
  const approve = useApproveSubmission();
  const publish = usePublishSubmission();
  const generateAi = useGenerateAiContent();
  const addNote = useAddSubmissionNote();
  const deleteMedia = useDeleteMedia();

  // ── Save document to Drive (silent background save) ──────────────────────
  const saveDocToDrive = async (
    docType: "orc" | "approval_pack" | "listing_agreement",
    title: string,
    html: string
  ) => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/drive/submissions/${submissionId}/save-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ docType, title, html }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: getGetSubmissionQueryKey(submissionId) });
        toast({ title: "Saved to Drive", description: `${title} saved to the Documents folder.` });
      }
      // silently skip if Drive not configured (400) — don't block the popup
    } catch {
      // network error — ignore silently
    }
  };

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

  // ── Active tab ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("working-record");

  // ── Working Record ──────────────────────────────────────────────────────────
  const [wrDraft, setWrDraft] = useState<{
    horseName: string; breed: string; age: string; colour: string;
    height: string; sex: string; askingPrice: string; location: string;
    discipline: string; adminNotes: string;
    sellerName: string; sellerEmail: string; sellerPhone: string;
  } | null>(null);

  const [wrSaving, setWrSaving] = useState(false);

  // Initialise the draft from the sub when it loads (once only)
  useEffect(() => {
    if (sub && wrDraft === null) {
      const wr = sub.workingRecord as Record<string, any> ?? {};
      setWrDraft({
        horseName: String(sub.horseName ?? wr.horseName ?? ""),
        breed: String(sub.breed ?? wr.breed ?? ""),
        age: String(sub.age ?? wr.age ?? ""),
        colour: String(sub.colour ?? wr.colour ?? ""),
        height: String(sub.height ?? wr.height ?? ""),
        sex: String(sub.sex ?? wr.sex ?? ""),
        askingPrice: String(sub.askingPrice ?? wr.askingPrice ?? ""),
        location: String(sub.location ?? wr.location ?? ""),
        discipline: String(sub.discipline ?? wr.discipline ?? ""),
        adminNotes: String(wr.adminNotes ?? ""),
        sellerName: String(sub.sellerName ?? wr.sellerName ?? ""),
        sellerEmail: String(sub.sellerEmail ?? wr.sellerEmail ?? ""),
        sellerPhone: String(sub.sellerPhone ?? wr.sellerPhone ?? ""),
      });
    }
  }, [sub]);

  const handleSaveWorkingRecord = async () => {
    if (!wrDraft) return;
    setWrSaving(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/working-record`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...wrDraft,
          workingRecord: { ...((sub?.workingRecord as Record<string, any>) ?? {}), ...wrDraft },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      queryClient.invalidateQueries({ queryKey: getGetSubmissionQueryKey(submissionId) });
      queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
      toast({ title: "Working record saved" });
    } catch {
      toast({ title: "Failed to save working record", variant: "destructive" });
    } finally {
      setWrSaving(false);
    }
  };

  const wrField = (field: keyof NonNullable<typeof wrDraft>) => ({
    value: wrDraft?.[field] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setWrDraft((prev) => prev ? { ...prev, [field]: e.target.value } : prev),
  });

  // ── Owner Response Certificate ────────────────────────────────────────────
  const [orcDraft, setOrcDraft] = useState<string>("");
  const [orcGenerating, setOrcGenerating] = useState(false);
  const [orcSaving, setOrcSaving] = useState(false);

  // Sync ORC draft from aiOutput when it loads
  useEffect(() => {
    const orc = (aiOutput as any)?.ownerResponseCert;
    if (orc && !orcDraft) {
      setOrcDraft(String(orc));
    }
  }, [aiOutput]);

  const handleGenerateOrc = async () => {
    setOrcGenerating(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/generate-orc`, { method: "POST" });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setOrcDraft(data.ownerResponseCert ?? "");
      refetchAiOutput();
      queryClient.invalidateQueries({ queryKey: getGetAiOutputQueryKey(submissionId) });
      toast({ title: "Owner Response Certificate generated" });
    } catch {
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setOrcGenerating(false);
    }
  };

  const handleSaveOrc = async (newStatus?: string) => {
    setOrcSaving(true);
    try {
      const currentOrcStatus = (aiOutput as any)?.orcStatus ?? "not_generated";
      const status = newStatus ?? (currentOrcStatus === "generated" ? "edited" : currentOrcStatus);
      const res = await fetch(`/api/submissions/${submissionId}/orc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerResponseCert: orcDraft, orcStatus: newStatus ?? "edited" }),
      });
      if (!res.ok) throw new Error("Save failed");
      refetchAiOutput();
      queryClient.invalidateQueries({ queryKey: getGetAiOutputQueryKey(submissionId) });
      toast({ title: newStatus === "ready_to_send" ? "Marked as ready to send" : "ORC saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setOrcSaving(false);
    }
  };

  const orcStatus = (aiOutput as any)?.orcStatus ?? "not_generated";
  const orcStatusLabel: Record<string, { label: string; className: string }> = {
    not_generated: { label: "Not Generated", className: "bg-stone-100 text-stone-600 border-stone-300" },
    generated:     { label: "Generated",     className: "bg-sky-50 text-sky-700 border-sky-400" },
    edited:        { label: "Edited",         className: "bg-amber-50 text-amber-700 border-amber-400" },
    ready_to_send: { label: "Ready to Send",  className: "bg-emerald-50 text-emerald-700 border-emerald-500" },
  };

  // ── Horse Description ────────────────────────────────────────────────────
  const [hdDraft, setHdDraft] = useState<string>("");
  const [hdGenerating, setHdGenerating] = useState(false);
  const [hdSaving, setHdSaving] = useState(false);

  useEffect(() => {
    const hd = (aiOutput as any)?.horseDescription;
    if (hd && !hdDraft) setHdDraft(String(hd));
  }, [aiOutput]);

  const handleGenerateHd = async () => {
    setHdGenerating(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/generate-horse-description`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setHdDraft(data.horseDescription ?? "");
      refetchAiOutput();
      queryClient.invalidateQueries({ queryKey: getGetAiOutputQueryKey(submissionId) });
      toast({ title: "Horse description generated" });
    } catch (err: any) {
      toast({ title: err.message ?? "Generation failed", variant: "destructive" });
    } finally {
      setHdGenerating(false);
    }
  };

  const handleSaveHd = async (newStatus?: string) => {
    setHdSaving(true);
    try {
      const currentHdStatus = (aiOutput as any)?.horseDescriptionStatus ?? "not_generated";
      const status = newStatus ?? (currentHdStatus === "generated" ? "edited" : currentHdStatus);
      const res = await fetch(`/api/submissions/${submissionId}/horse-description`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horseDescription: hdDraft, horseDescriptionStatus: status }),
      });
      if (!res.ok) throw new Error("Save failed");
      refetchAiOutput();
      queryClient.invalidateQueries({ queryKey: getGetAiOutputQueryKey(submissionId) });
      toast({ title: newStatus === "ready_to_use" ? "Marked as ready to use" : "Horse description saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setHdSaving(false);
    }
  };

  const hdStatus = (aiOutput as any)?.horseDescriptionStatus ?? "not_generated";
  const hdStatusLabel: Record<string, { label: string; className: string }> = {
    not_generated: { label: "Not Generated", className: "bg-stone-100 text-stone-600 border-stone-300" },
    generated:     { label: "Generated",     className: "bg-sky-50 text-sky-700 border-sky-400" },
    edited:        { label: "Edited",         className: "bg-amber-50 text-amber-700 border-amber-400" },
    ready_to_use:  { label: "Ready to Use",   className: "bg-emerald-50 text-emerald-700 border-emerald-500" },
  };

  // ── Listing Agreement ────────────────────────────────────────────────────
  const [laCommissionRate, setLaCommissionRate] = useState(sub?.commissionRate ?? "10%");
  const [laListingPeriod, setLaListingPeriod] = useState<number>(sub?.listingPeriodDays ?? 90);
  const [laTermsNotes, setLaTermsNotes] = useState(sub?.listingTermsNotes ?? "");
  const [laSaving, setLaSaving] = useState(false);

  const laStatus = sub?.listingAgreementStatus ?? "not_started";
  const laStatusLabel: Record<string, { label: string; className: string }> = {
    not_started:         { label: "Not Started",       className: "bg-stone-100 text-stone-600 border-stone-300" },
    agreement_generated: { label: "Agreement Ready",   className: "bg-sky-50 text-sky-700 border-sky-400" },
    sent_to_seller:      { label: "Sent to Seller",    className: "bg-violet-50 text-violet-700 border-violet-400" },
    signed:              { label: "Signed",            className: "bg-emerald-50 text-emerald-700 border-emerald-500" },
  };

  const handleSaveLaTerms = async (extraUpdates?: Record<string, unknown>) => {
    setLaSaving(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/listing-agreement`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commissionRate: laCommissionRate,
          listingPeriodDays: laListingPeriod,
          listingTermsNotes: laTermsNotes,
          listingAgreementStatus: laStatus === "not_started" ? "agreement_generated" : laStatus,
          ...extraUpdates,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      queryClient.invalidateQueries({ queryKey: getGetSubmissionQueryKey(submissionId) });
      refetchSubmission();
      toast({ title: "Listing agreement saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setLaSaving(false);
    }
  };

  const handleLaStatusUpdate = async (newStatus: string) => {
    setLaSaving(true);
    try {
      const extra: Record<string, unknown> = { listingAgreementStatus: newStatus };
      if (newStatus === "sent_to_seller") extra.listingAgreementSentAt = new Date().toISOString();
      if (newStatus === "signed") extra.listingAgreementSignedAt = new Date().toISOString();
      const res = await fetch(`/api/submissions/${submissionId}/listing-agreement`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extra),
      });
      if (!res.ok) throw new Error("Update failed");
      queryClient.invalidateQueries({ queryKey: getGetSubmissionQueryKey(submissionId) });
      refetchSubmission();
      toast({ title: newStatus === "sent_to_seller" ? "Marked as sent to seller" : newStatus === "signed" ? "Marked as signed" : "Status updated" });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setLaSaving(false);
    }
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
        const { uploadUrl, mediaId } = await urlRes.json();

        // PUT file bytes directly to GCS presigned URL
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!uploadRes.ok) throw new Error("Upload failed");

        // Confirm upload — update size in DB
        await fetch(`/api/media/upload/${mediaId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ size: file.size }),
        });

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

  const TAB_OPTIONS = [
    { value: "working-record",    label: "Working Record" },
    { value: "orc",               label: orcStatus !== "not_generated" ? `ORC — ${orcStatusLabel[orcStatus]?.label ?? orcStatus}` : "ORC" },
    { value: "horse-description", label: hdStatus !== "not_generated" ? `Horse Description — ${hdStatusLabel[hdStatus]?.label ?? hdStatus}` : "Horse Description" },
    { value: "approval-pack",     label: "Approval Pack" },
    { value: "listing-agreement", label: "Listing Agreement" },
    { value: "form",              label: "Original Submission" },
    { value: "media",             label: "Media & Docs" },
    { value: "history",           label: "Status History" },
  ];

  return (
    <AdminLayout>
      <div className="flex items-start gap-4 mb-4">
        <Button variant="outline" size="icon" asChild className="mt-1 shrink-0">
          <Link href="/admin/submissions"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-horseName">{sub.horseName || "Unnamed Horse"}</h1>
            <StatusBadge status={sub.status} />
            {sub.sellerIntent && (
              <Badge variant="outline" className={sub.sellerIntent === "happy_to_proceed" ? "text-emerald-700 border-emerald-400 bg-emerald-50" : "text-amber-700 border-amber-400 bg-amber-50"}>
                {sub.sellerIntent === "happy_to_proceed"
                  ? <><CheckCircle className="h-3 w-3 mr-1 inline" /> Ready to list</>
                  : <><PhoneCall className="h-3 w-3 mr-1 inline" /> Wants to speak first</>
                }
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">{sub.breed} • {sub.age} yrs • Submitted by {sub.sellerName}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button asChild variant="outline" data-testid="button-downloadPdf">
            <a href={`/api/submissions/${sub.id}/pdf`} target="_blank" rel="noreferrer">
              <Download className="mr-2 h-4 w-4" /> PDF
            </a>
          </Button>
          {sub.aiGenerated ? (
            <Button asChild variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-aiContent">
              <Link href={`/admin/submissions/${sub.id}/ai`}>
                <Sparkles className="mr-2 h-4 w-4" /> View AI Content
              </Link>
            </Button>
          ) : (
            <Button
              variant="default"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleGenerateAi}
              disabled={generateAi.isPending}
              data-testid="button-aiContent"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {generateAi.isPending ? "Generating…" : "Generate AI Content"}
            </Button>
          )}
          <Button
            variant="outline"
            className="text-destructive border-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteDialog(true)}
            data-testid="button-deleteSubmission"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Section navigation dropdown */}
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-[280px]" data-testid="select-tab-nav">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAB_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={activeTab} onValueChange={setActiveTab}>

            {/* ── Working Record ── */}
            <TabsContent value="working-record" className="">
              <Card>
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ClipboardEdit className="h-5 w-5 text-[#24384e]" /> Working Record
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Sally's editable internal copy. Changes here are used for AI generation and do not alter the original submission.
                        {sub.workingRecordUpdatedAt && (
                          <span className="block mt-1 text-xs">Last saved: {format(new Date(sub.workingRecordUpdatedAt as string), 'MMM d, yyyy h:mm a')}</span>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleSaveWorkingRecord}
                      disabled={wrSaving || !wrDraft}
                      className="bg-[#24384e] hover:bg-[#1a2d3f] shrink-0"
                      data-testid="button-saveWorkingRecord"
                    >
                      {wrSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      {wrSaving ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Horse Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {([
                        { field: "horseName", label: "Horse Name" },
                        { field: "breed", label: "Breed" },
                        { field: "age", label: "Age" },
                        { field: "colour", label: "Colour / Markings" },
                        { field: "height", label: "Height" },
                        { field: "sex", label: "Sex" },
                        { field: "askingPrice", label: "Asking Price" },
                        { field: "location", label: "Location" },
                      ] as const).map(({ field, label }) => (
                        <div key={field} className="space-y-1.5">
                          <Label htmlFor={`wr-${field}`} className="text-sm font-medium">{label}</Label>
                          <Input
                            id={`wr-${field}`}
                            {...wrField(field)}
                            className="bg-white"
                          />
                        </div>
                      ))}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="wr-discipline" className="text-sm font-medium">Discipline(s)</Label>
                        <Input id="wr-discipline" {...wrField("discipline")} className="bg-white" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Seller Contact Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="wr-sellerName" className="text-sm font-medium">Seller Name</Label>
                        <Input id="wr-sellerName" {...wrField("sellerName")} className="bg-white" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="wr-sellerPhone" className="text-sm font-medium">Phone</Label>
                        <Input id="wr-sellerPhone" {...wrField("sellerPhone")} className="bg-white" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="wr-sellerEmail" className="text-sm font-medium">Email</Label>
                        <Input id="wr-sellerEmail" type="email" {...wrField("sellerEmail")} className="bg-white" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-1.5">
                    <Label htmlFor="wr-adminNotes" className="text-sm font-medium">Internal Notes / Corrections</Label>
                    <p className="text-xs text-muted-foreground">Add any corrections, context, or notes about this horse that Sally wants to capture internally.</p>
                    <Textarea
                      id="wr-adminNotes"
                      {...wrField("adminNotes")}
                      rows={5}
                      placeholder="E.g. seller confirmed price is negotiable, horse has been competing at national level..."
                      className="bg-white"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Owner Response Certificate ── */}
            <TabsContent value="orc" className="">
              <Card>
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#24384e]" /> Owner Response Certificate
                      </CardTitle>
                      <CardDescription className="mt-1">
                        A factual, structured summary generated from the working record. Not a sales document — used to verify details and produce marketing copy.
                        {(aiOutput as any)?.orcUpdatedAt && (
                          <span className="block mt-1 text-xs">
                            Last updated: {format(new Date((aiOutput as any).orcUpdatedAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {orcStatus === "not_generated" ? (
                        <Button
                          onClick={handleGenerateOrc}
                          disabled={orcGenerating}
                          className="bg-[#24384e] hover:bg-[#1a2d3f]"
                          data-testid="button-generateOrc"
                        >
                          {orcGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                          {orcGenerating ? "Generating…" : "Generate ORC"}
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            onClick={handleGenerateOrc}
                            disabled={orcGenerating}
                            data-testid="button-regenerateOrc"
                          >
                            {orcGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            Regenerate
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleSaveOrc("edited")}
                            disabled={orcSaving}
                            data-testid="button-saveOrc"
                          >
                            {orcSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save
                          </Button>
                          {orcStatus !== "ready_to_send" && (
                            <Button
                              onClick={() => handleSaveOrc("ready_to_send")}
                              disabled={orcSaving}
                              className="bg-emerald-700 hover:bg-emerald-800"
                              data-testid="button-orcReadyToSend"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" /> Mark Ready to Send
                            </Button>
                          )}
                          {orcStatus === "ready_to_send" && (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => handleSaveOrc("edited")}
                                disabled={orcSaving}
                              >
                                Reopen for Editing
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* ORC status indicator + secondary actions */}
                  {orcStatus !== "not_generated" && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${orcStatusLabel[orcStatus]?.className ?? ""}`}>
                        {orcStatusLabel[orcStatus]?.label}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => { navigator.clipboard.writeText(orcDraft); toast({ title: "ORC copied to clipboard" }); }}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copy text
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs font-medium border-[#24384e] text-[#24384e] hover:bg-[#24384e] hover:text-white"
                          onClick={() => {
                            const data = {
                              horseName: sub.horseName ?? "Horse",
                              breed: sub.breed,
                              sellerName: sub.sellerName,
                              askingPrice: sub.askingPrice,
                              submissionId: sub.id,
                              generatedAt: (aiOutput as any)?.orcUpdatedAt ?? null,
                              orcText: orcDraft,
                            };
                            openOrcPrintWindow(data);
                            saveDocToDrive("orc", `ORC — ${sub.horseName ?? "Horse"}`, generateOrcHtml(data));
                          }}
                          data-testid="button-orcPdf"
                        >
                          <FileDown className="h-3 w-3 mr-1" /> Download PDF
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-6">
                  {orcStatus === "not_generated" ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-stone-400" />
                      </div>
                      <div>
                        <p className="font-medium text-stone-700">No ORC generated yet</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                          Generate the Owner Response Certificate from the working record. It will be structured and factual — ready for Sally to review and tidy before sending to the seller.
                        </p>
                      </div>
                      <Button
                        onClick={handleGenerateOrc}
                        disabled={orcGenerating}
                        className="bg-[#24384e] hover:bg-[#1a2d3f] mt-2"
                      >
                        {orcGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        {orcGenerating ? "Generating Owner Response Certificate…" : "Generate Owner Response Certificate"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Edit the certificate below. Changes are not saved automatically — use the Save button above.
                        {orcStatus === "ready_to_send" && (
                          <span className="ml-2 font-semibold text-emerald-700">This ORC is marked as ready to send to the seller.</span>
                        )}
                      </p>
                      <Textarea
                        value={orcDraft}
                        onChange={(e) => setOrcDraft(e.target.value)}
                        rows={30}
                        className="font-mono text-sm leading-relaxed bg-white resize-y"
                        placeholder="Owner Response Certificate will appear here after generation…"
                        data-testid="textarea-orc"
                        readOnly={orcStatus === "ready_to_send"}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Horse Description ── */}
            <TabsContent value="horse-description" className="">
              <Card>
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" /> Horse Description
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Polished marketing copy written from the Owner Response Certificate. Flows as prose — no bullet points. Ready for listing pages and approval packs.
                        {(aiOutput as any)?.horseDescriptionUpdatedAt && (
                          <span className="block mt-1 text-xs">
                            Last updated: {format(new Date((aiOutput as any).horseDescriptionUpdatedAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {hdStatus === "not_generated" ? (
                        <Button
                          onClick={handleGenerateHd}
                          disabled={hdGenerating || orcStatus === "not_generated"}
                          className="bg-[#24384e] hover:bg-[#1a2d3f]"
                          title={orcStatus === "not_generated" ? "Generate the ORC first" : undefined}
                          data-testid="button-generateHd"
                        >
                          {hdGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                          {hdGenerating ? "Generating…" : "Generate Horse Description"}
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" onClick={handleGenerateHd} disabled={hdGenerating} data-testid="button-regenerateHd">
                            {hdGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            Regenerate
                          </Button>
                          <Button variant="outline" onClick={() => handleSaveHd()} disabled={hdSaving} data-testid="button-saveHd">
                            {hdSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save
                          </Button>
                          {hdStatus !== "ready_to_use" && (
                            <Button onClick={() => handleSaveHd("ready_to_use")} disabled={hdSaving} className="bg-emerald-700 hover:bg-emerald-800" data-testid="button-hdReadyToUse">
                              <CheckCircle className="h-4 w-4 mr-2" /> Mark Ready to Use
                            </Button>
                          )}
                          {hdStatus === "ready_to_use" && (
                            <Button variant="outline" onClick={() => handleSaveHd("edited")} disabled={hdSaving}>
                              Reopen for Editing
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {hdStatus !== "not_generated" && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${hdStatusLabel[hdStatus]?.className ?? ""}`}>
                        {hdStatusLabel[hdStatus]?.label}
                      </span>
                      <div className="ml-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => { navigator.clipboard.writeText(hdDraft); toast({ title: "Horse description copied to clipboard" }); }}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copy text
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-6">
                  {hdStatus === "not_generated" ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-medium text-stone-700">No horse description yet</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                          {orcStatus === "not_generated"
                            ? "Generate the Owner Response Certificate first — the horse description is written from it."
                            : "Generate flowing marketing prose from the ORC. Ready for listings and the seller approval pack."}
                        </p>
                      </div>
                      <Button
                        onClick={handleGenerateHd}
                        disabled={hdGenerating || orcStatus === "not_generated"}
                        className="bg-[#24384e] hover:bg-[#1a2d3f] mt-2"
                        title={orcStatus === "not_generated" ? "Generate the ORC first" : undefined}
                      >
                        {hdGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        {hdGenerating ? "Generating…" : orcStatus === "not_generated" ? "Generate ORC First" : "Generate Horse Description"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Edit the description below. Changes are not saved automatically — use the Save button above.
                        {hdStatus === "ready_to_use" && (
                          <span className="ml-2 font-semibold text-emerald-700">This description is marked as ready to use.</span>
                        )}
                      </p>
                      <Textarea
                        value={hdDraft}
                        onChange={(e) => setHdDraft(e.target.value)}
                        rows={18}
                        className="text-sm leading-relaxed bg-white resize-y font-sans"
                        placeholder="Horse description will appear here after generation…"
                        data-testid="textarea-horseDescription"
                        readOnly={hdStatus === "ready_to_use"}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Seller Approval Pack ── */}
            <TabsContent value="approval-pack" className="space-y-4">

              {/* Readiness checklist */}
              <Card>
                <CardHeader className="pb-3 border-b bg-muted/30">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-violet-600" /> Seller Approval Pack
                  </CardTitle>
                  <CardDescription className="mt-1">
                    A compiled document sent to the seller for review before listing. Includes the listing description and factual certificate for their approval.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {/* Readiness indicators */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pack Contents</p>
                    <div className="flex items-center gap-2 text-sm">
                      {orcStatus === "ready_to_send" ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : orcStatus === "not_generated" ? (
                        <AlertCircle className="h-4 w-4 text-stone-400 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <span className={orcStatus === "ready_to_send" ? "text-emerald-800 font-medium" : orcStatus === "not_generated" ? "text-stone-400" : "text-amber-700"}>
                        Owner Response Certificate
                        {orcStatus === "not_generated" && <span className="ml-1 text-xs font-normal text-muted-foreground">— not yet generated</span>}
                        {orcStatus !== "not_generated" && orcStatus !== "ready_to_send" && <span className="ml-1 text-xs font-normal text-amber-600">— not marked ready</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {hdStatus === "ready_to_use" ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : hdStatus === "not_generated" ? (
                        <AlertCircle className="h-4 w-4 text-stone-400 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <span className={hdStatus === "ready_to_use" ? "text-emerald-800 font-medium" : hdStatus === "not_generated" ? "text-stone-400" : "text-amber-700"}>
                        Horse Description
                        {hdStatus === "not_generated" && <span className="ml-1 text-xs font-normal text-muted-foreground">— not yet generated</span>}
                        {hdStatus !== "not_generated" && hdStatus !== "ready_to_use" && <span className="ml-1 text-xs font-normal text-amber-600">— not marked ready</span>}
                      </span>
                    </div>
                  </div>

                  {(orcStatus === "not_generated" || hdStatus === "not_generated") && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                      Generate and save both the ORC and Horse Description before sending the approval pack.
                    </p>
                  )}

                  <div className="flex flex-col gap-2 pt-1">
                    <Button
                      className="w-full bg-[#24384e] hover:bg-[#1a2d3f]"
                      disabled={!orcDraft || !hdDraft}
                      onClick={() => {
                        const data = {
                          horseName: sub.horseName ?? "Horse",
                          breed: sub.breed,
                          sellerName: sub.sellerName,
                          askingPrice: sub.askingPrice,
                          submissionId: sub.id,
                          orcText: orcDraft,
                          horseDescription: hdDraft,
                        };
                        openApprovalPackWindow(data);
                        saveDocToDrive("approval_pack", `Approval Pack — ${sub.horseName ?? "Horse"}`, generateApprovalPackHtml(data));
                      }}
                      data-testid="button-downloadApprovalPack"
                    >
                      <FileDown className="h-4 w-4 mr-2" /> Download Approval Pack PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!orcDraft || !hdDraft}
                      onClick={() => {
                        const email = generateSellerEmailDraft({
                          horseName: sub.horseName ?? "Horse",
                          breed: sub.breed,
                          sellerName: sub.sellerName,
                          askingPrice: sub.askingPrice,
                          submissionId: sub.id,
                          orcText: orcDraft,
                          horseDescription: hdDraft,
                        });
                        navigator.clipboard.writeText(email);
                        toast({ title: "Email draft copied to clipboard" });
                      }}
                      data-testid="button-copyEmailDraft"
                    >
                      <Copy className="h-4 w-4 mr-2" /> Copy Email Draft
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Email draft preview */}
              {orcDraft && hdDraft && (
                <Card>
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MailOpen className="h-4 w-4 text-violet-500" /> Email Draft Preview
                    </CardTitle>
                    <CardDescription>
                      Copy this email body and send to the seller. Edit as needed before sending.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Textarea
                      readOnly
                      rows={28}
                      className="font-mono text-xs leading-relaxed bg-stone-50 resize-y"
                      value={generateSellerEmailDraft({
                        horseName: sub.horseName ?? "Horse",
                        breed: sub.breed,
                        sellerName: sub.sellerName,
                        askingPrice: sub.askingPrice,
                        submissionId: sub.id,
                        orcText: orcDraft,
                        horseDescription: hdDraft,
                      })}
                      data-testid="textarea-emailDraft"
                    />
                  </CardContent>
                </Card>
              )}

            </TabsContent>

            {/* ── Listing Agreement ── */}
            <TabsContent value="listing-agreement" className="space-y-4">
              <Card>
                <CardHeader className="pb-3 border-b bg-muted/30">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSignature className="h-4 w-4 text-amber-600" /> Listing Agreement
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Define commission rate and listing period, then generate the formal listing agreement PDF for the seller to sign.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">

                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${laStatusLabel[laStatus]?.className ?? laStatusLabel.not_started.className}`}>
                      {laStatusLabel[laStatus]?.label ?? laStatus}
                    </span>
                  </div>

                  {/* Commission rate */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Commission Rate</Label>
                    <Input
                      value={laCommissionRate}
                      onChange={(e) => setLaCommissionRate(e.target.value)}
                      placeholder="e.g. 10%"
                      className="max-w-xs"
                      data-testid="input-commissionRate"
                    />
                    <p className="text-xs text-muted-foreground">Percentage or fixed fee — e.g. "10%" or "$5,000"</p>
                  </div>

                  {/* Listing period */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Listing Period (days)</Label>
                    <Input
                      type="number"
                      value={laListingPeriod}
                      onChange={(e) => setLaListingPeriod(Number(e.target.value))}
                      min={1}
                      max={730}
                      className="max-w-xs"
                      data-testid="input-listingPeriod"
                    />
                    <p className="text-xs text-muted-foreground">Standard is 90 days. Sets the agreement expiry date from today.</p>
                  </div>

                  {/* Special terms */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Special Terms / Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Textarea
                      value={laTermsNotes}
                      onChange={(e) => setLaTermsNotes(e.target.value)}
                      rows={3}
                      placeholder="Any additional terms or notes to include in the agreement..."
                      data-testid="textarea-listingTermsNotes"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 pt-1">
                    {/* Save + generate PDF */}
                    <Button
                      className="w-full bg-[#24384e] hover:bg-[#1a2d3f]"
                      disabled={laSaving}
                      onClick={async () => {
                        await handleSaveLaTerms();
                        const laData = {
                          horseName: sub.horseName ?? "Horse",
                          breed: sub.breed,
                          colour: sub.colour ?? sub.workingRecord?.colour,
                          age: sub.age ?? sub.workingRecord?.age,
                          sex: sub.sex ?? sub.workingRecord?.sex,
                          height: sub.workingRecord?.height ?? sub.height,
                          askingPrice: sub.askingPrice,
                          sellerName: sub.sellerName,
                          sellerEmail: sub.sellerEmail,
                          sellerPhone: sub.sellerPhone,
                          submissionId: sub.id,
                          commissionRate: laCommissionRate,
                          listingPeriodDays: laListingPeriod,
                          listingTermsNotes: laTermsNotes || undefined,
                        };
                        openListingAgreementWindow(laData);
                        saveDocToDrive("listing_agreement", `Listing Agreement — ${sub.horseName ?? "Horse"}`, generateListingAgreementHtml(laData));
                      }}
                      data-testid="button-generateListingAgreement"
                    >
                      {laSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                      Save & Generate Listing Agreement PDF
                    </Button>

                    {/* Mark as sent */}
                    {laStatus === "agreement_generated" && (
                      <Button
                        variant="outline"
                        className="w-full border-violet-400 text-violet-700 hover:bg-violet-50"
                        disabled={laSaving}
                        onClick={() => handleLaStatusUpdate("sent_to_seller")}
                        data-testid="button-laMarkSent"
                      >
                        <Send className="h-4 w-4 mr-2" /> Mark as Sent to Seller
                      </Button>
                    )}

                    {/* Mark as signed */}
                    {laStatus === "sent_to_seller" && (
                      <Button
                        variant="outline"
                        className="w-full border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                        disabled={laSaving}
                        onClick={() => handleLaStatusUpdate("signed")}
                        data-testid="button-laMarkSigned"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" /> Mark as Signed
                      </Button>
                    )}
                  </div>

                  {/* Timestamps */}
                  {(sub.listingAgreementSentAt || sub.listingAgreementSignedAt) && (
                    <div className="text-xs text-muted-foreground space-y-0.5 pt-1 border-t">
                      {sub.listingAgreementSentAt && (
                        <p>Sent to seller: {new Date(sub.listingAgreementSentAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</p>
                      )}
                      {sub.listingAgreementSignedAt && (
                        <p>Signed: {new Date(sub.listingAgreementSignedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</p>
                      )}
                    </div>
                  )}

                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="form" className="">
              <Card>
                <CardHeader className="bg-amber-50/60 pb-4 border-b border-amber-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lock className="h-4 w-4 text-amber-600" /> Original Seller Submission
                      </CardTitle>
                      <CardDescription className="text-amber-700">This is the locked original record. It cannot be edited. Use the Working Record tab to make corrections.</CardDescription>
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
            
            <TabsContent value="media" className="space-y-6">
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
                        <div key={p.id} className="rounded-md overflow-hidden border flex flex-col">
                          <img src={p.url} alt={p.originalName} className="object-cover w-full h-36" />
                          <div className="flex items-center justify-between px-2 py-1 bg-muted border-t">
                            <p className="text-xs truncate flex-1 mr-1 text-muted-foreground">{p.originalName}</p>
                            <div className="flex gap-0.5 shrink-0">
                              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => window.open(p.url, "_blank")}><Eye className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => handleDeleteMedia(p.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
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
                              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => window.open(v.url, "_blank")}><Download className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => handleDeleteMedia(v.id)}><Trash2 className="h-4 w-4" /></Button>
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

            <TabsContent value="history" className="">
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
          {/* Status Management Card */}
          <Card>
            <CardHeader className="py-2 px-4 border-b bg-muted/30">
              <CardTitle className="text-sm">Workflow Status</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground shrink-0">Current</span>
                <StatusBadge status={sub.status} />
              </div>
              <Select
                value={sub.status}
                onValueChange={handleStatusChange}
                disabled={updateStatus.isPending}
              >
                <SelectTrigger className="h-8 text-xs w-full" data-testid="select-status">
                  <SelectValue placeholder="Change status…" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {updateStatus.isPending && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                </p>
              )}
            </CardContent>
          </Card>

          {/* ORC Status Card */}
          <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#24384e]" /> Owner Response Certificate
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${orcStatusLabel[orcStatus]?.className ?? ""}`}>
                  {orcStatusLabel[orcStatus]?.label ?? orcStatus}
                </span>
              </div>
              {orcStatus === "not_generated" ? (
                <Button
                  className="w-full bg-[#24384e] hover:bg-[#1a2d3f]"
                  size="sm"
                  onClick={handleGenerateOrc}
                  disabled={orcGenerating}
                >
                  {orcGenerating ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
                  {orcGenerating ? "Generating…" : "Generate ORC"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => { navigator.clipboard.writeText(orcDraft); toast({ title: "ORC copied" }); }}
                  >
                    <Copy className="h-3 w-3 mr-2" /> Copy ORC
                  </Button>
                  {orcStatus === "ready_to_send" && (
                    <p className="text-xs text-emerald-700 font-medium text-center">Ready to include in seller approval pack</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Horse Description Status Card */}
          <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" /> Horse Description
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${hdStatusLabel[hdStatus]?.className ?? ""}`}>
                  {hdStatusLabel[hdStatus]?.label ?? hdStatus}
                </span>
              </div>
              {hdStatus === "not_generated" ? (
                <Button
                  className="w-full bg-[#24384e] hover:bg-[#1a2d3f]"
                  size="sm"
                  onClick={handleGenerateHd}
                  disabled={hdGenerating || orcStatus === "not_generated"}
                  title={orcStatus === "not_generated" ? "Generate the ORC first" : undefined}
                >
                  {hdGenerating ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
                  {hdGenerating ? "Generating…" : orcStatus === "not_generated" ? "ORC Required First" : "Generate Description"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => { navigator.clipboard.writeText(hdDraft); toast({ title: "Horse description copied" }); }}
                  >
                    <Copy className="h-3 w-3 mr-2" /> Copy Description
                  </Button>
                  {hdStatus === "ready_to_use" && (
                    <p className="text-xs text-emerald-700 font-medium text-center">Ready for listings and approval pack</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Pack Card */}
          <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-base flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-violet-600" /> Approval Pack
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">ORC</span>
                <span className={`font-semibold ${orcStatus === "ready_to_send" ? "text-emerald-700" : orcStatus === "not_generated" ? "text-stone-400" : "text-amber-600"}`}>
                  {orcStatus === "ready_to_send" ? "Ready" : orcStatus === "not_generated" ? "Not generated" : "Not finalised"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Horse Description</span>
                <span className={`font-semibold ${hdStatus === "ready_to_use" ? "text-emerald-700" : hdStatus === "not_generated" ? "text-stone-400" : "text-amber-600"}`}>
                  {hdStatus === "ready_to_use" ? "Ready" : hdStatus === "not_generated" ? "Not generated" : "Not finalised"}
                </span>
              </div>
              <div className="pt-1 flex flex-col gap-2">
                <Button
                  size="sm"
                  className="w-full bg-[#24384e] hover:bg-[#1a2d3f]"
                  disabled={!orcDraft || !hdDraft}
                  onClick={() => {
                    const data = {
                      horseName: sub.horseName ?? "Horse",
                      breed: sub.breed,
                      sellerName: sub.sellerName,
                      askingPrice: sub.askingPrice,
                      submissionId: sub.id,
                      orcText: orcDraft,
                      horseDescription: hdDraft,
                    };
                    openApprovalPackWindow(data);
                    saveDocToDrive("approval_pack", `Approval Pack — ${sub.horseName ?? "Horse"}`, generateApprovalPackHtml(data));
                  }}
                >
                  <FileDown className="h-3 w-3 mr-2" /> Download Pack PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={!orcDraft || !hdDraft}
                  onClick={() => {
                    const email = generateSellerEmailDraft({
                      horseName: sub.horseName ?? "Horse",
                      breed: sub.breed,
                      sellerName: sub.sellerName,
                      askingPrice: sub.askingPrice,
                      submissionId: sub.id,
                      orcText: orcDraft,
                      horseDescription: hdDraft,
                    });
                    navigator.clipboard.writeText(email);
                    toast({ title: "Email draft copied to clipboard" });
                  }}
                >
                  <Copy className="h-3 w-3 mr-2" /> Copy Email Draft
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Listing Agreement Card */}
          <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-amber-600" /> Listing Agreement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-semibold px-2 py-0.5 rounded border ${laStatusLabel[laStatus]?.className ?? laStatusLabel.not_started.className}`}>
                  {laStatusLabel[laStatus]?.label ?? laStatus}
                </span>
              </div>
              {sub.commissionRate && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Commission</span>
                  <span className="font-semibold">{sub.commissionRate}</span>
                </div>
              )}
              {sub.listingPeriodDays && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-semibold">{sub.listingPeriodDays} days</span>
                </div>
              )}
              <Button
                size="sm"
                className="w-full bg-[#24384e] hover:bg-[#1a2d3f] mt-1"
                onClick={() => {
                  const laData = {
                    horseName: sub.horseName ?? "Horse",
                    breed: sub.breed,
                    colour: sub.colour ?? sub.workingRecord?.colour,
                    age: sub.age ?? sub.workingRecord?.age,
                    sex: sub.sex ?? sub.workingRecord?.sex,
                    height: sub.workingRecord?.height ?? sub.height,
                    askingPrice: sub.askingPrice,
                    sellerName: sub.sellerName,
                    sellerEmail: sub.sellerEmail,
                    sellerPhone: sub.sellerPhone,
                    submissionId: sub.id,
                    commissionRate: laCommissionRate,
                    listingPeriodDays: laListingPeriod,
                    listingTermsNotes: laTermsNotes || undefined,
                  };
                  openListingAgreementWindow(laData);
                  saveDocToDrive("listing_agreement", `Listing Agreement — ${sub.horseName ?? "Horse"}`, generateListingAgreementHtml(laData));
                }}
              >
                <FileDown className="h-3 w-3 mr-2" /> View Agreement PDF
              </Button>
            </CardContent>
          </Card>

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
                <div className="space-y-2">
                  <Button onClick={handleGenerateAi} disabled={generateAi.isPending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-generateAi">
                    <Sparkles className="mr-2 h-4 w-4" />
                    {generateAi.isPending ? "Generating…" : "Generate AI Content"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">Content will appear in the editor once generated.</p>
                </div>
              )}
              {sub.aiGenerated && (
                <div className="space-y-2">
                  <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link href={`/admin/submissions/${sub.id}/ai`}>
                      <Sparkles className="mr-2 h-4 w-4" /> View & Edit AI Content
                    </Link>
                  </Button>
                  <Button onClick={handleGenerateAi} disabled={generateAi.isPending} variant="outline" className="w-full" size="sm">
                    {generateAi.isPending ? "Regenerating…" : "Regenerate"}
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
                      <a
                        href={`${import.meta.env.BASE_URL}api/submissions/${id}/reel/${reelRenderId}/download?templateId=${selectedTemplateId}`}
                        download={`reel-submission-${id}.mp4`}
                      >
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

          {/* Google Drive Card */}
          <DriveCard submissionId={submissionId} sub={sub as any} />

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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{sub.horseName || "Unnamed Horse"}</strong> and all associated
              media files, AI content, and notes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Submission"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
