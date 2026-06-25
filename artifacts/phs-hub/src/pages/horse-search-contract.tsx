import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "wouter";

const API_BASE = "/api";

// ─── Signature Canvas ─────────────────────────────────────────────────────────

function SignatureCanvas({ label, onChange }: { label: string; onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e: { clientX: number; clientY: number }, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
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
      <div className="text-sm font-medium text-[#24384e]">{label}</div>
      <div className="border-2 border-dashed border-stone-300 rounded-lg bg-white relative">
        <canvas ref={canvasRef} width={600} height={150}
          className="w-full touch-none rounded-lg cursor-crosshair"
          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
          onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-stone-400 text-sm">Sign here</span>
          </div>
        )}
      </div>
      {hasSignature && <button onClick={clear} type="button" className="text-xs text-stone-500 hover:text-red-600 underline">Clear signature</button>}
    </div>
  );
}

function AgreementBox({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
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
      {num && <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-[#24384e]/10 text-[#24384e] text-xs font-bold shrink-0">{num}</span>}
      <h2 className="text-sm font-bold tracking-widest uppercase text-[#24384e]">{title}</h2>
      <div className="flex-1 h-px bg-stone-200" />
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm focus:border-[#24384e] focus:outline-none focus:ring-1 focus:ring-[#24384e]" />
    </div>
  );
}

function FieldArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
        className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm focus:border-[#24384e] focus:outline-none focus:ring-1 focus:ring-[#24384e] resize-y" />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface SearchContract {
  id: number; token: string; status: string;
  horseName: string;
  salesPrice?: string; holdingDepositAmount?: string;
  horseDescription?: string; customClauses?: string;
  sellerName?: string; sellerEmail?: string; sellerAddress?: string; sellerPhone?: string;
  sellerBankAccountName?: string; sellerBankBsb?: string; sellerBankAccount?: string;
  buyerName?: string; buyerEmail?: string; buyerAddress?: string; buyerPhone?: string;
  submittedAt?: string;
}

export default function HorseSearchContractPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [contract, setContract] = useState<SearchContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [fillerName, setFillerName] = useState("");
  const [fillerEmail, setFillerEmail] = useState("");
  const [fillerRole, setFillerRole] = useState("buyer");
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerSignature, setBuyerSignature] = useState<string | null>(null);
  const [sellerSignature, setSellerSignature] = useState<string | null>(null);

  const [agreedSalesPrice, setAgreedSalesPrice] = useState(false);
  const [agreedHoldingDeposit, setAgreedHoldingDeposit] = useState(false);
  const [agreedDescription, setAgreedDescription] = useState(false);
  const [agreedSection3, setAgreedSection3] = useState(false);
  const [agreedSection4, setAgreedSection4] = useState(false);
  const [agreedSellerDeclaration, setAgreedSellerDeclaration] = useState(false);
  const [agreedBuyerDeclaration, setAgreedBuyerDeclaration] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/horse-search-contract/${token}`)
      .then(async r => {
        if (r.status === 410) { setError("This contract link has been voided."); return; }
        if (!r.ok) { setError("Contract not found."); return; }
        const d = await r.json();
        setContract(d);
        setSellerName(d.sellerName || ""); setSellerEmail(d.sellerEmail || "");
        setSellerAddress(d.sellerAddress || ""); setSellerPhone(d.sellerPhone || "");
        setBuyerName(d.buyerName || ""); setBuyerEmail(d.buyerEmail || "");
        setBuyerAddress(d.buyerAddress || ""); setBuyerPhone(d.buyerPhone || "");
        if (d.status === "submitted") setSubmitted(true);
      })
      .catch(() => setError("Failed to load the contract. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    const allAgreed = agreedSalesPrice && agreedHoldingDeposit && agreedDescription && agreedSection3 && agreedSection4 &&
      (fillerRole === "seller" ? agreedSellerDeclaration : fillerRole === "buyer" ? agreedBuyerDeclaration : agreedSellerDeclaration && agreedBuyerDeclaration);
    if (!allAgreed) { setValidationError("Please check all agreement boxes before submitting."); return; }
    if (!buyerSignature && !sellerSignature) { setValidationError("At least one signature is required."); return; }
    if (!fillerName.trim()) { setValidationError("Please enter your full name in the 'I am completing this form' section."); return; }
    setValidationError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/horse-search-contract/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fillerName, fillerEmail, fillerRole,
          sellerName, sellerEmail, sellerAddress, sellerPhone,
          buyerName, buyerEmail, buyerAddress, buyerPhone,
          buyerSignature, sellerSignature,
          agreedSalesPrice, agreedHoldingDeposit, agreedDescription,
          agreedSection3, agreedSection4, agreedSellerDeclaration, agreedBuyerDeclaration,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Submission failed");
      }
      setSubmitted(true);
    } catch (e: any) {
      setValidationError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-stone-400 text-sm">Loading…</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-lg font-bold text-stone-800 mb-2">Contract Unavailable</h1>
        <p className="text-stone-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-emerald-200 p-8 text-center shadow-sm">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-emerald-800 mb-2">Contract Submitted</h1>
        <p className="text-stone-600 text-sm leading-relaxed">Thank you. The Bill of Sale for <strong>{contract?.horseName}</strong> has been signed and submitted. You can close this window.</p>
      </div>
    </div>
  );

  const holdingText = contract?.holdingDepositAmount
    ? `Holding deposit due today: ${contract.holdingDepositAmount}`
    : "A holding deposit is required — 10% or minimum $1,000, whichever is higher.";

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="bg-[#24384e] text-white py-8 px-4 text-center">
        <h1 className="text-xl sm:text-2xl font-bold">Performance Horse Sales</h1>
        <p className="text-white/70 text-sm mt-1">Bill of Sale — {contract?.horseName}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Horse & Price */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading num="1" title="Sale Details" />
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-[#24384e]">{contract?.horseName}</div>
            {contract?.salesPrice && (
              <div className="mt-3 inline-block bg-stone-50 border border-stone-200 rounded-lg px-5 py-3">
                <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Agreed Sale Price</div>
                <div className="text-2xl font-bold text-[#24384e]">{contract.salesPrice}</div>
              </div>
            )}
          </div>
          {contract?.holdingDepositAmount && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm font-semibold text-amber-800">{holdingText}</div>
          )}
          <p className="text-sm text-stone-600 mt-3 leading-relaxed">In consideration of the following sum, once paid and cleared into the seller's bank account, the Seller hereby sells to the Purchaser the horse described below.</p>
        </div>

        {/* Holding Deposit Terms */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Holding Deposit Terms" />
          <div className="text-sm text-stone-700 space-y-3 leading-relaxed">
            <p><strong>Holding deposits are refundable if:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>the horse is found to be 'not fit for the purpose intended'; lame; and/or 'moderate to high risk for the intended purpose' by a vet, recorded in writing on a formal vet check; and/or</li>
              <li>the horse is not 'as described' in this contract, at the second viewing.</li>
            </ul>
            <p>Remaining payment due within 24 hours of receiving the vet check report (if proceeding), or within 24 hours of the deposit being paid if no vetting is taking place.</p>
            <p><strong>Please note:</strong> until the deposit has been paid, the horse will continue to be actively marketed. Once fully paid for, the horse will be marked as sold.</p>
          </div>
        </div>

        {/* Horse Name & Description */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading num="2" title="Horse Name and Description" />
          <div className="text-xl font-bold text-[#24384e] mb-3">{contract?.horseName}</div>
          {contract?.horseDescription ? (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap mb-4">{contract.horseDescription}</div>
          ) : (
            <p className="text-sm text-stone-400 italic mb-4">No description provided — please refer to the horse's portfolio.</p>
          )}
          <AgreementBox id="agreedDescription" checked={agreedDescription} onChange={setAgreedDescription}>
            I declare that this description accurately represents the horse that is being sold / purchased.
          </AgreementBox>
        </div>

        {/* Warranties */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading num="3" title="Warranties & Conditions of Sale" />
          <div className="text-sm text-stone-700 space-y-3 leading-relaxed">
            <p>The Seller warrants that (1) the Seller is the legal owner of the Animal; (2) the Animal is free from all liens and encumbrances; (3) the Seller has full right and authority to sell and transfer the Animal.</p>
            <p>The Animal is being sold in an 'as is' condition and the Seller expressly disclaims all warranties. The Purchaser has been given the opportunity to have a pre-purchase examination performed by a veterinarian of the Purchaser's choice at the Purchaser's expense.</p>
            <p>In the event that the Purchaser elects not to have a veterinarian perform a pre-purchase examination, the Purchaser waives any and all rights or claims against the Seller for any defects pertaining to the Animal.</p>
          </div>
        </div>

        {/* Additional Clauses */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading num="4" title="Additional Clauses" />
          <div className="text-sm text-stone-700 space-y-3 leading-relaxed">
            <p><strong>Clause 1:</strong> The horse is presented and described by the seller; purchased directly from the seller; and payment is made directly to the seller.</p>
            <p><strong>Clause 2:</strong> Once paid for, the horse becomes the responsibility of the buyer. This includes but is not limited to financial responsibility, third party liability, vet and feed bills. It is highly recommended that the buyer insure the horse as soon as possible.</p>
            <p><strong>Clause 3:</strong> The horse will stay at the seller's property under an 'agistment' arrangement until the buyer can organise transport. Depending on the length of time and individual situation, this arrangement may attract fees at market rates.</p>
            {contract?.customClauses && <p><strong>Additional clause:</strong> {contract.customClauses}</p>}
          </div>
        </div>

        {/* Parties */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Parties to the Contract" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wide text-[#24384e]">The Seller</div>
              <FieldInput label="Seller full name" value={sellerName} onChange={setSellerName} />
              <FieldInput label="Seller email" value={sellerEmail} onChange={setSellerEmail} type="email" />
              <FieldInput label="Seller phone" value={sellerPhone} onChange={setSellerPhone} type="tel" />
              <FieldArea label="Seller address" value={sellerAddress} onChange={setSellerAddress} />
              {(contract?.sellerBankAccountName || contract?.sellerBankBsb || contract?.sellerBankAccount) && (
                <div className="pt-2 border-t border-stone-100 space-y-1">
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Seller's Bank Details</div>
                  {contract.sellerBankAccountName && <div className="text-sm text-stone-700">Account: {contract.sellerBankAccountName}</div>}
                  {contract.sellerBankBsb && <div className="text-sm text-stone-700">BSB: {contract.sellerBankBsb}</div>}
                  {contract.sellerBankAccount && <div className="text-sm text-stone-700">Account #: {contract.sellerBankAccount}</div>}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wide text-[#24384e]">The Buyer</div>
              <FieldInput label="Buyer full name" value={buyerName} onChange={setBuyerName} />
              <FieldInput label="Buyer email" value={buyerEmail} onChange={setBuyerEmail} type="email" />
              <FieldInput label="Buyer phone" value={buyerPhone} onChange={setBuyerPhone} type="tel" />
              <FieldArea label="Buyer address" value={buyerAddress} onChange={setBuyerAddress} />
            </div>
          </div>
        </div>

        {/* Declarations */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading num="5" title="Declarations" />
          <div className="space-y-3">
            <AgreementBox id="agreedSalesPrice" checked={agreedSalesPrice} onChange={setAgreedSalesPrice}>
              I agree to the sale price of <strong>{contract?.salesPrice || "as agreed"}</strong>.
            </AgreementBox>
            <AgreementBox id="agreedHoldingDeposit" checked={agreedHoldingDeposit} onChange={setAgreedHoldingDeposit}>
              I understand and agree to the holding deposit terms set out in this contract.
            </AgreementBox>
            <AgreementBox id="agreedSection3" checked={agreedSection3} onChange={setAgreedSection3}>
              I have read and agree to the Warranties & Conditions of Sale in Section 3.
            </AgreementBox>
            <AgreementBox id="agreedSection4" checked={agreedSection4} onChange={setAgreedSection4}>
              I have read and agree to the Additional Clauses in Section 4.
            </AgreementBox>
            {(!fillerRole || fillerRole === "seller") && (
              <AgreementBox id="agreedSellerDeclaration" checked={agreedSellerDeclaration} onChange={setAgreedSellerDeclaration}>
                <strong>Seller's Declaration:</strong> I declare that I am over 18; I am legally responsible for the sale of this horse and am legally entitled to receive the funds. I transfer ownership once funds have cleared.
              </AgreementBox>
            )}
            {(!fillerRole || fillerRole === "buyer") && (
              <AgreementBox id="agreedBuyerDeclaration" checked={agreedBuyerDeclaration} onChange={setAgreedBuyerDeclaration}>
                <strong>Buyer's Declaration:</strong> I declare that I am over 18 and am legally responsible for the assessment and purchase of this horse. I am able to complete this sale financially and look after this horse under my ownership.
              </AgreementBox>
            )}
          </div>
        </div>

        {/* Who is signing */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="I am completing this form as…" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FieldInput label="Your full name *" value={fillerName} onChange={setFillerName} />
            <FieldInput label="Your email" value={fillerEmail} onChange={setFillerEmail} type="email" />
          </div>
          <div className="flex gap-4">
            {["buyer", "seller"].map(role => (
              <label key={role} className={`flex-1 flex items-center gap-3 cursor-pointer rounded-lg border-2 p-3 transition-all ${fillerRole === role ? "border-[#24384e] bg-[#24384e]/5" : "border-stone-200"}`}>
                <input type="radio" name="fillerRole" value={role} checked={fillerRole === role} onChange={() => setFillerRole(role)}
                  className="h-4 w-4 accent-[#24384e]" />
                <span className="text-sm font-medium capitalize">{role}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Signatures */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Signatures" />
          <div className="space-y-6">
            <SignatureCanvas label="Seller's Signature" onChange={setSellerSignature} />
            <SignatureCanvas label="Buyer's Signature" onChange={setBuyerSignature} />
          </div>
        </div>

        {/* Error & Submit */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{validationError}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 rounded-xl bg-[#24384e] text-white font-semibold text-sm hover:bg-[#1a2d3f] disabled:opacity-50 transition-colors shadow-sm"
        >
          {submitting ? "Submitting…" : "Sign & Submit Bill of Sale"}
        </button>

        <p className="text-center text-xs text-stone-400 pb-8">
          Questions? Call <a href="tel:0428239317" className="text-[#24384e] font-medium">0428 239 317</a>
        </p>
      </div>
    </div>
  );
}
