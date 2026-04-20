import { useState } from "react";
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
import { ArrowLeft, Mail, Phone, MapPin, CheckCircle2, XCircle } from "lucide-react";
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
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground text-center">
            Last updated {format(new Date(eoi.updatedAt), "d MMM yyyy 'at' h:mm a")}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
