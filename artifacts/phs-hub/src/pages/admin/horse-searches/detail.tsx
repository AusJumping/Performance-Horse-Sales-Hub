import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import AdminLayout from "@/components/layout/admin-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FolderOpen, FileText, RefreshCw, FileDown, Trash2 } from "lucide-react";
import { SearchStatusBadge } from "./index";
import { openHorseSearchPrintWindow } from "@/lib/horse-search-pdf";

const STATUSES = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under Review" },
  { value: "active_search", label: "Active Search" },
  { value: "horse_found", label: "Horse Found" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

interface HorseSearch {
  id: number;
  firstName: string;
  surname: string;
  email: string;
  emailOptional: string | null;
  phone: string;
  location: string;
  searchServiceLevel: string;
  formData: Record<string, unknown>;
  termsAgreed: boolean;
  signatureData: string | null;
  status: string;
  adminNotes: string | null;
  driveFolderId: string | null;
  driveFolderLink: string | null;
  driveDocId: string | null;
  driveDocLink: string | null;
  driveSetupStatus: string;
  driveSetupError: string | null;
  createdAt: string;
}

async function fetchSearch(id: string): Promise<HorseSearch> {
  const res = await fetch(`/api/horse-searches/${id}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function HorseSearchDetail() {
  const [, params] = useRoute("/admin/horse-searches/:id");
  const id = params?.id ?? "";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: hs, isLoading } = useQuery({
    queryKey: ["horse-search", id],
    queryFn: () => fetchSearch(id),
    enabled: !!id,
  });

  const [notes, setNotes] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: async (patch: { status?: string; adminNotes?: string }) => {
      const res = await fetch(`/api/horse-searches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-search", id] });
      qc.invalidateQueries({ queryKey: ["horse-searches"] });
      toast({ title: "Saved" });
    },
    onError: () => toast({ title: "Error", description: "Could not save.", variant: "destructive" }),
  });

  const retryDriveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/horse-searches/${id}/retry-drive`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-search", id] });
      toast({ title: "Drive folder created" });
    },
    onError: (e: Error) => toast({ title: "Drive error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/horse-searches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-searches"] });
      toast({ title: "Search request deleted" });
      navigate("/admin/horse-searches");
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <AdminLayout><div className="space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-[400px] w-full" /></div></AdminLayout>;
  if (!hs) return <AdminLayout><div>Search not found</div></AdminLayout>;

  const currentNotes = notes ?? hs.adminNotes ?? "";
  const f = hs.formData;
  const str = (k: string) => f[k] ? String(f[k]) : "—";
  const arr = (k: string) => Array.isArray(f[k]) ? (f[k] as string[]).join(", ") : str(k);

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="py-2 border-b border-stone-100 last:border-0 grid grid-cols-[200px_1fr] gap-4">
      <dt className="text-sm font-medium text-stone-500">{label}</dt>
      <dd className="text-sm text-stone-900 whitespace-pre-wrap">{value || "—"}</dd>
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/horse-searches">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{hs.firstName} {hs.surname}</h1>
          <p className="text-muted-foreground text-sm">
            Search #{hs.id} · Submitted {format(new Date(hs.createdAt), "d MMM yyyy, h:mm a")}
          </p>
        </div>
        <SearchStatusBadge status={hs.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — form details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Contact */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-[#24384e] mb-3">Contact Details</h2>
            <dl>
              <Field label="Name" value={`${hs.firstName} ${hs.surname}`} />
              <Field label="Primary Email" value={hs.email} />
              <Field label="Secondary Email" value={hs.emailOptional ?? "—"} />
              <Field label="Phone" value={hs.phone} />
              <Field label="Location" value={hs.location} />
              <Field label="Search Service" value={hs.searchServiceLevel === "level2" ? "Premium Concierge — $1,000 + 5%" : "Standard Search — $500 + $500"} />
            </dl>
          </div>

          {/* About the search */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-[#24384e] mb-3">About the Search</h2>
            <dl>
              <Field label="Main reason for help" value={str("mainReason")} />
              <Field label="Search factors" value={arr("searchFactors")} />
              <Field label="Preferred location" value={str("preferredLocation")} />
              <Field label="Budget" value={str("budget")} />
            </dl>
          </div>

          {/* Horse criteria */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-[#24384e] mb-3">Horse Criteria</h2>
            <dl>
              <Field label="Preferred age range" value={arr("horseAgeRange")} />
              <Field label="Preferred height" value={arr("horseHeight")} />
              <Field label="3 characteristics I like" value={str("characteristicsLiked")} />
              <Field label="3 deal breakers" value={str("dealBreakers")} />
              <Field label="Main discipline" value={str("mainDiscipline")} />
              <Field label="Horse type" value={str("horseType")} />
            </dl>
          </div>

          {/* Goals */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-[#24384e] mb-3">Goals & Current Level</h2>
            <dl>
              <Field label="Rider goals" value={str("riderGoals")} />
              <Field label="Must compete at level" value={str("currentCompetitionLevel")} />
              <Field label="Future goals" value={str("futureGoals")} />
            </dl>
          </div>

          {/* Rider */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-[#24384e] mb-3">Rider Profile</h2>
            <dl>
              <Field label="Rider competence" value={str("riderCompetence")} />
              <Field label="How I feel riding" value={str("ridingConfidence")} />
              <Field label="Rider history" value={str("riderHistory")} />
              <Field label="Rider age / bracket" value={str("riderAge")} />
            </dl>
          </div>

          {/* Horse requirements */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-[#24384e] mb-3">Horse Requirements</h2>
            <dl>
              <Field label="Horse statements" value={arr("horseStatements")} />
            </dl>
          </div>

          {/* Management & Restrictions */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-[#24384e] mb-3">Management & Restrictions</h2>
            <dl>
              <Field label="Management" value={arr("horseManagement")} />
              <Field label="Restrictions" value={arr("searchRestrictions")} />
              <Field label="Other information" value={str("otherInfo")} />
            </dl>
          </div>

          {/* Signature */}
          {hs.signatureData && (
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-[#24384e] mb-3">Signature</h2>
              <img src={hs.signatureData} alt="Signature" className="border rounded max-h-24 bg-white" />
            </div>
          )}
        </div>

        {/* Right — admin panel */}
        <div className="space-y-4">

          {/* Download PDF */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => openHorseSearchPrintWindow({
              id: hs.id,
              firstName: hs.firstName,
              surname: hs.surname,
              email: hs.email,
              emailOptional: hs.emailOptional,
              phone: hs.phone,
              location: hs.location,
              searchServiceLevel: hs.searchServiceLevel,
              formData: hs.formData,
              signatureData: hs.signatureData,
              createdAt: hs.createdAt,
            })}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Download PDF
          </Button>

          {/* Status */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-stone-700 mb-3">Status</h3>
            <Select
              value={hs.status}
              onValueChange={(val) => updateMutation.mutate({ status: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Drive */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-stone-700 mb-3">Google Drive</h3>
            {hs.driveFolderLink ? (
              <div className="space-y-2">
                <a
                  href={hs.driveFolderLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-700 hover:underline font-medium"
                >
                  <FolderOpen className="h-4 w-4" /> Open Search Folder
                </a>
                {hs.driveDocLink && (
                  <a
                    href={hs.driveDocLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-sky-700 hover:underline"
                  >
                    <FileText className="h-4 w-4" /> Open Criteria Doc
                  </a>
                )}
                <p className="text-xs text-stone-400 mt-1">Folder created in Search Folders</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-stone-500">
                  {hs.driveSetupStatus === "failed"
                    ? `Failed: ${hs.driveSetupError ?? "Unknown error"}`
                    : hs.driveSetupStatus === "creating"
                    ? "Creating folder…"
                    : "Folder not yet created."}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={retryDriveMutation.isPending}
                  onClick={() => retryDriveMutation.mutate()}
                  className="w-full"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  {retryDriveMutation.isPending ? "Creating…" : "Create Drive Folder"}
                </Button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-stone-700 mb-3">Admin Notes</h3>
            <Textarea
              rows={5}
              placeholder="Internal notes about this search…"
              value={currentNotes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm"
            />
            <Button
              size="sm"
              className="mt-3 w-full bg-[#24384e] hover:bg-[#1a2d3f]"
              disabled={updateMutation.isPending || currentNotes === (hs.adminNotes ?? "")}
              onClick={() => updateMutation.mutate({ adminNotes: currentNotes })}
            >
              Save Notes
            </Button>
          </div>

          {/* Delete */}
          <div className="bg-white border border-red-100 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-stone-700 mb-3">Danger Zone</h3>
            {!confirmDelete ? (
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Search Request
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-700">This will permanently delete this search record. Are you sure?</p>
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Yes, Delete Permanently"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
