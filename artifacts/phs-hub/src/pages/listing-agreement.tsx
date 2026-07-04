import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "wouter";

const API_BASE = "/api";

function SignatureCanvas({ onChange }: { onChange: (dataUrl: string | null) => void }) {
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
      <div className="text-sm font-medium text-[#24384e]">Your Signature</div>
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

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-sm font-bold tracking-widest uppercase text-[#24384e]">{title}</h2>
      <div className="flex-1 h-px bg-stone-200" />
    </div>
  );
}

interface AgreementData {
  token: string;
  status: string;
  horseName?: string | null;
  breed?: string | null;
  sex?: string | null;
  age?: string | null;
  colour?: string | null;
  height?: string | null;
  askingPrice?: string | null;
  location?: string | null;
  sellerName?: string | null;
  sellerEmail?: string | null;
  sellerPhone?: string | null;
  commissionRate?: string | null;
  minimumFee?: string | null;
  maximumFee?: string | null;
  listingPeriodDays?: number | null;
  listingTermsNotes?: string | null;
}

export default function ListingAgreementPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [sellerSignature, setSellerSignature] = useState<string | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedFee, setAgreedFee] = useState(false);
  const [agreedPeriod, setAgreedPeriod] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/listing-agreement/${token}`)
      .then(async r => {
        if (r.status === 410) { setError("This agreement has already been signed."); return; }
        if (!r.ok) { setError("Agreement not found or the link is no longer valid."); return; }
        const data = await r.json();
        setAgreement(data);
      })
      .catch(() => setError("Failed to load the agreement. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!agreedTerms || !agreedFee || !agreedPeriod) {
      setValidationError("Please check all agreement boxes before signing.");
      return;
    }
    if (!sellerSignature) {
      setValidationError("Please draw your signature before submitting.");
      return;
    }
    setValidationError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/listing-agreement/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerSignature, agreedTerms, agreedFee, agreedPeriod }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "Submission failed");
      }
      setSubmitted(true);
    } catch (e: any) {
      setValidationError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (agreement?.listingPeriodDays ?? 90));
  const endDateStr = endDate.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const commissionRate = agreement?.commissionRate ?? "5%";

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-stone-400 text-sm">Loading…</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-lg font-bold text-stone-800 mb-2">Agreement Unavailable</h1>
        <p className="text-stone-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-emerald-200 p-8 text-center shadow-sm">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-emerald-800 mb-2">Agreement Signed</h1>
        <p className="text-stone-600 text-sm leading-relaxed">
          Thank you, {agreement?.sellerName ?? ""}. Your Listing Agreement for <strong>{agreement?.horseName}</strong> has been signed and submitted to Performance Horse Sales. We'll be in touch to get your listing underway.
        </p>
        <p className="text-stone-400 text-xs mt-4">You can close this window.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="bg-[#24384e] text-white py-8 px-4 text-center">
        <h1 className="text-xl sm:text-2xl font-bold">Performance Horse Sales</h1>
        <p className="text-white/70 text-sm mt-1">Seller Listing Agreement — {agreement?.horseName}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Intro */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-stone-700 leading-relaxed space-y-3">
          <p>Thank you for choosing to list your horse with Performance Horse Sales. Please review the agreement details below carefully before signing.</p>
          <p>This Listing Agreement sets out the terms of our arrangement including commission rates, listing period, and your obligations as the seller. Once signed, it is legally binding.</p>
          <p className="font-medium text-stone-800">By signing below you confirm that:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2 text-stone-600">
            <li>You are the lawful owner of the horse (or authorised to act on the owner's behalf)</li>
            <li>All information provided about the horse is accurate and complete to the best of your knowledge</li>
            <li>The horse is free from any undisclosed finance, encumbrance or lien</li>
            <li>You agree to the commission structure and listing terms set out below</li>
          </ul>
        </div>

        {/* Horse & Seller Details */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Parties & Property" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">Agent</span>
              <span className="font-medium text-stone-800">Performance Horse Sales Australia &amp; New Zealand</span>
            </div>
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">Seller</span>
              <span className="font-medium text-stone-800">{agreement?.sellerName ?? "—"}</span>
            </div>
            {agreement?.sellerEmail && (
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Seller Email</span>
                <span className="font-medium text-stone-800">{agreement.sellerEmail}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">Horse</span>
              <span className="font-medium text-stone-800">{agreement?.horseName ?? "—"}</span>
            </div>
            {agreement?.breed && (
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Breed</span>
                <span className="font-medium text-stone-800">{agreement.breed}</span>
              </div>
            )}
            {agreement?.age && (
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Age</span>
                <span className="font-medium text-stone-800">{agreement.age} years</span>
              </div>
            )}
            {agreement?.askingPrice && (
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Asking Price</span>
                <span className="font-medium text-stone-800">{agreement.askingPrice}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">Agreement Date</span>
              <span className="font-medium text-stone-800">{dateStr}</span>
            </div>
          </div>
        </div>

        {/* Fee & Listing Terms */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Commission &amp; Listing Terms" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-[#24384e]/5 rounded-lg p-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1">Commission</div>
              <div className="text-xl font-bold text-[#24384e]">{commissionRate}</div>
              <div className="text-xs text-stone-400 mt-0.5">of listing price</div>
            </div>
            {agreement?.minimumFee && (
              <div className="bg-[#24384e]/5 rounded-lg p-3 text-center">
                <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1">Minimum Fee</div>
                <div className="text-lg font-bold text-[#24384e]">{agreement.minimumFee}</div>
                <div className="text-xs text-stone-400 mt-0.5">minimum payable</div>
              </div>
            )}
            {agreement?.maximumFee && (
              <div className="bg-[#24384e]/5 rounded-lg p-3 text-center">
                <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1">Maximum Fee</div>
                <div className="text-lg font-bold text-[#24384e]">{agreement.maximumFee}</div>
                <div className="text-xs text-stone-400 mt-0.5">maximum payable</div>
              </div>
            )}
            <div className="bg-[#24384e]/5 rounded-lg p-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1">Listing Period</div>
              <div className="text-xl font-bold text-[#24384e]">{agreement?.listingPeriodDays ?? 90}</div>
              <div className="text-xs text-stone-400 mt-0.5">days from {dateStr}</div>
            </div>
          </div>
          <div className="text-xs text-stone-500 bg-stone-50 rounded-lg p-3">
            Agreement expires: <strong className="text-stone-700">{endDateStr}</strong> (unless extended by mutual agreement)
          </div>
          {agreement?.listingTermsNotes && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">Special Conditions</div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-stone-700 whitespace-pre-wrap">{agreement.listingTermsNotes}</div>
            </div>
          )}
        </div>

        {/* Terms & Conditions */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Terms &amp; Conditions" />
          <div className="space-y-4 text-sm text-stone-700 leading-relaxed">
            <div>
              <p className="font-semibold text-stone-800">1. Appointment</p>
              <p className="mt-1">The Seller appoints Performance Horse Sales (PHS) as their consultant to market, advertise and facilitate the sale of the above horse for the duration of the listing period.</p>
            </div>
            <div>
              <p className="font-semibold text-stone-800">2. Commission / Completion Fee</p>
              <p className="mt-1">The Seller agrees to pay PHS a commission of {commissionRate} of the listing price (plus GST){agreement?.minimumFee || agreement?.maximumFee ? `, subject to a minimum fee of ${agreement?.minimumFee ?? "—"}${agreement?.maximumFee ? ` and a maximum fee of ${agreement.maximumFee}` : ""}` : ""}. The fee is due — whichever occurs first — when: (a) a deposit is paid or vetting is booked; (b) the horse is leased or sent on trial; (c) the horse is sold by any means or channel; or (d) three months have passed since listing commencement. The commission is payable within 24 hours of the invoice being issued. All fees are plus GST.</p>
            </div>
            <div>
              <p className="font-semibold text-stone-800">3. Retained Deposit</p>
              <p className="mt-1">If a deposit is retained by the Seller in the event of a sale not proceeding, the completion fee is again payable as above. In the event of the first sale not proceeding and the deposit being returned to the buyer, a $500 completion fee is payable when the horse is finally sold.</p>
            </div>
            <div>
              <p className="font-semibold text-stone-800">4. Pausing the Listing</p>
              <p className="mt-1">If the listing must be paused due to illness or injury of the horse or rider, and PHS is provided with a relevant vet or medical certificate, a $500 progress fee is payable. This fee will be deducted from the final commission or administration fee.</p>
            </div>
            <div>
              <p className="font-semibold text-stone-800">5. Pro Rata Administration Fee</p>
              <p className="mt-1">If PHS has commenced marketing and the horse subsequently becomes unavailable, no longer listed exclusively with PHS, or has not sold within 90 days and the Seller is not following PHS advice — a pro rata administration fee is payable based on days listed. A minimum charge of $500 applies regardless of calculation.</p>
            </div>
            <div>
              <p className="font-semibold text-stone-800">6. Marketing</p>
              <p className="mt-1">PHS will market the horse through its website, social media channels, and partner platforms. The Seller grants PHS a non-exclusive licence to use photographs, videos and other media provided for marketing purposes.</p>
            </div>
            <div>
              <p className="font-semibold text-stone-800">7. Seller's Warranties</p>
              <p className="mt-1">The Seller warrants that: (a) they are the lawful owner of the horse or are authorised to act on the owner's behalf; (b) the horse is free from any undisclosed finance, encumbrance or lien; and (c) all information provided to PHS is accurate and complete to the best of their knowledge.</p>
            </div>
            <div>
              <p className="font-semibold text-stone-800">8. Enquiries &amp; Viewings</p>
              <p className="mt-1">PHS will manage buyer enquiries and coordinate viewings. The Seller agrees to make reasonable efforts to facilitate viewings and respond to enquiries in a timely manner.</p>
            </div>
            <div>
              <p className="font-semibold text-stone-800">9. Cancellation</p>
              <p className="mt-1">Either party may terminate this agreement by providing 14 days' written notice. If the horse is sold during the listing period — or within 60 days after termination to a buyer introduced by PHS — the commission remains payable.</p>
            </div>
            <div>
              <p className="font-semibold text-stone-800">10. Limitation of Liability</p>
              <p className="mt-1">PHS acts as a facilitating consultant only and accepts no liability for the accuracy of seller-provided information, the fitness of the horse for any purpose, or any disputes arising between buyer and seller.</p>
            </div>
            <div>
              <p className="font-semibold text-stone-800">11. Governing Law</p>
              <p className="mt-1">This agreement is governed by the laws of Australia. Any disputes shall be resolved in the jurisdiction of the state in which the Seller resides.</p>
            </div>
          </div>
        </div>

        {/* Agreement Checkboxes */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Your Agreement" />
          <div className="space-y-3">
            <AgreementBox id="agreedTerms" checked={agreedTerms} onChange={setAgreedTerms}>
              I have read and agree to the Terms &amp; Conditions of this Listing Agreement, and I understand that this is a legally binding document.
            </AgreementBox>
            <AgreementBox id="agreedFee" checked={agreedFee} onChange={setAgreedFee}>
              I understand and agree to the commission structure: <strong>{commissionRate}</strong> of the final sale price (plus GST){agreement?.minimumFee ? `, minimum ${agreement.minimumFee}` : ""}{agreement?.maximumFee ? `, maximum ${agreement.maximumFee}` : ""}.
            </AgreementBox>
            <AgreementBox id="agreedPeriod" checked={agreedPeriod} onChange={setAgreedPeriod}>
              I agree to list exclusively with Performance Horse Sales for a period of <strong>{agreement?.listingPeriodDays ?? 90} days</strong> from {dateStr}, expiring on {endDateStr}.
            </AgreementBox>
          </div>
        </div>

        {/* Signature */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Signature" />
          <p className="text-sm text-stone-600 mb-4">
            By signing below, <strong>{agreement?.sellerName ?? "the Seller"}</strong> agrees to all the terms set out in this Listing Agreement for <strong>{agreement?.horseName}</strong>.
          </p>
          <SignatureCanvas onChange={setSellerSignature} />
        </div>

        {/* Error */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {validationError}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full bg-[#24384e] hover:bg-[#1a2d3f] disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
        >
          {submitting ? "Submitting…" : "Submit Signed Agreement"}
        </button>

        <p className="text-xs text-stone-400 text-center pb-8">
          By clicking "Submit Signed Agreement" you confirm that you have read, understood and agreed to the terms above.
          This submission is timestamped and constitutes your electronic signature.
        </p>

      </div>
    </div>
  );
}
