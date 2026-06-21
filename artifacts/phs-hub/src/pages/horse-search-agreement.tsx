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
          <p>Our Search Terms and Conditions are available via this link: <a href="https://drive.google.com/file/d/1b7wmPQaoeRc3nIZ9f0AY9jccJ1C8m5aX/view?usp=drive_link" target="_blank" rel="noreferrer" className="text-[#24384e] underline font-medium">Search Terms and Conditions</a> and publicly on our website. Please read the document carefully, before signing this agreement, to ensure this is the right service for you.</p>
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
              <span className="text-sm text-stone-600">Completion fee (payable when triggered — see terms)</span>
              <span className="text-sm font-bold text-[#24384e] text-right ml-4">{agreement?.consultancyFee || "5% (min $1,000, capped at $2,000)"} + GST</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <SectionHeading title="Terms" />
          <div className="prose prose-sm text-stone-700 space-y-4 text-sm leading-relaxed">

            <div>
              <p className="font-semibold text-stone-800">Our Service — Premium Concierge Search</p>
              <p className="mt-1">Full management of the buying process. {agreement?.upfrontFee || "$1,000"} upfront PLUS {agreement?.consultancyFee || "5% completion fee — $1,000 to $2,000"} — plus GST, based on budget or purchase price whichever is higher. This service can include:</p>
              <ul className="list-disc list-inside mt-2 space-y-0.5 ml-2">
                <li>Discussion and refinement of the client's search criteria</li>
                <li>Creation and management of the PHS website advertisement and social media posts</li>
                <li>Creation of a shared search database containing potential horses, videos, information and relevant files</li>
                <li>Initial research on up to 30 potential horses matching the search criteria</li>
                <li>Up to 30 potential horses sent to the client for consideration</li>
                <li>Comprehensive research on up to 10 shortlisted horses</li>
                <li>Management of the majority of communication with sellers</li>
                <li>Coordination and management of viewings</li>
                <li>Recommendations for suitable professionals to assess horses on the buyer's behalf</li>
                <li>In-depth support and discussion regarding horse suitability</li>
                <li>Review of viewing videos, with further discussion and suitability advice</li>
                <li>Full support throughout the buying process</li>
                <li>Recommendations regarding vetting</li>
                <li>Assistance with transport quotes</li>
                <li>Support with sale negotiation</li>
                <li>Creation of the sale contract</li>
                <li>Recommendations regarding insurance</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-stone-800">Completion Fee — When It Is Due</p>
              <p className="mt-1">The Completion Fee is payable when — whichever occurs first:</p>
              <ul className="list-disc list-inside mt-2 space-y-0.5 ml-2">
                <li>a deposit is paid;</li>
                <li>vetting is booked;</li>
                <li>the horse is purchased, leased or trialled (regardless of the channel or means by which it was found);</li>
                <li>the client ends the search for any reason;</li>
                <li>the client pauses the search for any reason; or</li>
                <li>30 horses have been sent.</li>
              </ul>
              <p className="mt-2">Please note, we continue to work with you to finalise the search and purchase once this fee has been paid. The fee is payable to ensure that our work and time is paid for. The fee is payable in full within 24 hours of the invoice being sent.</p>
            </div>

            <div>
              <p className="font-semibold text-stone-800">Timeliness of Search and Purchase</p>
              <p className="mt-1">To minimise time wasting and prevent lost purchase opportunities, it is expected that you are ready to view and purchase. The process of a sale is completed within 7 days from viewing — with a decision being made within 24 hours of potential buyers receiving the vet report — unless prior arrangements have been made. This is to protect PHS and sellers from long, drawn-out searches/purchases and missed opportunities.</p>
            </div>

            <div>
              <p className="font-semibold text-stone-800">Search Criteria and Readiness to Purchase</p>
              <p className="mt-1">The search criteria submitted on the Search Form is the official criteria of the search. We understand that during a search, clients will become clearer as to their criteria — this is part of the process. Please be mindful that:</p>
              <ul className="list-disc list-inside mt-2 space-y-0.5 ml-2">
                <li>If major changes occur and budget does not change, the search may no longer be viable.</li>
                <li>If you are not immediately ready to view, horses may be sold by the time you are organised to view them.</li>
                <li>You must be ready to view and purchase — searches are not paused unless there are extraordinary extenuating circumstances.</li>
                <li>The number of horses on the database does not reset. If you are at horse 18, another 12 will be added to reach 30.</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-stone-800">Database</p>
              <p className="mt-1">The database will consist of 30 horses that match the search criteria. Once those 30 horses have been added, the search is finalised and the completion fee (if applicable) is due. "Match the criteria" in terms of age, height and price includes those within 10% of the stated figures.</p>
              <p className="mt-2">Please remember — it is impossible to find any horse which is absolutely perfect, with a completely clean medical history and zero history of any misdemeanour, because they are living beings.</p>
              <p className="mt-2">Any horse sent to PHS by the client for discussion/research will be included in the official count. Horses will not be removed from the official count simply because they don't appeal to the client or are deemed not suitable after further investigation — this research and fine-tuning is part of the process and what we are paid for.</p>
            </div>

            <div>
              <p className="font-semibold text-stone-800">Advertising During the Search</p>
              <p className="mt-1">PHS reserves the right to be the only content creator during the search process. Anyone is welcome and encouraged to share PHS ads and posts. Any previous search/wanted ads are expected to be removed so that the search has a fresh start, marketing-wise.</p>
              <p className="mt-2"><strong>Advertising after the search:</strong> PHS reserves the right to advertise horses listed with PHS as "purchased via Performance Horse Sales search" or similar on social media and the internet, once they have sold.</p>
            </div>

            <div>
              <p className="font-semibold text-stone-800">Assessment of Suitability</p>
              <p className="mt-1">I understand that I am fully and solely responsible for decisions relating to all aspects of the search, viewing and sale and waive PHS of all and any liability. I acknowledge that PHS does not meet or view the search client or horse in person and is relying solely on the information search clients and sellers provide.</p>
              <p className="mt-2">I, for myself and on behalf of my heirs, assigns, personal representatives and next of kin, hereby release and hold harmless and agree not to sue PHS and its connections, and if applicable, owners, buyers and lessors of horses or premises used, with any respect to all injury, disability, death, or loss or damage to person or property, whether caused by the negligence of these parties or otherwise.</p>
            </div>

            <div>
              <p className="font-semibold text-stone-800">Deposits</p>
              <p className="mt-1">There is no charge or need to pay a deposit for the first viewing, unless a potential buyer wishes to hold a horse and prevent a sale to someone else. A 10% deposit (or $1,000 — whichever is higher) must be paid to hold the horse for a second viewing or vet check. Deposits are paid directly to the horse's current owner.</p>
              <ul className="list-disc list-inside mt-2 space-y-0.5 ml-2">
                <li>From a seller's point of view: a deposit minimises time wasters and compensates for risk and time spent vet checking, and for lost sales/delays to the selling process.</li>
                <li>From the buyer's point of view: a deposit holds the horse so it is not sold from under them.</li>
                <li>If a deposit were fully refundable, there would be no point to having one.</li>
              </ul>
              <p className="mt-2">Deposits will usually be refunded if: the horse does not behave as advertised at the viewing; known issues are not disclosed; and/or the vet report/x-rays state the horse is lame, "not fit for purpose", or considered a "moderate" or "high" risk for the advertised purpose.</p>
              <p className="mt-2 font-medium text-stone-800">It is of vital importance that you receive in writing, from the seller, the terms of deposit payment and conditions regarding deposit refunds, prior to paying a deposit.</p>
            </div>

            <div>
              <p className="font-semibold text-stone-800">What Happens Next</p>
              <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
                <li>PHS will contact you to answer any questions.</li>
                <li>You sign this Costs and Terms Agreement to confirm you wish to proceed.</li>
                <li>Invoice will be sent to you.</li>
                <li>Once the invoice has been paid, PHS drafts the search criteria and ad.</li>
                <li>The draft is sent to you for editing and approval.</li>
              </ol>
              <p className="mt-2 text-stone-500 italic">Please note — searches are usually commenced within 12 hours of this form being signed, depending on how quickly the client pays the invoice and approves the search criteria.</p>
              <ol className="list-decimal list-inside mt-2 space-y-1 ml-2" start={6}>
                <li>PHS searches privately, directly as well as via social media and website ads/posts.</li>
                <li>PHS adds horses to the Search Database.</li>
                <li>PHS lets you know each time horses are added.</li>
                <li>If you wish to proceed with a potential horse, PHS facilitates contact regarding phone call, viewing or purchase, depending on the level of service selected and paid for.</li>
              </ol>
            </div>

            {agreement?.customTerms && (
              <div>
                <p className="font-semibold text-stone-800">Additional Terms</p>
                <p className="mt-1">{agreement.customTerms}</p>
              </div>
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
              I am over 18 years old and have read, understand and agree to the terms and conditions set out above, including the full Search Terms & Conditions available on the Performance Horse Sales website. I confirm all information in my search criteria is accurate. I understand that I am fully and solely responsible for decisions relating to all aspects of the search, viewing and sale.
            </AgreementBox>
            <AgreementBox id="agreedFee" checked={agreedFee} onChange={setAgreedFee}>
              I agree to pay the upfront fee of <strong>{agreement?.upfrontFee || "$1,000"} + GST</strong> upon signing, and the completion fee of <strong>{agreement?.consultancyFee || "5%"} + GST</strong> in full, within 24 hours of the invoice being sent, when triggered as per the terms above. I understand that all money (deposit/payment) for the horse is sent straight to the seller by the buyer — PHS simply facilitates the search process.
            </AgreementBox>
            <AgreementBox id="agreedReady" checked={agreedReady} onChange={setAgreedReady}>
              I confirm that I am ready and financially able to purchase a horse. I understand I will need to pay a 10% deposit (minimum $1,000) directly to the seller to hold a horse for second viewings or vetting, and that I will obtain the deposit terms and refund conditions in writing from the seller before paying.
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
