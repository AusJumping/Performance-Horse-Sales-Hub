import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import AdminLayout from "@/components/layout/admin-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FolderOpen, FileText, RefreshCw, FileDown, Trash2, Link2, FileSignature, CheckCircle, XCircle, Copy, MessageSquare, ExternalLink } from "lucide-react";
import { SearchStatusBadge } from "./index";
import { openHorseSearchPrintWindow } from "@/lib/horse-search-pdf";
import { openHorseSearchAgreementPrintWindow } from "@/lib/horse-search-agreement-pdf";
import { openHorseSearchContractPrintWindow } from "@/lib/horse-search-contract-pdf";

const STATUSES = [
  { value: "new",                      label: "New" },
  { value: "awaiting_review",          label: "Awaiting Review" },
  { value: "contact_made_by_phs",      label: "Contact Made by PHS" },
  { value: "contact_email_sent",       label: "Contact Email Sent" },
  { value: "declined_by_phs",          label: "Declined by PHS" },
  { value: "declined_by_client",       label: "Declined by Client" },
  { value: "costs_agreement_signed",   label: "Costs Agreement Signed" },
  { value: "search_criteria_approved", label: "Search Criteria Approved" },
  { value: "live",                     label: "Live" },
  { value: "deposit_paid",             label: "Deposit Paid" },
  { value: "purchased",                label: "Purchased" },
  { value: "paused",                   label: "Paused" },
  { value: "search_completed",         label: "Search Completed" },
  { value: "archived",                 label: "Archived" },
];

const EMAIL_TEMPLATES = [
  { id: "search_received",  label: "Search Form Received", group: "To Client" },
  { id: "search_active",    label: "Search Slot Active",   group: "To Client" },
] as const;

function generateSearchDraft(
  templateId: string,
  hs: HorseSearch,
): { to: string; subject: string; body: string } {
  const firstName = hs.firstName;
  const fullName  = `${hs.firstName} ${hs.surname}`;
  const sig = "Best wishes,\nSally Empringham\nPerformance Horse Sales";

  switch (templateId) {
    case "search_received":
      return {
        to: hs.email,
        subject: "Your Horse Search — Next Steps",
        body: `Hi ${firstName},\n\nThanks for submitting the Search Form for [SEARCH DESCRIPTION]. I am more than happy to help :)\n\nPlease let me know if you have any questions about the process.\n\nAlternatively, if you are ready to proceed, please open and sign the costs agreement and I will send through the initial invoice.\n\nPlease note: Search Slots are limited and are not held until the Costs Agreement is signed and the initial invoice is paid.\n\n${sig}`,
      };
    case "search_active":
      return {
        to: hs.email,
        subject: "Your Search Slot is Now Active!",
        body: `Dear ${fullName},\n\nCongratulations! Your Search slot is booked and active - we are on the way to finding you a wonderful new horse!\n\nHere is the link to ${fullName}'s Search Folder: ${hs.driveFolderLink ?? "[PLEASE ADD DRIVE FOLDER LINK]"}\n\nWithin it are:\n\n- A Client Search database with your draft criteria. This is also where horses will be added.\n- PDF Search Agreements and our Terms and Conditions.\n- Three sub folders containing helpful resources about searching and buying a horse.\n\nPlease have a look at the Search Criteria and let me know if you are happy with it or if you would like to change anything. Once that has been communicated, I will start adding horses to the database.\n\n${sig}`,
      };
    default:
      return { to: "", subject: "", body: "" };
  }
}

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

interface SearchAgreement {
  id: number; token: string; status: string;
  clientName?: string; clientEmail?: string; clientAddress?: string; clientPhone?: string;
  serviceLevel?: string; upfrontFee?: string; consultancyFee?: string; customTerms?: string;
  clientSignature?: string; agreedTerms?: boolean; agreedFee?: boolean; agreedReady?: boolean;
  submittedAt?: string; createdAt: string;
}

interface SearchContract {
  id: number; token: string; status: string;
  horseName: string; salesPrice?: string; holdingDepositAmount?: string; horseDescription?: string; customClauses?: string;
  sellerName?: string; sellerEmail?: string; sellerAddress?: string; sellerPhone?: string;
  sellerBankAccountName?: string; sellerBankBsb?: string; sellerBankAccount?: string;
  buyerName?: string; buyerEmail?: string; buyerAddress?: string; buyerPhone?: string;
  fillerName?: string; fillerEmail?: string; fillerRole?: string;
  buyerSignature?: string; sellerSignature?: string;
  agreedSalesPrice?: boolean; agreedHoldingDeposit?: boolean; agreedDescription?: boolean;
  agreedSection3?: boolean; agreedSection4?: boolean; agreedSellerDeclaration?: boolean; agreedBuyerDeclaration?: boolean;
  submittedAt?: string; createdAt: string;
}

async function fetchSearch(id: string): Promise<HorseSearch> {
  const res = await fetch(`/api/horse-searches/${id}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

function copyToClipboard(text: string, toast: (t: { title: string }) => void) {
  navigator.clipboard.writeText(text).then(() => toast({ title: "Link copied!" }));
}

// ─── Costs Agreement Panel ───────────────────────────────────────────────────

function AgreementPanel({ id, hs }: { id: string; hs: HorseSearch }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showGenForm, setShowGenForm] = useState(false);
  const [upfrontFee, setUpfrontFee] = useState("$1,000");
  const [consultancyFee, setConsultancyFee] = useState("5% of the purchase price (min $1,000, capped at $2,000)");
  const [customTerms, setCustomTerms] = useState("");

  const { data: agreement, isLoading } = useQuery<SearchAgreement>({
    queryKey: ["horse-search-agreement", id],
    queryFn: async () => {
      const r = await fetch(`/api/horse-searches/${id}/agreement`);
      if (r.status === 404) return null as any;
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    retry: false,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/horse-searches/${id}/agreement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upfrontFee, consultancyFee, customTerms: customTerms || undefined }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-search-agreement", id] });
      toast({ title: "Costs Agreement link generated" });
      setShowGenForm(false);
    },
    onError: () => toast({ title: "Error", description: "Could not generate link.", variant: "destructive" } as any),
  });

  const voidMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/horse-searches/${id}/agreement`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-search-agreement", id] });
      toast({ title: "Agreement voided" });
    },
    onError: () => toast({ title: "Error", description: "Could not void.", variant: "destructive" } as any),
  });

  const signingUrl = agreement ? `${window.location.origin}/horse-search-agreement/${agreement.token}` : "";

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <FileSignature className="h-4 w-4 text-[#24384e]" />
        <h3 className="font-semibold text-stone-700">Costs Agreement</h3>
        {agreement && (
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
            agreement.status === "submitted" ? "bg-emerald-100 text-emerald-700" :
            agreement.status === "voided" ? "bg-red-100 text-red-600" :
            "bg-amber-100 text-amber-700"}`}
          >
            {agreement.status === "submitted" ? "Signed" : agreement.status === "voided" ? "Voided" : "Awaiting Signature"}
          </span>
        )}
      </div>

      {!agreement || agreement.status === "voided" ? (
        <>
          {!showGenForm ? (
            <Button size="sm" variant="outline" className="w-full" onClick={() => setShowGenForm(true)}>
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              Generate Signing Link
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Upfront Fee</label>
                <Input value={upfrontFee} onChange={e => setUpfrontFee(e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Consultancy Fee</label>
                <Input value={consultancyFee} onChange={e => setConsultancyFee(e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Custom Terms (optional)</label>
                <Textarea rows={2} value={customTerms} onChange={e => setCustomTerms(e.target.value)} className="text-sm" placeholder="Any additional terms…" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-[#24384e] hover:bg-[#1a2d3f]" disabled={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
                  {generateMutation.isPending ? "Generating…" : "Generate Link"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowGenForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {agreement.status === "submitted" ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>Signed {agreement.submittedAt ? format(new Date(agreement.submittedAt), "d MMM yyyy, h:mm a") : ""}</span>
            </div>
          ) : (
            <div className="bg-stone-50 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-500 mb-1">Signing link</p>
              <p className="text-xs font-mono text-stone-700 break-all">{signingUrl}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {agreement.status === "pending" && (
              <Button size="sm" variant="outline" className="flex-1" onClick={() => copyToClipboard(signingUrl, toast)}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Link
              </Button>
            )}
            <Button size="sm" variant="outline" className="flex-1"
              onClick={() => openHorseSearchAgreementPrintWindow({
                id: agreement.id, token: agreement.token, status: agreement.status,
                clientName: agreement.clientName, clientEmail: agreement.clientEmail,
                clientAddress: agreement.clientAddress, clientPhone: agreement.clientPhone,
                serviceLevel: agreement.serviceLevel, upfrontFee: agreement.upfrontFee,
                consultancyFee: agreement.consultancyFee, customTerms: agreement.customTerms,
                clientSignature: agreement.clientSignature,
                submittedAt: agreement.submittedAt, createdAt: agreement.createdAt,
              })}>
              <FileDown className="h-3.5 w-3.5 mr-1.5" /> Preview PDF
            </Button>
          </div>

          {agreement.status !== "voided" && (
            <Button size="sm" variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50"
              disabled={voidMutation.isPending} onClick={() => voidMutation.mutate()}>
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              {voidMutation.isPending ? "Voiding…" : "Void Agreement"}
            </Button>
          )}

          {(agreement.status === "voided") && (
            <Button size="sm" variant="outline" className="w-full" onClick={() => setShowGenForm(true)}>
              <Link2 className="h-3.5 w-3.5 mr-1.5" /> Regenerate Link
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bill of Sale Panel ──────────────────────────────────────────────────────

function ContractPanel({ id, hs }: { id: string; hs: HorseSearch }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showGenForm, setShowGenForm] = useState(false);
  const [horseName, setHorseName] = useState("");
  const [salesPrice, setSalesPrice] = useState("");
  const [holdingDepositAmount, setHoldingDepositAmount] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerBankAccountName, setSellerBankAccountName] = useState("");
  const [sellerBankBsb, setSellerBankBsb] = useState("");
  const [sellerBankAccount, setSellerBankAccount] = useState("");
  const [horseDescription, setHorseDescription] = useState("");
  const [customClauses, setCustomClauses] = useState("");

  const { data: contract, isLoading } = useQuery<SearchContract>({
    queryKey: ["horse-search-contract", id],
    queryFn: async () => {
      const r = await fetch(`/api/horse-searches/${id}/search-contract`);
      if (r.status === 404) return null as any;
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    retry: false,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/horse-searches/${id}/search-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horseName: horseName || undefined,
          horseDescription: horseDescription || undefined,
          salesPrice: salesPrice || undefined,
          holdingDepositAmount: holdingDepositAmount || undefined,
          sellerName: sellerName || undefined,
          sellerEmail: sellerEmail || undefined,
          sellerBankAccountName: sellerBankAccountName || undefined,
          sellerBankBsb: sellerBankBsb || undefined,
          sellerBankAccount: sellerBankAccount || undefined,
          buyerName: `${hs.firstName} ${hs.surname}`,
          buyerEmail: hs.email,
          buyerPhone: hs.phone,
          customClauses: customClauses || undefined,
        }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-search-contract", id] });
      toast({ title: "Bill of Sale link generated" });
      setShowGenForm(false);
    },
    onError: () => toast({ title: "Error", description: "Could not generate.", variant: "destructive" } as any),
  });

  const voidMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/horse-searches/${id}/search-contract`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-search-contract", id] });
      toast({ title: "Contract voided" });
    },
    onError: () => toast({ title: "Error", description: "Could not void.", variant: "destructive" } as any),
  });

  const signingUrl = contract ? `${window.location.origin}/horse-search-contract/${contract.token}` : "";

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-[#24384e]" />
        <h3 className="font-semibold text-stone-700">Bill of Sale</h3>
        {contract && (
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
            contract.status === "submitted" ? "bg-emerald-100 text-emerald-700" :
            contract.status === "voided" ? "bg-red-100 text-red-600" :
            "bg-amber-100 text-amber-700"}`}
          >
            {contract.status === "submitted" ? "Signed" : contract.status === "voided" ? "Voided" : "Awaiting Signature"}
          </span>
        )}
      </div>

      {!contract || contract.status === "voided" ? (
        <>
          {!showGenForm ? (
            <Button size="sm" variant="outline" className="w-full" onClick={() => setShowGenForm(true)}>
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              Generate Signing Link
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Horse Name</label>
                  <Input value={horseName} onChange={e => setHorseName(e.target.value)} className="text-sm" placeholder="e.g. Rebel" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Sale Price</label>
                  <Input value={salesPrice} onChange={e => setSalesPrice(e.target.value)} className="text-sm" placeholder="e.g. $25,000" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Horse Description (Section 2)</label>
                <Textarea rows={4} value={horseDescription} onChange={e => setHorseDescription(e.target.value)} className="text-sm" placeholder="Breed, colour, age, height, temperament, competition history, health…" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Holding Deposit</label>
                <Input value={holdingDepositAmount} onChange={e => setHoldingDepositAmount(e.target.value)} className="text-sm" placeholder="e.g. $2,500" />
              </div>
              <div className="border-t border-stone-100 pt-3">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Seller Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Seller name</label>
                    <Input value={sellerName} onChange={e => setSellerName(e.target.value)} className="text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 block mb-1">Seller email</label>
                    <Input value={sellerEmail} onChange={e => setSellerEmail(e.target.value)} className="text-sm" type="email" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="col-span-1">
                    <label className="text-xs text-stone-500 block mb-1">BSB</label>
                    <Input value={sellerBankBsb} onChange={e => setSellerBankBsb(e.target.value)} className="text-sm" placeholder="000-000" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-stone-500 block mb-1">Account #</label>
                    <Input value={sellerBankAccount} onChange={e => setSellerBankAccount(e.target.value)} className="text-sm" />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="text-xs text-stone-500 block mb-1">Account name</label>
                  <Input value={sellerBankAccountName} onChange={e => setSellerBankAccountName(e.target.value)} className="text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Custom Clause (optional)</label>
                <Textarea rows={2} value={customClauses} onChange={e => setCustomClauses(e.target.value)} className="text-sm" placeholder="Any additional terms…" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-[#24384e] hover:bg-[#1a2d3f]" disabled={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
                  {generateMutation.isPending ? "Generating…" : "Generate Link"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowGenForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-stone-700">{contract.horseName}</div>
          {contract.salesPrice && <div className="text-xs text-stone-500">Sale price: <strong>{contract.salesPrice}</strong></div>}

          {contract.status === "submitted" ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>Signed {contract.submittedAt ? format(new Date(contract.submittedAt), "d MMM yyyy, h:mm a") : ""}</span>
            </div>
          ) : (
            <div className="bg-stone-50 rounded-lg px-3 py-2">
              <p className="text-xs text-stone-500 mb-1">Signing link</p>
              <p className="text-xs font-mono text-stone-700 break-all">{signingUrl}</p>
            </div>
          )}

          {contract.status === "submitted" && (contract.buyerSignature || contract.sellerSignature) && (
            <div className="grid grid-cols-2 gap-2">
              {contract.sellerSignature && (
                <div>
                  <p className="text-xs text-stone-400 mb-1">Seller sig</p>
                  <img src={contract.sellerSignature} alt="Seller signature" className="border rounded max-h-12 w-full object-contain bg-white" />
                </div>
              )}
              {contract.buyerSignature && (
                <div>
                  <p className="text-xs text-stone-400 mb-1">Buyer sig</p>
                  <img src={contract.buyerSignature} alt="Buyer signature" className="border rounded max-h-12 w-full object-contain bg-white" />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {contract.status === "pending" && (
              <Button size="sm" variant="outline" className="flex-1" onClick={() => copyToClipboard(signingUrl, toast)}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Link
              </Button>
            )}
            <Button size="sm" variant="outline" className="flex-1"
              onClick={() => openHorseSearchContractPrintWindow({
                id: contract.id, status: contract.status,
                horseName: contract.horseName, salesPrice: contract.salesPrice,
                holdingDepositAmount: contract.holdingDepositAmount,
                horseDescription: contract.horseDescription, customClauses: contract.customClauses,
                sellerName: contract.sellerName, sellerEmail: contract.sellerEmail,
                sellerAddress: contract.sellerAddress, sellerPhone: contract.sellerPhone,
                sellerBankAccountName: contract.sellerBankAccountName,
                sellerBankBsb: contract.sellerBankBsb, sellerBankAccount: contract.sellerBankAccount,
                buyerName: contract.buyerName, buyerEmail: contract.buyerEmail,
                buyerAddress: contract.buyerAddress, buyerPhone: contract.buyerPhone,
                fillerName: contract.fillerName, fillerEmail: contract.fillerEmail,
                fillerRole: contract.fillerRole,
                buyerSignature: contract.buyerSignature, sellerSignature: contract.sellerSignature,
                submittedAt: contract.submittedAt, createdAt: contract.createdAt,
              })}>
              <FileDown className="h-3.5 w-3.5 mr-1.5" /> Preview PDF
            </Button>
          </div>

          {contract.status !== "voided" && (
            <Button size="sm" variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50"
              disabled={voidMutation.isPending} onClick={() => voidMutation.mutate()}>
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              {voidMutation.isPending ? "Voiding…" : "Void Contract"}
            </Button>
          )}

          {contract.status === "voided" && (
            <Button size="sm" variant="outline" className="w-full" onClick={() => setShowGenForm(true)}>
              <Link2 className="h-3.5 w-3.5 mr-1.5" /> Regenerate Link
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

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
  const [selectedTemplate, setSelectedTemplate] = useState<string>("search_received");

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied!` }));
  }

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
  const arr = (k: string): string[] => Array.isArray(f[k]) ? (f[k] as string[]) : (f[k] ? [String(f[k])] : []);

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="py-2 border-b border-stone-100 last:border-0 grid grid-cols-[200px_1fr] gap-4">
      <dt className="text-sm font-medium text-stone-500">{label}</dt>
      <dd className="text-sm text-stone-900 whitespace-pre-wrap">{value || "—"}</dd>
    </div>
  );

  const ListField = ({ label, values }: { label: string; values: string[] }) => (
    <div className="py-2 border-b border-stone-100 last:border-0 grid grid-cols-[200px_1fr] gap-4">
      <dt className="text-sm font-medium text-stone-500">{label}</dt>
      <dd className="text-sm text-stone-900">
        {values.length === 0 ? "—" : (
          <ul className="space-y-0.5">
            {values.map((v, i) => <li key={i} className="flex gap-1.5"><span className="text-stone-400 shrink-0">·</span><span>{v}</span></li>)}
          </ul>
        )}
      </dd>
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
              <ListField label="Search factors" values={arr("searchFactors")} />
              <Field label="Preferred location" value={str("preferredLocation")} />
              <Field label="Budget" value={str("budget")} />
            </dl>
          </div>

          {/* Horse criteria */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-[#24384e] mb-3">Horse Criteria</h2>
            <dl>
              <ListField label="Preferred age range" values={arr("horseAgeRange")} />
              <ListField label="Preferred height" values={arr("horseHeight")} />
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
              <Field label="When riding, I feel…" value={str("ridingConfidence")} />
              <Field label="Rider history" value={str("riderHistory")} />
              <Field label="Rider age / bracket" value={str("riderAge")} />
            </dl>
          </div>

          {/* Horse requirements */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-[#24384e] mb-3">Horse Requirements</h2>
            <dl>
              <ListField label="Horse must be / have" values={arr("horseStatements")} />
            </dl>
          </div>

          {/* Management & Restrictions */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-[#24384e] mb-3">Management & Restrictions</h2>
            <dl>
              <ListField label="Management notes" values={arr("horseManagement")} />
              <ListField label="Search restrictions" values={arr("searchRestrictions")} />
              <Field label="Other information" value={str("otherInfo")} />
            </dl>
          </div>

          {/* Terms & Declaration */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-[#24384e] mb-3">Terms & Declaration</h2>
            <dl>
              <Field label="Terms agreed" value={hs.termsAgreed ? "Yes — agreed" : "No"} />
              <Field label="Ready to…" value={str("readyToSign")} />
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
              termsAgreed: hs.termsAgreed,
            })}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Download Search PDF
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

          {/* Costs Agreement */}
          <AgreementPanel id={id} hs={hs} />

          {/* Bill of Sale */}
          <ContractPanel id={id} hs={hs} />

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

      {/* ── Email Drafts — full-width below ────────────────────────────── */}
      {(() => {
        const draft = generateSearchDraft(selectedTemplate, hs);
        return (
          <div className="mt-6 bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#24384e]" />
              <h3 className="font-semibold text-stone-800 text-sm">Email Drafts</h3>
            </div>
            <div className="p-5">
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
                        {EMAIL_TEMPLATES.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">To</label>
                    <p className="text-sm text-stone-700 break-all">{draft.to}</p>
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

                  {selectedTemplate === "search_received" && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 leading-relaxed">
                      Replace <strong>[SEARCH DESCRIPTION]</strong> with the client's search goal before sending — e.g. "your daughter's next dressage horse".
                    </p>
                  )}
                  {selectedTemplate === "search_active" && !hs.driveFolderLink && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 leading-relaxed">
                      Drive folder not yet created — replace <strong>[PLEASE ADD DRIVE FOLDER LINK]</strong> with the actual folder link before sending.
                    </p>
                  )}

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
                      className="w-full bg-[#24384e] hover:bg-[#1a2d3f] text-white border-0 gap-2"
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
            </div>
          </div>
        );
      })()}

    </AdminLayout>
  );
}
