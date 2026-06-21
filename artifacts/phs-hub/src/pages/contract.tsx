import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "wouter";

const API_BASE = "/api";

// ─── Signature Canvas ────────────────────────────────────────────────────────

function SignatureCanvas({ label, onChange }: { label: string; onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e: { clientX: number; clientY: number }, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    isDrawingRef.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = "touches" in e ? getPos(e.touches[0], canvas) : getPos(e.nativeEvent as MouseEvent, canvas);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = "touches" in e ? getPos(e.touches[0], canvas) : getPos(e.nativeEvent as MouseEvent, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }, []);

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHasSignature(true);
    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-[#24384e]">{label}</div>
      <div className="border-2 border-dashed border-stone-300 rounded-lg bg-white relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          className="w-full touch-none rounded-lg cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-stone-400 text-sm">Sign here</span>
          </div>
        )}
      </div>
      {hasSignature && (
        <button onClick={clear} type="button" className="text-xs text-stone-500 hover:text-red-600 underline">
          Clear signature
        </button>
      )}
    </div>
  );
}

// ─── Agreement Checkbox ──────────────────────────────────────────────────────

function AgreementBox({ id, checked, onChange, children }: {
  id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer bg-[#24384e]/5 border border-[#24384e]/20 rounded-lg p-4">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 rounded border-stone-400 shrink-0 accent-[#24384e]"
      />
      <span className="text-sm text-stone-700 leading-snug font-medium">{children}</span>
    </label>
  );
}

// ─── Section Heading ─────────────────────────────────────────────────────────

function SectionHeading({ num, title }: { num?: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {num && (
        <span className="bg-[#24384e] text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shrink-0">
          {num}
        </span>
      )}
      <h2 className="text-base font-bold text-[#24384e] uppercase tracking-wide">{title}</h2>
    </div>
  );
}

// ─── Contract Page ───────────────────────────────────────────────────────────

interface ContractData {
  id: number;
  token: string;
  status: string;
  horseName: string;
  salesPrice: string | null;
  holdingDepositAmount: string | null;
  horseDescription: string | null;
  customClauses: string | null;
  submittedAt: string | null;
  sellerName: string | null;
  sellerEmail: string | null;
  sellerAddress: string | null;
  sellerPhone: string | null;
  sellerBankAccountName: string | null;
  sellerBankBsb: string | null;
  sellerBankAccount: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerAddress: string | null;
  buyerPhone: string | null;
}

export default function ContractPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fillerName, setFillerName] = useState("");
  const [fillerEmail, setFillerEmail] = useState("");
  const [fillerRole, setFillerRole] = useState<"buyer" | "seller" | "">("");
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
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/contract/${token}`)
      .then(async (res) => {
        if (res.status === 410) { setError("This contract link has been voided. Please contact Performance Horse Sales."); return; }
        if (res.status === 404) { setError("This contract link is not valid. Please check the link and try again."); return; }
        if (!res.ok) { setError("Something went wrong. Please try again later."); return; }
        const data = await res.json();
        setContract(data);
        if (data.status === "submitted") setSubmitted(true);
        if (data.sellerName) setSellerName(data.sellerName);
        if (data.sellerEmail) setSellerEmail(data.sellerEmail);
        if (data.sellerAddress) setSellerAddress(data.sellerAddress);
        if (data.sellerPhone) setSellerPhone(data.sellerPhone);
        if (data.buyerName) setBuyerName(data.buyerName);
        if (data.buyerEmail) setBuyerEmail(data.buyerEmail);
        if (data.buyerAddress) setBuyerAddress(data.buyerAddress);
        if (data.buyerPhone) setBuyerPhone(data.buyerPhone);
      })
      .catch(() => setError("Unable to load the contract. Please check your connection and try again."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fillerName.trim()) return setFormError("Please enter your name.");
    if (!fillerEmail.trim()) return setFormError("Please enter your email address.");
    if (!fillerRole) return setFormError("Please select your role (Buyer or Seller).");
    if (!buyerName.trim()) return setFormError("Please enter the buyer's full name.");
    if (!sellerName.trim()) return setFormError("Please enter the seller's full name.");
    if (!agreedSalesPrice) return setFormError("Please agree to the sales price in Section 1a.");
    if (!agreedHoldingDeposit) return setFormError("Please agree to the holding deposit terms.");
    if (!agreedDescription) return setFormError("Please declare the horse description is accurate in Section 2.");
    if (!agreedSection3) return setFormError("Please agree to the warranties in Section 3.");
    if (!agreedSection4) return setFormError("Please agree to the additional clauses in Section 4.");
    if (!agreedSellerDeclaration) return setFormError("Please agree to the Seller's Declaration.");
    if (!agreedBuyerDeclaration) return setFormError("Please agree to the Buyer's Declaration.");

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/contract/${token}/submit`, {
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
      const data = await res.json();
      if (!res.ok) return setFormError(data.error ?? "Submission failed. Please try again.");
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0ede8] flex items-center justify-center">
        <div className="text-stone-500">Loading contract…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0ede8] flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center space-y-3">
          <div className="text-2xl font-bold text-[#24384e]">Contract of Sale</div>
          <div className="text-red-700 font-medium">{error}</div>
          <p className="text-sm text-stone-500">If you believe this is an error, please contact the agent.</p>
        </div>
      </div>
    );
  }

  if (!contract) return null;

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f0ede8] flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-10 max-w-lg text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-[#24384e]">Contract Submitted</h1>
          <p className="text-stone-600 leading-relaxed">
            Thank you — the Contract of Sale for <strong>{contract.horseName}</strong> has been successfully submitted.
          </p>
          <p className="text-sm text-stone-500">
            Please contact your agent if you have any questions.
          </p>
        </div>
      </div>
    );
  }

  const holdingText = contract.holdingDepositAmount
    ? `10% Holding deposit due today: ${contract.holdingDepositAmount}`
    : "A holding deposit may be required as agreed between the parties.";

  return (
    <div className="min-h-screen bg-[#f0ede8]">

      {/* Header */}
      <div className="bg-[#24384e] text-white px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold">Contract of Sale</h1>
          <p className="text-white/70 mt-1 text-sm">
            This form acknowledges the horse description, the terms of sale, and once payment has cleared, transfers ownership to the buyer.
          </p>
          <div className="mt-4 inline-block bg-white/10 rounded px-4 py-2">
            <span className="text-white font-semibold text-lg">{contract.horseName}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Parties ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <p className="text-sm text-stone-500 leading-relaxed">
              This form acknowledges the horse description, the terms under which it is sold and, once payment has cleared, transfers ownership to the buyer. The form will be filled in and signed electronically, by both the buyer and seller. A PDF copy will then be forwarded to both parties.
            </p>

            {/* Seller */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#24384e] uppercase tracking-wide border-b border-stone-200 pb-2">The Seller</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">Seller's full name <span className="text-red-500">*</span></label>
                  <input type="text" value={sellerName} onChange={(e) => setSellerName(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                    placeholder="Full legal name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">Seller's email</label>
                  <input type="email" value={sellerEmail} onChange={(e) => setSellerEmail(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                    placeholder="seller@email.com" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-stone-700">Address</label>
                  <input type="text" value={sellerAddress} onChange={(e) => setSellerAddress(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                    placeholder="Street, suburb, state, postcode" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">Phone number</label>
                  <input type="tel" value={sellerPhone} onChange={(e) => setSellerPhone(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                    placeholder="04xx xxx xxx" />
                </div>
              </div>
              {/* Bank details */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-stone-700">Seller's bank details</p>
                <div className="bg-[#24384e]/5 border border-[#24384e]/20 rounded-lg p-4 space-y-1.5">
                  <p className="text-xs text-stone-500 mb-2">Payment to be made to:</p>
                  {contract.sellerBankAccountName && <p className="text-sm text-stone-700"><span className="font-medium">Account name:</span> {contract.sellerBankAccountName}</p>}
                  {contract.sellerBankBsb && <p className="text-sm text-stone-700"><span className="font-medium">BSB:</span> {contract.sellerBankBsb}</p>}
                  {contract.sellerBankAccount && <p className="text-sm text-stone-700"><span className="font-medium">Acc:</span> {contract.sellerBankAccount}</p>}
                  {!contract.sellerBankAccountName && !contract.sellerBankBsb && !contract.sellerBankAccount && (
                    <p className="text-sm text-stone-400 italic">Bank details to be confirmed</p>
                  )}
                </div>
              </div>
            </div>

            {/* Buyer */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#24384e] uppercase tracking-wide border-b border-stone-200 pb-2">The Buyer</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">Buyer's full name <span className="text-red-500">*</span></label>
                  <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                    placeholder="Full legal name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">Buyer's email</label>
                  <input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                    placeholder="buyer@email.com" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-stone-700">Address</label>
                  <input type="text" value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                    placeholder="Street, suburb, state, postcode" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">Phone number</label>
                  <input type="tel" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                    placeholder="04xx xxx xxx" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Person filling in this form ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">
            <SectionHeading title="Person Completing This Form" />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Name of person filling in this form <span className="text-red-500">*</span></label>
              <input
                type="text" required value={fillerName} onChange={(e) => setFillerName(e.target.value)}
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Email address <span className="text-red-500">*</span></label>
              <input
                type="email" required value={fillerEmail} onChange={(e) => setFillerEmail(e.target.value)}
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#24384e]"
                placeholder="your@email.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Person filling in this form is the: <span className="text-red-500">*</span></label>
              <div className="flex gap-4">
                {(["buyer", "seller"] as const).map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="role" value={role} checked={fillerRole === role} onChange={() => setFillerRole(role)} className="accent-[#24384e]" />
                    <span className="text-sm text-stone-700 capitalize">{role}</span>
                  </label>
                ))}
              </div>
            </div>
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
              In consideration of the following sum, once paid and 'cleared' into the seller's bank account,
              the Seller hereby sells to the Purchaser the animal described in Section 2.
            </p>
            <AgreementBox id="agreedSalesPrice" checked={agreedSalesPrice} onChange={setAgreedSalesPrice}>
              I agree to the sales price stated above.
            </AgreementBox>
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
              <p>
                Remaining payment{contract.salesPrice ? <> of <strong>{contract.salesPrice}</strong> less holding deposit</> : " of the agreed balance"} due within 24 hours of receiving the vet check report, if the potential buyer chooses to proceed with the sale — or, if vetting is not taking place, within 24 hours of the deposit being paid.
              </p>
              <p className="font-medium">Please note:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>until the deposit has been paid, viewings will still take place and the horse will continue to be actively marketed;</li>
                <li>once the deposit has been paid, the horse will be 'held' for the buyer as per our terms re vetting etc; and</li>
                <li>once fully paid for, the horse will be marked as sold.</li>
              </ul>
            </div>
            <AgreementBox id="agreedHoldingDeposit" checked={agreedHoldingDeposit} onChange={setAgreedHoldingDeposit}>
              I agree to the holding deposit terms stated above.
            </AgreementBox>
          </div>

          {/* ── Section 2: Horse Description ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <SectionHeading num="2" title="Horse Name and Description" />
            <p className="text-sm text-stone-500 italic">As per portfolio / advertisement.</p>
            {contract.horseDescription ? (
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                {contract.horseDescription}
              </div>
            ) : (
              <p className="text-sm text-stone-400 italic">Please refer to the horse's portfolio for the full description.</p>
            )}
            <p className="text-sm text-stone-600">
              Please see the Owner's Response Certificate, in the horse's portfolio, for more detailed information.
            </p>
            <AgreementBox id="agreedDescription" checked={agreedDescription} onChange={setAgreedDescription}>
              I declare that this description accurately represents the horse that is being sold / purchased.
            </AgreementBox>
          </div>

          {/* ── Section 3: Warranties ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <SectionHeading num="3" title="Warranties & Conditions of Sale" />
            <div className="text-sm text-stone-600 leading-relaxed space-y-3">
              <p>The Seller warrants that (1) the Seller is the legal owner of the Animal; (2) the Animal is free from all liens and encumbrances; (3) the Seller has full right and authority to sell and transfer the Animal; and (4) the Seller will warrant and defend the title of the Animal against any and all claims and demands of all persons.</p>
              <p>The Animal is being sold in an 'as is' condition and the Seller expressly disclaims all warranties, whether expressed or implied. Further, the Seller disclaims any warranty as to the condition of the Animal.</p>
              <p>The Purchaser has been given the opportunity to have a pre-purchase examination performed by a veterinarian of the Purchaser's choice at the Purchaser's expense prior to the execution of this Bill of Sale.</p>
              <p>In the event that the Purchaser elects not to have a veterinarian perform a pre-purchase examination of the Animal, the Purchaser waives any and all rights, claims or causes of action against the Seller for any patent or latent defects pertaining to the Animal.</p>
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
              <div><span className="font-semibold text-stone-800">Clause 2:</span> Once paid for, the horse becomes the responsibility of the buyer. This includes but is not limited to financial responsibility, third party liability, vet and feed bills. It is highly recommended that the buyer insure as soon as possible with International Racehorse Transport Insurance, which can be done and paid for online.</div>
              <div><span className="font-semibold text-stone-800">Clause 3:</span> The horse will stay at the seller's property under an 'agistment' arrangement until the buyer can organise transport to their home. Depending on the length of time and individual situation, this arrangement may attract fees at market rates.</div>
              {contract.customClauses && (
                <div><span className="font-semibold text-stone-800">Additional terms:</span> {contract.customClauses}</div>
              )}
            </div>
            <AgreementBox id="agreedSection4" checked={agreedSection4} onChange={setAgreedSection4}>
              I agree to the additional clauses stated above.
            </AgreementBox>
          </div>

          {/* ── Seller Declaration & Signature ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">
            <SectionHeading title="Seller's Declaration & Signature" />
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-sm text-stone-600 leading-relaxed">
              <span className="font-semibold text-stone-800">Seller's Declaration: </span>
              I declare that I am over the age of 18; I am legally responsible for the sale of this horse and am legally entitled to receive the funds for this sale. I declare that I transfer the ownership of this horse to the buyer listed, once funds have cleared.
            </div>
            <AgreementBox id="agreedSellerDeclaration" checked={agreedSellerDeclaration} onChange={setAgreedSellerDeclaration}>
              I agree to the Seller's Declaration above.
            </AgreementBox>
            <SignatureCanvas label="Seller's Signature" onChange={setSellerSignature} />
          </div>

          {/* ── Buyer Declaration & Signature ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">
            <SectionHeading title="Buyer's Declaration & Signature" />
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-sm text-stone-600 leading-relaxed">
              <span className="font-semibold text-stone-800">Buyer's Declaration: </span>
              I declare that I am over the age of 18 and I am legally responsible for the decisions regarding the assessment and purchase of this horse. I declare that I am able to complete this sale financially and have the ability and funds to look after this horse whilst under my ownership.
            </div>
            <AgreementBox id="agreedBuyerDeclaration" checked={agreedBuyerDeclaration} onChange={setAgreedBuyerDeclaration}>
              I agree to the Buyer's Declaration above.
            </AgreementBox>
            <SignatureCanvas label="Buyer's Signature" onChange={setBuyerSignature} />
          </div>

          {/* ── Submit ── */}
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#24384e] hover:bg-[#1a2d3f] disabled:opacity-60 text-white font-semibold py-4 rounded-lg text-base transition-colors"
          >
            {submitting ? "Submitting…" : "Submit Contract of Sale"}
          </button>

          <p className="text-center text-xs text-stone-400 pb-8">
            By submitting this form, both parties agree to the terms and conditions set out above.
          </p>

        </form>
      </div>
    </div>
  );
}
