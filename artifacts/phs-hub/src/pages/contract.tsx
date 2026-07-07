import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "wouter";

const API_BASE = "/api";

// ─── Signature Canvas ────────────────────────────────────────────────────────

function SignatureCanvas({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e: { clientX: number; clientY: number }, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const pt = "touches" in e ? getPos(e.touches[0], canvas) : getPos(e.nativeEvent as MouseEvent, canvas);
    ctx.beginPath(); ctx.moveTo(pt.x, pt.y);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const pt = "touches" in e ? getPos(e.touches[0], canvas) : getPos(e.nativeEvent as MouseEvent, canvas);
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(pt.x, pt.y); ctx.stroke();
  }, []);

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current; if (!canvas) return;
    setHasSignature(true);
    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false); onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed border-stone-300 rounded-lg bg-white relative">
        <canvas ref={canvasRef} width={600} height={150}
          className="w-full touch-none rounded-lg cursor-crosshair"
          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
          onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-stone-400 text-sm">Draw your signature here</span>
          </div>
        )}
      </div>
      {hasSignature && (
        <button onClick={clear} type="button" className="text-xs text-stone-500 hover:text-red-600 underline">
          Clear and redraw
        </button>
      )}
    </div>
  );
}

function AgreementBox({ id, checked, onChange, children }: {
  id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer bg-[#24384e]/5 border border-[#24384e]/20 rounded-lg p-4">
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 rounded border-stone-400 shrink-0 accent-[#24384e]" />
      <span className="text-sm text-stone-700 leading-snug font-medium">{children}</span>
    </label>
  );
}

function SectionHeading({ num, title }: { num?: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {num && (
        <span className="bg-[#24384e] text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shrink-0">{num}</span>
      )}
      <h2 className="text-base font-bold text-[#24384e] uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-sm font-medium text-stone-800">{value}</p>
    </div>
  );
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}
function fmtDatetime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Contract Data Interface ──────────────────────────────────────────────────

interface ContractData {
  id: number; token: string; status: string;
  horseName: string; salesPrice: string | null; holdingDepositAmount: string | null;
  horseDescription: string | null; customClauses: string | null;
  submittedAt: string | null; sellerSignedAt: string | null; buyerSignedAt: string | null;
  sellerName: string | null; sellerEmail: string | null; sellerAddress: string | null; sellerPhone: string | null;
  sellerBankAccountName: string | null; sellerBankBsb: string | null; sellerBankAccount: string | null;
  buyerName: string | null; buyerEmail: string | null; buyerAddress: string | null; buyerPhone: string | null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContractPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Which role this visitor is signing as
  const [role, setRole] = useState<"seller" | "buyer" | null>(null);
  // After this party successfully submits
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // This party's details (editable)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  // Agreement checkboxes (all parties see all, sign only what's relevant)
  const [agreedSalesPrice, setAgreedSalesPrice] = useState(false);
  const [agreedHoldingDeposit, setAgreedHoldingDeposit] = useState(false);
  const [agreedDescription, setAgreedDescription] = useState(false);
  const [agreedSection3, setAgreedSection3] = useState(false);
  const [agreedSection4, setAgreedSection4] = useState(false);
  const [agreedSellerDeclaration, setAgreedSellerDeclaration] = useState(false);
  const [agreedBuyerDeclaration, setAgreedBuyerDeclaration] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/contract/${token}`)
      .then(async r => {
        if (r.status === 410) { setError("This contract link has been voided. Please contact Performance Horse Sales."); return; }
        if (r.status === 404) { setError("This contract link is not valid. Please check the link and try again."); return; }
        if (!r.ok) { setError("Something went wrong loading the contract. Please try again."); return; }
        const data: ContractData = await r.json();
        setContract(data);
      })
      .catch(() => setError("Unable to load the contract. Please check your connection."))
      .finally(() => setLoading(false));
  }, [token]);

  // Pre-fill this party's editable fields when role is selected
  useEffect(() => {
    if (!contract || !role) return;
    if (role === "seller") {
      setName(contract.sellerName ?? "");
      setEmail(contract.sellerEmail ?? "");
      setAddress(contract.sellerAddress ?? "");
      setPhone(contract.sellerPhone ?? "");
    } else {
      setName(contract.buyerName ?? "");
      setEmail(contract.buyerEmail ?? "");
      setAddress(contract.buyerAddress ?? "");
      setPhone(contract.buyerPhone ?? "");
    }
  }, [role, contract?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) return setFormError("Please enter your full name.");
    if (!email.trim()) return setFormError("Please enter your email address.");
    if (!signature) return setFormError("Please draw your signature before submitting.");

    if (role === "seller") {
      if (!agreedSalesPrice) return setFormError("Please agree to the sales price (Section 1a).");
      if (!agreedDescription) return setFormError("Please declare the horse description is accurate (Section 2).");
      if (!agreedSection3) return setFormError("Please agree to the warranties (Section 3).");
      if (!agreedSection4) return setFormError("Please agree to the additional clauses (Section 4).");
      if (!agreedSellerDeclaration) return setFormError("Please agree to the Seller's Declaration.");
    } else {
      if (!agreedHoldingDeposit) return setFormError("Please agree to the holding deposit terms.");
      if (!agreedDescription) return setFormError("Please declare the horse description is accurate (Section 2).");
      if (!agreedSection3) return setFormError("Please agree to the warranties (Section 3).");
      if (!agreedSection4) return setFormError("Please agree to the additional clauses (Section 4).");
      if (!agreedBuyerDeclaration) return setFormError("Please agree to the Buyer's Declaration.");
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/contract/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role, name, email, address, phone, signature,
          agreedSalesPrice, agreedHoldingDeposit, agreedDescription,
          agreedSection3, agreedSection4, agreedSellerDeclaration, agreedBuyerDeclaration,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setFormError(data.error ?? "Submission failed. Please try again.");
      setSubmitted(true);
      setContract(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-[#f0ede8] flex items-center justify-center">
      <div className="text-stone-500">Loading contract…</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#f0ede8] flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md text-center space-y-3">
        <div className="text-2xl font-bold text-[#24384e]">Contract of Sale</div>
        <div className="text-red-700 font-medium">{error}</div>
        <p className="text-sm text-stone-500">If you believe this is an error, please contact the agent.</p>
      </div>
    </div>
  );

  if (!contract) return null;

  const isFullySigned = contract.status === "fully_signed" || contract.status === "submitted";

  // ── Fully Signed Screen ────────────────────────────────────────────────────

  if (isFullySigned && !submitted) return (
    <div className="min-h-screen bg-[#f0ede8] flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-10 max-w-lg text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-[#24384e]">Contract Fully Signed</h1>
        <p className="text-stone-600 leading-relaxed">
          The Contract of Sale for <strong>{contract.horseName}</strong> has been signed by both parties.
        </p>
        <div className="text-left space-y-2 bg-stone-50 rounded-lg p-4 text-sm">
          {contract.sellerSignedAt && (
            <div className="flex items-center gap-2 text-emerald-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Seller ({contract.sellerName ?? "Seller"}) signed {fmtDate(contract.sellerSignedAt)}
            </div>
          )}
          {contract.buyerSignedAt && (
            <div className="flex items-center gap-2 text-emerald-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Buyer ({contract.buyerName ?? "Buyer"}) signed {fmtDate(contract.buyerSignedAt)}
            </div>
          )}
        </div>
        <p className="text-sm text-stone-500">Please contact your agent if you have any questions.</p>
      </div>
    </div>
  );

  // ── Success Screen (just submitted) ───────────────────────────────────────

  if (submitted) {
    const isNowFullySigned = contract.status === "fully_signed" || contract.status === "submitted";
    const otherRole = role === "seller" ? "buyer" : "seller";
    const otherSigned = role === "seller" ? !!contract.buyerSignedAt : !!contract.sellerSignedAt;
    return (
      <div className="min-h-screen bg-[#f0ede8] flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-10 max-w-lg text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-[#24384e]">
            {isNowFullySigned ? "Contract Fully Signed!" : "Signature Submitted"}
          </h1>
          <p className="text-stone-600 leading-relaxed">
            {isNowFullySigned
              ? <>The Contract of Sale for <strong>{contract.horseName}</strong> is now signed by both parties. Your agent will be in touch.</>
              : <>Thank you — your signature as the <strong>{role}</strong> has been recorded for <strong>{contract.horseName}</strong>. {!otherSigned && `We are waiting for the ${otherRole} to sign.`}</>
            }
          </p>
          {!isNowFullySigned && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              The {otherRole} still needs to sign using the same link. Please ask your agent if you need assistance.
            </div>
          )}
          <p className="text-sm text-stone-500">You can now close this window.</p>
        </div>
      </div>
    );
  }

  // ── Role Selection Screen ──────────────────────────────────────────────────

  if (!role) return (
    <div className="min-h-screen bg-[#f0ede8]">
      <div className="bg-[#24384e] text-white px-6 py-8 text-center">
        <h1 className="text-2xl font-bold">Contract of Sale</h1>
        <p className="text-white/70 mt-1 text-sm">{contract.horseName}</p>
      </div>
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#24384e] mb-2">Who are you?</h2>
            <p className="text-stone-500 text-sm leading-relaxed">
              This contract link is shared between the buyer and seller. Please select which party you are to see your signing form.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setRole("seller")}
              className={`group border-2 rounded-xl p-6 text-center transition-all cursor-pointer
                ${contract.sellerSignedAt
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-[#24384e]/30 hover:border-[#24384e] hover:bg-[#24384e]/5"
                }`}
            >
              <div className="text-3xl mb-2">🤝</div>
              <div className="font-bold text-[#24384e] text-sm uppercase tracking-wide">Seller</div>
              {contract.sellerSignedAt
                ? <div className="text-xs text-emerald-700 mt-1 font-medium">✓ Signed {fmtDate(contract.sellerSignedAt)}</div>
                : <div className="text-xs text-stone-400 mt-1">I am selling the horse</div>
              }
            </button>

            <button
              type="button"
              onClick={() => setRole("buyer")}
              className={`group border-2 rounded-xl p-6 text-center transition-all cursor-pointer
                ${contract.buyerSignedAt
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-[#24384e]/30 hover:border-[#24384e] hover:bg-[#24384e]/5"
                }`}
            >
              <div className="text-3xl mb-2">🐴</div>
              <div className="font-bold text-[#24384e] text-sm uppercase tracking-wide">Buyer</div>
              {contract.buyerSignedAt
                ? <div className="text-xs text-emerald-700 mt-1 font-medium">✓ Signed {fmtDate(contract.buyerSignedAt)}</div>
                : <div className="text-xs text-stone-400 mt-1">I am purchasing the horse</div>
              }
            </button>
          </div>

          <p className="text-xs text-stone-400">
            Each party signs separately. The same link is used by both.
          </p>
        </div>
      </div>
    </div>
  );

  // ── Already Signed (this party already signed) ────────────────────────────

  const thisPartySignedAt = role === "seller" ? contract.sellerSignedAt : contract.buyerSignedAt;
  if (thisPartySignedAt) return (
    <div className="min-h-screen bg-[#f0ede8] flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-10 max-w-lg text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-[#24384e]">Already Signed</h1>
        <p className="text-stone-600 leading-relaxed">
          The {role} has already signed this contract on {fmtDatetime(thisPartySignedAt)}.
        </p>
        {(role === "seller" ? !contract.buyerSignedAt : !contract.sellerSignedAt) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            Waiting for the {role === "seller" ? "buyer" : "seller"} to sign.
          </div>
        )}
        <button type="button" onClick={() => setRole(null)} className="text-sm text-[#24384e] underline">
          ← Back to role selection
        </button>
      </div>
    </div>
  );

  // ── Signing Form ───────────────────────────────────────────────────────────

  const otherSignedAt = role === "seller" ? contract.buyerSignedAt : contract.sellerSignedAt;
  const otherName = role === "seller" ? contract.buyerName : contract.sellerName;

  return (
    <div className="min-h-screen bg-[#f0ede8]">
      {/* Header */}
      <div className="bg-[#24384e] text-white px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <button type="button" onClick={() => setRole(null)} className="text-white/60 hover:text-white text-sm underline">← Change role</button>
          </div>
          <h1 className="text-2xl font-bold">Contract of Sale</h1>
          <p className="text-white/70 mt-1 text-sm">
            You are signing as: <strong className="text-white capitalize">{role}</strong> — {contract.horseName}
          </p>
          <div className="mt-4 inline-block bg-white/10 rounded px-4 py-2">
            <span className="text-white font-semibold text-lg">{contract.horseName}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Other party signed banner */}
        {otherSignedAt && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-emerald-800">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <span>
              The <strong>{role === "seller" ? "buyer" : "seller"}</strong>
              {otherName ? ` (${otherName})` : ""} has already signed on {fmtDatetime(otherSignedAt)}. Please complete your section below.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Intro */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-stone-600 leading-relaxed">
              This form acknowledges the horse description, the terms under which it is sold and, once payment has cleared, transfers ownership to the buyer.
              The form is signed electronically by both the buyer and seller — each party signs separately.
              A PDF copy will be forwarded to both parties once fully signed.
            </p>
          </div>

          {/* ── Parties ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <SectionHeading title="Parties to the Contract" />

            {/* THIS party — editable */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#24384e] uppercase tracking-wide border-b border-stone-200 pb-2">
                Your Details ({role === "seller" ? "Seller" : "Buyer"})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">Full name <span className="text-red-500">*</span></label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                    placeholder="Your full legal name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                    placeholder="your@email.com" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-stone-700">Address</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                    placeholder="Street, suburb, state, postcode" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">Phone number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                    placeholder="04xx xxx xxx" />
                </div>
              </div>
            </div>

            {/* Seller bank details — editable if seller, read-only if buyer */}
            {role === "seller" && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium text-stone-700">Your Bank Details <span className="text-stone-400 text-xs font-normal">(for buyer payment reference)</span></p>
                <div className="bg-[#24384e]/5 border border-[#24384e]/20 rounded-lg p-4 space-y-1.5">
                  <p className="text-xs text-stone-500 mb-2">These were pre-filled by your agent. If any are incorrect, please contact them directly.</p>
                  {contract.sellerBankAccountName && <ReadOnlyField label="Account name" value={contract.sellerBankAccountName} />}
                  {contract.sellerBankBsb && <ReadOnlyField label="BSB" value={contract.sellerBankBsb} />}
                  {contract.sellerBankAccount && <ReadOnlyField label="Account number" value={contract.sellerBankAccount} />}
                  {!contract.sellerBankAccountName && !contract.sellerBankBsb && !contract.sellerBankAccount && (
                    <p className="text-sm text-stone-400 italic">Bank details to be confirmed by your agent</p>
                  )}
                </div>
              </div>
            )}

            {/* OTHER party — read-only */}
            {(role === "seller" ? contract.buyerName || contract.buyerEmail : contract.sellerName || contract.sellerEmail) ? (
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wide">
                  {role === "seller" ? "Buyer" : "Seller"} Details <span className="text-xs font-normal text-stone-400">(pre-filled)</span>
                </h3>
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-2">
                  {role === "seller" ? (
                    <>
                      <ReadOnlyField label="Buyer name" value={contract.buyerName} />
                      <ReadOnlyField label="Email" value={contract.buyerEmail} />
                      <ReadOnlyField label="Address" value={contract.buyerAddress} />
                      <ReadOnlyField label="Phone" value={contract.buyerPhone} />
                    </>
                  ) : (
                    <>
                      <ReadOnlyField label="Seller name" value={contract.sellerName} />
                      <ReadOnlyField label="Email" value={contract.sellerEmail} />
                      <ReadOnlyField label="Address" value={contract.sellerAddress} />
                      <ReadOnlyField label="Phone" value={contract.sellerPhone} />
                      {(contract.sellerBankAccountName || contract.sellerBankBsb || contract.sellerBankAccount) && (
                        <div className="pt-2 border-t border-stone-200 space-y-1.5">
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Payment to Seller</p>
                          <ReadOnlyField label="Account name" value={contract.sellerBankAccountName} />
                          <ReadOnlyField label="BSB" value={contract.sellerBankBsb} />
                          <ReadOnlyField label="Account number" value={contract.sellerBankAccount} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Section 1a: Sales Price ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <SectionHeading num="1a" title="Sales Price" />
            {contract.salesPrice && (
              <div className="bg-[#24384e]/5 border border-[#24384e]/20 rounded-lg p-4 text-center">
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Agreed Sale Price</p>
                <p className="text-3xl font-bold text-[#24384e]">{contract.salesPrice}</p>
              </div>
            )}
            <p className="text-sm text-stone-600 leading-relaxed">
              In consideration of the following sum, once paid and 'cleared' into the seller's bank account, the Seller hereby sells to the Purchaser the animal described in Section 2.
            </p>
            {role === "seller" && (
              <AgreementBox id="agreedSalesPrice" checked={agreedSalesPrice} onChange={setAgreedSalesPrice}>
                I agree to the sales price stated above.
              </AgreementBox>
            )}
          </div>

          {/* ── Holding Deposit ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <SectionHeading title="Holding Deposit Terms" />
            {contract.holdingDepositAmount && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm font-semibold text-amber-800">
                Holding deposit due today: {contract.holdingDepositAmount}
                <div className="text-xs font-normal mt-0.5 text-amber-700">As per our terms — 10% or minimum $1,000, whichever is higher</div>
              </div>
            )}
            <div className="text-sm text-stone-600 leading-relaxed space-y-3">
              <p className="font-medium">Holding deposits are refundable if:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>the horse is found to be 'not fit for the purpose intended'; lame; and/or 'moderate to high risk for the intended purpose' by a vet, and this is recorded in writing on a formal vet check and the vet check and x-rays are forwarded to the seller for confirmation; and/or</li>
                <li>the horse is not 'as described' in this contract, at the second viewing.</li>
              </ul>
              <p>Remaining payment {contract.salesPrice ? `of the agreed balance` : ""} due within 24 hours of receiving the vet check report, if the potential buyer chooses to proceed — or, if vetting is not taking place, within 24 hours of the deposit being paid.</p>
            </div>
            {role === "buyer" && (
              <AgreementBox id="agreedHoldingDeposit" checked={agreedHoldingDeposit} onChange={setAgreedHoldingDeposit}>
                I agree to the holding deposit terms stated above.
              </AgreementBox>
            )}
          </div>

          {/* ── Section 2: Horse Description ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <SectionHeading num="2" title="Horse Name and Description" />
            <div className="font-semibold text-lg text-[#24384e]">{contract.horseName}</div>
            {contract.horseDescription && (
              <div className="bg-stone-50 border border-stone-200 rounded p-4 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                {contract.horseDescription}
              </div>
            )}
            <AgreementBox id="agreedDescription" checked={agreedDescription} onChange={setAgreedDescription}>
              I declare that this description accurately represents the horse that is being sold / purchased.
            </AgreementBox>
          </div>

          {/* ── Section 3: Warranties ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <SectionHeading num="3" title="Warranties & Conditions of Sale" />
            <div className="text-sm text-stone-600 leading-relaxed space-y-3">
              <p>The Seller warrants that (1) the Seller is the legal owner of the Animal; (2) the Animal is free from all liens and encumbrances; (3) the Seller has full right and authority to sell and transfer the Animal; and (4) the Seller will warrant and defend the title of the Animal against any and all claims and demands of all persons.</p>
              <p>The Animal is being sold in an 'as is' condition and the Seller expressly disclaims all warranties, whether expressed or implied.</p>
              <p>The Purchaser has been given the opportunity to have a pre-purchase examination performed by a veterinarian of the Purchaser's choice at the Purchaser's expense prior to the execution of this Bill of Sale.</p>
              <p>The Purchaser has been given the opportunity to inspect the Animal or to have it inspected and the Purchaser has accepted the Animal in its existing condition. This Bill of Sale will be construed in accordance with and governed by the laws of the Commonwealth of Australia.</p>
            </div>
            <AgreementBox id="agreedSection3" checked={agreedSection3} onChange={setAgreedSection3}>
              I agree to the warranties and conditions of sale stated above.
            </AgreementBox>
          </div>

          {/* ── Section 4: Additional Clauses ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <SectionHeading num="4" title="Additional Clauses" />
            <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
              <div><span className="font-semibold text-stone-800">Clause 1:</span> The horse is presented and described by the seller; purchased directly from the seller; and payment is made directly to the seller.</div>
              <div><span className="font-semibold text-stone-800">Clause 2:</span> Once paid for, the horse becomes the responsibility of the buyer. This includes but is not limited to financial responsibility, third party liability, vet and feed bills.</div>
              <div><span className="font-semibold text-stone-800">Clause 3:</span> The horse will stay at the seller's property under an 'agistment' arrangement until the buyer can organise transport. Depending on the length of time and individual situation, this arrangement may attract fees at market rates.</div>
              {contract.customClauses && (
                <div><span className="font-semibold text-stone-800">Additional terms:</span> {contract.customClauses}</div>
              )}
            </div>
            <AgreementBox id="agreedSection4" checked={agreedSection4} onChange={setAgreedSection4}>
              I agree to the additional clauses stated above.
            </AgreementBox>
          </div>

          {/* ── Declaration & Signature ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">
            <SectionHeading title={role === "seller" ? "Seller's Declaration & Signature" : "Buyer's Declaration & Signature"} />

            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-sm text-stone-600 leading-relaxed">
              {role === "seller" ? (
                <><span className="font-semibold text-stone-800">Seller's Declaration: </span>
                  I declare that I am over the age of 18; I am legally responsible for the sale of this horse and am legally entitled to receive the funds for this sale. I declare that I transfer the ownership of this horse to the buyer listed, once funds have cleared.</>
              ) : (
                <><span className="font-semibold text-stone-800">Buyer's Declaration: </span>
                  I declare that I am over the age of 18 and I am legally responsible for the decisions regarding the assessment and purchase of this horse. I declare that I am able to complete this sale financially and have the ability and funds to look after this horse whilst under my ownership.</>
              )}
            </div>

            {role === "seller" ? (
              <AgreementBox id="agreedSellerDeclaration" checked={agreedSellerDeclaration} onChange={setAgreedSellerDeclaration}>
                I agree to the Seller's Declaration above.
              </AgreementBox>
            ) : (
              <AgreementBox id="agreedBuyerDeclaration" checked={agreedBuyerDeclaration} onChange={setAgreedBuyerDeclaration}>
                I agree to the Buyer's Declaration above.
              </AgreementBox>
            )}

            <div>
              <p className="text-sm font-medium text-stone-700 mb-2">Your Signature <span className="text-red-500">*</span></p>
              <SignatureCanvas onChange={setSignature} />
            </div>
          </div>

          {/* Error */}
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {formError}
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full bg-[#24384e] hover:bg-[#1a2d3f] disabled:opacity-60 text-white font-semibold py-4 rounded-lg text-base transition-colors">
            {submitting ? "Submitting…" : `Submit as ${role === "seller" ? "Seller" : "Buyer"}`}
          </button>

          <p className="text-center text-xs text-stone-400 pb-8">
            By submitting you agree to the terms set out above. This submission is timestamped and constitutes your electronic signature.
          </p>

        </form>
      </div>
    </div>
  );
}
