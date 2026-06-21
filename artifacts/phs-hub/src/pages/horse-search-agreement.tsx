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

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
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

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Agreement {
  id: number; token: string; status: string;
  clientName?: string; clientEmail?: string; clientAddress?: string; clientPhone?: string;
  serviceLevel?: string; upfrontFee?: string; consultancyFee?: string; customTerms?: string;
  submittedAt?: string;
}

export default function HorseSearchAgreementPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedFee, setAgreedFee] = useState(false);
  const [agreedReady, setAgreedReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/horse-search-agreement/${token}`)
      .then(async r => {
        if (r.status === 410) { setError("This agreement link has been voided."); return; }
        if (!r.ok) { setError("Agreement not found."); return; }
        const data = await r.json();
        setAgreement(data);
        setClientName(data.clientName || "");
        setClientEmail(data.clientEmail || "");
        setClientAddress(data.clientAddress || "");
        setClientPhone(data.clientPhone || "");
        if (data.status === "submitted") setSubmitted(true);
      })
      .catch(() => setError("Failed to load the agreement. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!agreedTerms || !agreedFee || !agreedReady) { setValidationError("Please check all agreement boxes before signing."); return; }
    if (!clientSignature) { setValidationError("Please draw your signature before submitting."); return; }
    if (!clientName.trim()) { setValidationError("Please enter your full name."); return; }
    setValidationError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/horse-search-agreement/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, clientEmail, clientAddress, clientPhone, clientSignature, agreedTerms, agreedFee, agreedReady }),
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

  const serviceName = agreement?.serviceLevel === "level2" ? "Premium Concierge Search" : "Search Service";

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
        <p className="text-stone-600 text-sm leading-relaxed">Thank you, {agreement?.clientName || clientName}. Your Costs Agreement has been signed and submitted. We'll be in touch soon to get your search underway!</p>
        <p className="text-stone-400 text-xs mt-4">You can close this window.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="bg-[#24384e] text-white py-8 px-4 text-center">
        <h1 className="text-xl sm:text-2xl font-bold">Performance Horse Sales</h1>
        <p className="text-white/70 text-sm mt-1">Search Service — Costs Agreement</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Intro */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-stone-700 leading-relaxed space-y-3">
          <p>We are confident that we can help you find a wonderful new horse and we thank you for trusting the PHS process.</p>
          <p>Please note that this form is a contract between you, as the Search Client, and Performance Horse Sales. Once signed, it is legally binding and all applicable costs are payable.</p>
          <p className="font-medium text-stone-800">Our aim is to make the buying process as clear, supported and stress-free as possible by:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2 text-stone-600">
            <li>reducing wasted time</li>
            <li>encouraging full and honest disclosure from both buyers and sellers</li>
            <li>helping ensure all parties are legally protected</li>
            <li>supporting you to find the right horse</li>
            <li>helping the horse find the right long-term home</li>
          </ul>
          <p>PHS is independent and impartial. We help connect buyers and sellers, but we do not act as an agent. We do not act on your behalf, make decisions for you, or handle money. Any deposit or purchase price is paid directly by the buyer to the seller.</p>
          <p>We can help find hidden gems, but no horse is perfect. Please remember: you may find a horse that is sound, educated, sane or inexpensive, but it is unlikely that one horse will be all four.</p>
          <p>The information provided in this form will not be shared with any other parties without your consent and will be stored securely.</p>
          <p>Our Search Terms and Conditions are available via this link: <a href="https://drive.google.com/file/d/1b7wmPQaoeRc3nIZ9f0AY9jccJIC8m5aX/view?usp=drive_link" target="_blank" rel="noreferrer" className="text-[#24384e] underline font-medium">Search Terms and Conditions</a> and publicly on our website. Please read the document carefully, before signing this agreement, to ensure this is the right service for you.</p>
        </div>

        {/* Fee Summary */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Service & Fees" />
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-stone-100">
              <span className="text-sm text-stone-600">Service</span>
              <span className="text-sm font-semibold text-stone-900">{serviceName}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-stone-100">
              <span className="text-sm text-stone-600">Upfront fee (payable on signing)</span>
              <span className="text-sm font-bold text-[#24384e]">{agreement?.upfrontFee || "$1,000"} + GST</span>
            </div>
            <div className="flex items-start justify-between py-3">
              <span className="text-sm text-stone-600">Consultancy fee (payable on successful purchase)</span>
              <span className="text-sm font-bold text-[#24384e] text-right ml-4">{agreement?.consultancyFee || "5% (min $1,000, capped at $2,000)"} + GST</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Terms" />
          <div className="prose prose-sm text-stone-700 space-y-3 text-sm leading-relaxed">
            <p><strong>What we will do:</strong> Performance Horse Sales will source and compile a database of up to 30 horses that match your stated criteria, notifying you each time a new match is added. For Premium Concierge clients, we will also manage all initial enquiries, negotiation, viewing bookings, vet check guidance, transport contacts, and prepare a Bill of Sale on completion.</p>
            <p><strong>Upfront fee:</strong> The upfront fee is payable immediately upon signing this agreement and is non-refundable once the search has commenced.</p>
            <p><strong>Consultancy fee:</strong> The consultancy fee is payable upon unconditional exchange of contracts or payment for the horse found by Performance Horse Sales.</p>
            <p><strong>Client commitments:</strong> By signing, you confirm that you are ready, willing, and able to view and purchase a horse during the search period. You confirm that all information in your search criteria form is accurate. You understand that no horse will perfectly match every criterion, and that horses presented will be those which Performance Horse Sales believes are 'fit for the intended purpose'.</p>
            <p><strong>Full Terms & Conditions</strong> are available on the Performance Horse Sales website.</p>
            {agreement?.customTerms && (
              <p><strong>Additional terms:</strong> {agreement.customTerms}</p>
            )}
          </div>
        </div>

        {/* Your Details */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Your Details" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FieldInput label="Full name *" value={clientName} onChange={setClientName} placeholder="Jane Smith" />
              <FieldInput label="Phone" value={clientPhone} onChange={setClientPhone} placeholder="0400 000 000" type="tel" />
            </div>
            <FieldInput label="Email" value={clientEmail} onChange={setClientEmail} placeholder="you@example.com" type="email" />
            <FieldInput label="Address" value={clientAddress} onChange={setClientAddress} placeholder="1 Example St, Suburb NSW 2000" />
          </div>
        </div>

        {/* Agreements */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Agreements" />
          <div className="space-y-3">
            <AgreementBox id="agreedTerms" checked={agreedTerms} onChange={setAgreedTerms}>
              I have read and agree to the Search Service Terms & Conditions set out above, including the full Terms & Conditions on the Performance Horse Sales website.
            </AgreementBox>
            <AgreementBox id="agreedFee" checked={agreedFee} onChange={setAgreedFee}>
              I agree to pay the upfront fee of <strong>{agreement?.upfrontFee || "$1,000"} + GST</strong> upon signing, and the consultancy fee of <strong>{agreement?.consultancyFee || "5%"} + GST</strong> upon successful purchase of a horse found by Performance Horse Sales.
            </AgreementBox>
            <AgreementBox id="agreedReady" checked={agreedReady} onChange={setAgreedReady}>
              I confirm that I am over 18 years of age, I am ready and financially able to purchase a horse, and all information I have provided in my search criteria is accurate and complete.
            </AgreementBox>
          </div>
        </div>

        {/* Signature */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Signature" />
          <SignatureCanvas label="Client Signature" onChange={setClientSignature} />
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
          {submitting ? "Submitting…" : "Sign & Submit Costs Agreement"}
        </button>

        <p className="text-center text-xs text-stone-400 pb-8">
          Questions? Call <a href="tel:0428239317" className="text-[#24384e] font-medium">0428 239 317</a>
        </p>
      </div>
    </div>
  );
}
