import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import AdminLayout from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, MapPin, CheckCircle2, XCircle, Download, Copy, MessageSquare, ExternalLink } from "lucide-react";
import { EoiStatusBadge } from "./index";

interface Eoi {
  id: number;
  buyerEmail: string;
  buyerFirstName: string;
  buyerSurname: string;
  buyerLocation: string;
  buyerPhone: string;
  horseName: string;
  formData: Record<string, unknown>;
  signatureData: string | null;
  waiverAgreed: boolean;
  declarationAgreed: boolean;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

const EOI_STATUSES = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under Review" },
  { value: "suitable", label: "Suitable" },
  { value: "not_suitable", label: "Not Suitable" },
  { value: "viewing_booked", label: "Viewing Booked" },
  { value: "proceeding", label: "Proceeding" },
  { value: "declined", label: "Declined" },
];

const EMAIL_TEMPLATES = [
  { id: "eoi_received",       label: "EOI Received",              group: "To Buyer" },
  { id: "general_enquiry",    label: "General Enquiry",           group: "To Buyer" },
  { id: "suitable_phone",     label: "Suitable — Phone Call",     group: "To Buyer" },
  { id: "suitable_viewing",   label: "Suitable — Arrange Viewing", group: "To Buyer" },
  { id: "not_suitable",       label: "Not Suitable",              group: "To Buyer" },
  { id: "viewing_confirmed",  label: "Viewing Confirmed",         group: "To Buyer" },
  { id: "seller_folder",      label: "Seller Folder Link",        group: "To Seller" },
] as const;

function generateDraft(templateId: string, eoi: Eoi): { to: string; subject: string; body: string } {
  const name  = eoi.buyerFirstName;
  const horse = eoi.horseName;
  const sig   = "Best,\nSally Empringham\nPerformance Horse Sales";

  switch (templateId) {
    case "eoi_received":
      return {
        to: eoi.buyerEmail,
        subject: `PHS – EOI received for ${horse}`,
        body: `Hi ${name},\n\nThanks for submitting the EOI for ${horse}.\n\nI've sent it to the owner and will be in touch when I hear back.\n\nIf you haven't heard from me within 24 hours, please message me and I will follow up.\n\nPlease send rider video via WhatsApp to 0428 239 317 — it helps the seller assess suitability.\n\nListings (with owner portfolios): https://www.performancehorsesales.com.au/horses-for-sale\n\nViewing & purchasing T&Cs: https://www.performancehorsesales.com.au/phs-services/forms-terms-conditions\n\n${sig}`,
      };
    case "general_enquiry":
      return {
        to: eoi.buyerEmail,
        subject: `PHS – Re your enquiry about ${horse}`,
        body: `Hi ${name},\n\nThanks for your message.\n\nTo view the horse's portfolio (videos and info) and to book a call or viewing:\n- Visit our listings: http://www.performancehorsesales.com.au/horses-for-sale\n- Each horse ad links to a portfolio of video and information from the owner.\n\nYou can contact us, at any time, with questions by email or SMS.\n\nTo request extra photos/video or to book a phone call/viewing:\n- Complete the obligation-free EOI form on the listing page.\n\nBest wishes,\nSally Empringham\nPerformance Horse Sales`,
      };
    case "suitable_phone":
      return {
        to: eoi.buyerEmail,
        subject: `PHS – ${horse} — we'd like to arrange a call`,
        body: `Hi ${name},\n\nThanks for your interest in ${horse}.\n\nAfter reviewing your EOI, we'd like to arrange a brief phone call to discuss whether this horse could be the right match for you.\n\nPlease reply with some suitable times, or call us directly on 0428 239 317.\n\n${sig}`,
      };
    case "suitable_viewing":
      return {
        to: eoi.buyerEmail,
        subject: `PHS – ${horse} — we'd like to arrange a viewing`,
        body: `Hi ${name},\n\nGreat news! After reviewing your EOI, the seller believes ${horse} could be a suitable match for you.\n\nWe'd love to arrange a viewing. Please reply with some suitable dates and times, or call us on 0428 239 317.\n\nPlease ensure you have read our Viewing & Purchasing T&Cs before attending:\nhttps://www.performancehorsesales.com.au/phs-services/forms-terms-conditions\n\nWe look forward to hearing from you.\n\n${sig}`,
      };
    case "not_suitable":
      return {
        to: eoi.buyerEmail,
        subject: `PHS – Re your EOI for ${horse}`,
        body: `Hi ${name},\n\nThank you for your interest in ${horse} and for taking the time to complete your EOI.\n\nAfter careful consideration, we don't feel this particular horse is the right match for your current experience and goals. We make this assessment with your safety and the horse's welfare in mind.\n\nWe may be able to find you a more suitable horse from our other listings. If you'd like us to keep your profile on file and contact you when something more appropriate becomes available, please let us know.\n\nWe appreciate your understanding and hope to help you find the right horse.\n\n${sig}`,
      };
    case "viewing_confirmed":
      return {
        to: eoi.buyerEmail,
        subject: `PHS – Your viewing of ${horse} is confirmed`,
        body: `Hi ${name},\n\nYour viewing of ${horse} has been confirmed.\n\nAs a reminder:\n- Please wear appropriate riding gear and a safety-approved helmet\n- Do not consume alcohol before or during the viewing\n- Follow the directions of the horse's connections at all times\n\nPlease read and agree to our Viewing & Purchasing T&Cs before attending:\nhttps://www.performancehorsesales.com.au/phs-services/forms-terms-conditions\n\nIf you need to reschedule, please contact us on 0428 239 317 as soon as possible.\n\nWe look forward to seeing you!\n\n${sig}`,
      };
    case "seller_folder":
      return {
        to: "",
        subject: `PHS – ${horse}'s Seller Folder`,
        body: `Hi,\n\nHere is ${horse}'s Seller Folder.\n\nThis contains a database where I will add the EOI forms from potential viewers.\n\nIt also has a subfolder which is the horse's 'portfolio'.\n\nThe portfolio contains two documents — the ad/description — and a 'tidied up' version of the listing form.\n\nCould you please have a look at those documents and let me know if there are any changes to be made?\n\nOnce that is done, I will get the ads online and do the first social media post.\n\n${sig}`,
      };
    default:
      return { to: "", subject: "", body: "" };
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider border-b pb-1">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | string[] | boolean | null }) {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="grid grid-cols-[180px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground font-medium shrink-0">{label}</span>
      <span className="text-stone-800 leading-snug">
        {Array.isArray(value) ? (
          <ul className="list-disc pl-4 space-y-0.5">
            {value.map((v, i) => <li key={i}>{v}</li>)}
          </ul>
        ) : typeof value === "boolean" ? (
          value
            ? <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Yes</span>
            : <span className="flex items-center gap-1 text-red-600"><XCircle className="h-3.5 w-3.5" /> No</span>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

function str(v: unknown): string { return typeof v === "string" ? v : ""; }
function arr(v: unknown): string[] { return Array.isArray(v) ? (v as string[]) : []; }

export default function EoiDetail() {
  const [, params] = useRoute("/admin/eois/:id");
  const id = params?.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [notes, setNotes] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("eoi_received");

  const { data: eoi, isLoading } = useQuery<Eoi>({
    queryKey: ["eois", id],
    queryFn: async () => {
      const res = await fetch(`/api/eois/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
    onSuccess: (data) => {
      if (notes === null) setNotes(data.adminNotes ?? "");
      if (status === null) setStatus(data.status);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/eois/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status ?? eoi?.status, adminNotes: notes ?? eoi?.adminNotes }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eois"] });
      qc.invalidateQueries({ queryKey: ["eois", id] });
      toast({ title: "Saved", description: "EOI updated successfully." });
    },
    onError: () => toast({ title: "Error", description: "Could not save changes.", variant: "destructive" }),
  });

  const draft = useMemo(
    () => (eoi ? generateDraft(selectedTemplate, eoi) : { to: "", subject: "", body: "" }),
    [selectedTemplate, eoi],
  );

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() =>
      toast({ title: `${label} copied`, description: "Paste it into your email client." })
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!eoi) {
    return (
      <AdminLayout>
        <div className="text-center py-16 text-muted-foreground">EOI not found.</div>
      </AdminLayout>
    );
  }

  const fd = eoi.formData;
  const currentStatus = status ?? eoi.status;
  const currentNotes = notes ?? eoi.adminNotes ?? "";

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Link href="/admin/eois">
            <ArrowLeft className="h-4 w-4" /> Back to EOIs
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: Form Data */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-serif">{eoi.buyerFirstName} {eoi.buyerSurname}</CardTitle>
                  <p className="text-muted-foreground mt-1">EOI for <span className="font-semibold text-foreground">{eoi.horseName}</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Submitted {format(new Date(eoi.createdAt), "d MMMM yyyy 'at' h:mm a")}</p>
                </div>
                <EoiStatusBadge status={eoi.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Contact */}
              <Section title="Contact Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a href={`mailto:${eoi.buyerEmail}`} className="flex items-center gap-2 text-sm text-[#24384e] hover:underline">
                    <Mail className="h-4 w-4 shrink-0" />{eoi.buyerEmail}
                  </a>
                  <a href={`tel:${eoi.buyerPhone}`} className="flex items-center gap-2 text-sm text-[#24384e] hover:underline">
                    <Phone className="h-4 w-4 shrink-0" />{eoi.buyerPhone}
                  </a>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />{eoi.buyerLocation}
                  </div>
                </div>
              </Section>

              {/* About this form */}
              <Section title="About This Form">
                <Field label="Decision-maker role" value={str(fd.decisionMakerRole)} />
                <Field label="Form covers" value={str(fd.coverageType)} />
              </Section>

              {/* The horse */}
              <Section title="The Horse">
                <Field label="Horse name" value={eoi.horseName} />
                <Field label="Research completed" value={str(fd.hasResearched)} />
                <Field label="Budget status" value={str(fd.budgetStatus)} />
                <Field label="Budget amount" value={str(fd.budgetAmount)} />
              </Section>

              {/* Request */}
              <Section title="Request">
                <Field label="Requesting" value={arr(fd.requestTypes)} />
                <Field label="Information requested" value={str(fd.requestedInfo)} />
                <Field label="Preferred viewing date" value={str(fd.preferredViewingDate)} />
              </Section>

              {/* Coach & Viewing */}
              <Section title="Coach & Viewing">
                <Field label="Coach" value={str(fd.coachName)} />
                <Field label="Viewing factors" value={arr(fd.viewingFactors)} />
                <Field label="Additional info requested" value={str(fd.additionalInfoRequest)} />
              </Section>

              {/* Disciplines & Activities */}
              <Section title="Disciplines & Activities">
                <Field label="Suitable disciplines" value={arr(fd.disciplines)} />
                <Field label="Riding activities" value={arr(fd.activities)} />
              </Section>

              {/* Horse Type */}
              <Section title="Horse Type">
                <Field label="Horse description" value={str(fd.horseDescription)} />
                <Field label="Type attributes" value={arr(fd.horseTypeAttributes)} />
                <Field label="Non-negotiables" value={arr(fd.nonNegotiables)} />
              </Section>

              {/* Rider Goals */}
              <Section title="Rider Goals">
                <Field label="Performance goals" value={str(fd.riderGoals)} />
                <Field label="Additional goal info" value={str(fd.additionalGoalInfo)} />
                <Field label="Competence level" value={str(fd.riderCompetenceLevel)} />
              </Section>

              {/* Rider Profile */}
              <Section title="Rider Profile">
                <Field label="Confidence level" value={str(fd.riderConfidence)} />
                <Field label="Circumstances" value={str(fd.riderCircumstances)} />
                <Field label="Rider age" value={str(fd.riderAge)} />
                <Field label="Additional info" value={str(fd.riderInfo)} />
              </Section>

              {/* Purchase */}
              <Section title="Purchase Details">
                <Field label="Purchase factors" value={arr(fd.purchaseFactors)} />
                <Field label="Other non-negotiables" value={str(fd.otherNonNegotiables)} />
                <Field label="Vetting level" value={str(fd.vettingLevel)} />
                <Field label="Vet expectations" value={str(fd.vetExpectations)} />
              </Section>

              {/* Management */}
              <Section title="Horse Management">
                <Field label="Management conditions" value={arr(fd.managementConditions)} />
                <Field label="Agistment location" value={str(fd.agistmentLocation)} />
                <Field label="Experience & support" value={str(fd.experienceLevel)} />
                <Field label="Settling expectations" value={str(fd.settlingExpectations)} />
                <Field label="Other management" value={str(fd.otherManagementFactors)} />
              </Section>

              {/* Legal */}
              <Section title="Legal & Signature">
                <Field label="Waiver agreed" value={eoi.waiverAgreed} />
                <Field label="Declaration agreed" value={eoi.declarationAgreed} />
                {eoi.signatureData && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground font-medium">Digital signature</span>
                    <img
                      src={eoi.signatureData}
                      alt="Buyer signature"
                      className="border border-stone-200 rounded-lg max-w-xs bg-white p-2"
                    />
                  </div>
                )}
              </Section>

            </CardContent>
          </Card>
        </div>

        {/* Right: Admin Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Workflow Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">Status</label>
                <Select value={currentStatus} onValueChange={(v) => setStatus(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EOI_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">Admin Notes</label>
                <Textarea
                  value={currentNotes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes about this EOI…"
                  rows={5}
                  className="resize-none text-sm"
                />
              </div>

              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 border-0"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
                <a href={`mailto:${eoi.buyerEmail}`}>
                  <Mail className="h-4 w-4" /> Email buyer
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
                <a href={`tel:${eoi.buyerPhone}`}>
                  <Phone className="h-4 w-4" /> Call buyer
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
                <a href={`/api/eois/${eoi.id}/pdf`} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" /> Download EOI Summary PDF
                </a>
              </Button>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground text-center">
            Last updated {format(new Date(eoi.updatedAt), "d MMM yyyy 'at' h:mm a")}
          </div>
        </div>
      </div>

      {/* Email Drafts — full width below */}
      <Card className="mt-6">
        <CardHeader className="pb-3 border-b bg-muted/30">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-accent" /> Email Drafts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

            {/* Left: controls */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Template</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["To Buyer", "To Seller"] as const).map((group) => (
                      <div key={group}>
                        <div className="px-2 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group}</div>
                        {EMAIL_TEMPLATES.filter((t) => t.group === group).map((t) => (
                          <SelectItem key={t.id} value={t.id} className="pl-4">{t.label}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">To</label>
                <p className="text-sm text-stone-700 break-all">
                  {draft.to || <span className="text-muted-foreground italic">Enter seller email manually</span>}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Subject</label>
                <div className="flex gap-1.5 items-center">
                  <p className="flex-1 text-sm text-stone-700 leading-snug">{draft.subject}</p>
                  <Button size="sm" variant="ghost" className="shrink-0 px-2 h-7" onClick={() => copyText(draft.subject, "Subject")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  onClick={() => copyText(draft.body, "Email body")}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Copy className="h-4 w-4" /> Copy Email Body
                </Button>
                <Button
                  asChild
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 border-0 gap-2"
                >
                  <a href={`mailto:${draft.to}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}>
                    <ExternalLink className="h-4 w-4" /> Open in Email Client
                  </a>
                </Button>
              </div>
            </div>

            {/* Right: body preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Email Body</label>
                <span className="text-xs text-muted-foreground">Read-only preview — edit in your email client</span>
              </div>
              <textarea
                readOnly
                value={draft.body}
                rows={16}
                className="w-full rounded-md border border-input bg-muted/30 px-4 py-3 text-sm text-stone-700 resize-none leading-relaxed font-mono"
              />
            </div>

          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
