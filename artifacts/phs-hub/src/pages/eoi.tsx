import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
const phsLogo = `${import.meta.env.BASE_URL}phs-logo.png`;

const API_BASE = "/api";

const TOTAL_STEPS = 11;

// ─── Helpers ────────────────────────────────────────────────────────────────

function CheckboxGroup({
  name, options, values, onChange,
}: { name: string; options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) =>
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox" name={name} value={opt} checked={values.includes(opt)}
            onChange={() => toggle(opt)}
            className="mt-1 h-4 w-4 rounded border-stone-300 shrink-0 accent-[#24384e]"
          />
          <span className="text-sm text-stone-700 group-hover:text-stone-900 leading-snug">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function RadioGroup({
  name, options, value, onChange,
}: { name: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-start gap-3 cursor-pointer group">
          <input
            type="radio" name={name} value={opt} checked={value === opt}
            onChange={() => onChange(opt)}
            className="mt-1 h-4 w-4 border-stone-300 shrink-0 accent-[#24384e]"
          />
          <span className="text-sm text-stone-700 group-hover:text-stone-900 leading-snug">{opt}</span>
        </label>
      ))}
    </div>
  );
}

// ─── Signature Canvas ────────────────────────────────────────────────────────

function SignatureCanvas({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  // Use a ref (not state) so endDraw always reads the current value — no stale closure
  const hasSignatureRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false); // for UI only

  const getPos = (e: MouseEvent | Touch, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawingRef.current = true;
    const pos = "touches" in e.nativeEvent
      ? getPos(e.nativeEvent.touches[0], canvas)
      : getPos(e.nativeEvent as MouseEvent, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = "touches" in e.nativeEvent
      ? getPos(e.nativeEvent.touches[0], canvas)
      : getPos(e.nativeEvent as MouseEvent, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    if (!hasSignatureRef.current) {
      hasSignatureRef.current = true;
      setHasSignature(true);
    }
  }, []);

  const endDraw = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Read from ref — always current, never stale
    if (hasSignatureRef.current) {
      onChange(canvas.toDataURL());
    }
  }, [onChange]);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignatureRef.current = false;
    setHasSignature(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={160}
        className={`border-2 rounded-lg w-full touch-none bg-white cursor-crosshair ${hasSignature ? "border-green-400" : "border-stone-300"}`}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      {hasSignature ? (
        <p className="text-xs text-green-600 font-medium">✓ Signature captured</p>
      ) : (
        <p className="text-xs text-stone-400">Sign above using your mouse or finger</p>
      )}
      {hasSignature && (
        <button
          type="button"
          onClick={clear}
          className="text-sm text-stone-500 hover:text-stone-700 underline underline-offset-2"
        >
          Clear and re-sign
        </button>
      )}
    </div>
  );
}

// ─── Step Content ─────────────────────────────────────────────────────────────

function FieldGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-stone-800">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#24384e] focus:outline-none focus:ring-1 focus:ring-[#24384e]"
    />
  );
}

function TextArea({
  value, onChange, placeholder, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#24384e] focus:outline-none focus:ring-1 focus:ring-[#24384e] resize-none"
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface EoiData {
  // Step 1
  email: string;
  firstName: string;
  surname: string;
  location: string;
  phone: string;
  // Step 2
  decisionMakerRole: string;
  coverageType: string;
  // Step 3
  horseName: string;
  hasResearched: string;
  budgetStatus: string;
  budgetAmount: string;
  // Step 4
  requestTypes: string[];
  requestedInfo: string;
  preferredViewingDate: string;
  // Step 5
  coachName: string;
  viewingFactors: string[];
  additionalInfoRequest: string;
  // Step 6
  disciplines: string[];
  activities: string[];
  // Step 7
  horseDescription: string;
  horseTypeAttributes: string[];
  nonNegotiables: string[];
  // Step 8
  riderGoals: string;
  additionalGoalInfo: string;
  riderCompetenceLevel: string;
  // Step 9
  riderConfidence: string;
  riderCircumstances: string;
  riderAge: string;
  riderInfo: string;
  // Step 10
  purchaseFactors: string[];
  otherNonNegotiables: string;
  vettingLevel: string;
  vetExpectations: string;
  managementConditions: string[];
  agistmentLocation: string;
  experienceLevel: string;
  settlingExpectations: string;
  otherManagementFactors: string;
  // Step 11
  waiverAgreed: boolean;
  declarationAgreed: boolean;
  signatureData: string;
}

const INITIAL: EoiData = {
  email: "", firstName: "", surname: "", location: "", phone: "",
  decisionMakerRole: "", coverageType: "",
  horseName: "", hasResearched: "", budgetStatus: "", budgetAmount: "",
  requestTypes: [], requestedInfo: "", preferredViewingDate: "",
  coachName: "", viewingFactors: [], additionalInfoRequest: "",
  disciplines: [], activities: [],
  horseDescription: "", horseTypeAttributes: [], nonNegotiables: [],
  riderGoals: "", additionalGoalInfo: "", riderCompetenceLevel: "",
  riderConfidence: "", riderCircumstances: "", riderAge: "", riderInfo: "",
  purchaseFactors: [], otherNonNegotiables: "", vettingLevel: "", vetExpectations: "",
  managementConditions: [], agistmentLocation: "", experienceLevel: "", settlingExpectations: "", otherManagementFactors: "",
  waiverAgreed: false, declarationAgreed: false, signatureData: "",
};

function validateStep(step: number, data: EoiData): string | null {
  switch (step) {
    case 1:
      if (!data.email) return "Email is required.";
      if (!data.firstName) return "First name is required.";
      if (!data.surname) return "Surname is required.";
      if (!data.location) return "Location is required.";
      if (!data.phone) return "Mobile phone number is required.";
      return null;
    case 2:
      if (!data.decisionMakerRole) return "Please confirm your decision-making role.";
      if (data.decisionMakerRole === "no") return "This form is only for the person making the final purchase decision.";
      if (!data.coverageType) return "Please indicate what this form covers.";
      return null;
    case 3:
      if (!data.horseName) return "Please enter the horse name(s).";
      if (!data.hasResearched) return "Please confirm you have reviewed the listing.";
      if (data.hasResearched === "no") return "Please complete your research before submitting — access the listing, portfolio, owner response form and videos first.";
      if (!data.budgetStatus) return "Please indicate your purchase readiness.";
      return null;
    case 4:
      if (data.requestTypes.length === 0) return "Please select at least one request type.";
      return null;
    case 5:
      if (!data.coachName) return "Please enter your coach's name (or N/A).";
      if (data.viewingFactors.length === 0) return "Please select at least one viewing factor.";
      return null;
    case 6:
      if (data.disciplines.length === 0) return "Please select at least one discipline.";
      if (data.activities.length === 0) return "Please select how you like to work with your horse.";
      return null;
    case 7:
      if (!data.horseDescription) return "Please select the statement that best describes the horse you're looking for.";
      if (data.horseTypeAttributes.length === 0) return "Please select at least one horse type attribute.";
      if (data.nonNegotiables.length === 0) return "Please select your non-negotiables (or the 'no restrictions' option).";
      return null;
    case 8:
      if (!data.riderGoals) return "Please select your performance goals.";
      if (!data.additionalGoalInfo) return "Please provide additional information about your goals.";
      if (!data.riderCompetenceLevel) return "Please select your rider competence level.";
      return null;
    case 9:
      if (!data.riderConfidence) return "Please select your confidence level.";
      if (!data.riderCircumstances) return "Please select your riding circumstances.";
      if (!data.riderAge) return "Please select your rider age group.";
      return null;
    case 10:
      if (data.purchaseFactors.length === 0) return "Please select at least one purchase factor.";
      if (!data.vettingLevel) return "Please indicate the level of vetting required.";
      if (!data.vetExpectations) return "Please indicate your expectations regarding the vet check.";
      if (data.managementConditions.length === 0) return "Please select at least one management condition.";
      if (!data.agistmentLocation) return "Please provide the agistment location (or N/A).";
      if (!data.experienceLevel) return "Please select your experience and support level.";
      if (!data.settlingExpectations) return "Please select your settling-in expectations.";
      return null;
    case 11:
      if (!data.waiverAgreed) return "You must agree to the waiver to proceed.";
      if (!data.declarationAgreed) return "You must agree to the declaration to proceed.";
      if (!data.signatureData) return "Please add your digital signature.";
      return null;
    default:
      return null;
  }
}

const STEP_TITLES = [
  "", "Your Details", "About You", "The Horse",
  "Your Request", "Coach & Viewing", "Disciplines & Activities",
  "Horse Type", "Rider Goals", "Rider Profile",
  "Purchase & Management", "Waiver & Signature",
];

export default function EoiPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<EoiData>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof EoiData>(key: K, value: EoiData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });

  const next = () => {
    const err = validateStep(step, data);
    if (err) { setError(err); scrollTop(); return; }
    setError(null);
    setStep((s) => s + 1);
    scrollTop();
  };

  const back = () => { setError(null); setStep((s) => s - 1); scrollTop(); };

  const submit = async () => {
    const err = validateStep(11, data);
    if (err) { setError(err); scrollTop(); return; }
    setError(null);
    setSubmitting(true);

    const { waiverAgreed, declarationAgreed, signatureData, firstName, surname, location, phone, email, horseName, ...rest } = data;
    const formData = { ...rest };

    try {
      const res = await fetch(`${API_BASE}/eois`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerEmail: email,
          buyerFirstName: firstName,
          buyerSurname: surname,
          buyerLocation: location,
          buyerPhone: phone,
          horseName,
          formData,
          signatureData,
          waiverAgreed,
          declarationAgreed,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      navigate("/eoi-thank-you");
    } catch {
      toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={topRef} className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-[#24384e] px-6 py-4 flex items-center gap-4">
        <img src={phsLogo} alt="PHS Logo" className="h-10 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div>
          <p className="text-white text-xs font-medium tracking-wide uppercase opacity-70">Performance Horse Sales</p>
          <h1 className="text-white text-lg font-bold">Expression of Interest</h1>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-stone-200">
        <div
          className="h-full bg-amber-700 transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Step header */}
        <div className="mb-6">
          <p className="text-xs text-stone-500 mb-1">Step {step} of {TOTAL_STEPS}</p>
          <h2 className="text-2xl font-bold text-[#24384e]">{STEP_TITLES[step]}</h2>
        </div>

        {/* Intro — shown on step 1 only */}
        {step === 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-stone-700 space-y-2">
            <p className="font-semibold text-blue-900">
              Please note: this form is NOT BINDING until the Waiver and Viewing Agreement is signed and a viewing is booked.
            </p>
            <p>Contact us on <strong>0428 239 317</strong> if you don't receive a response within 12 hours.</p>
            <p className="font-medium text-stone-800">Our aim is that the buying process:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>is stress-free</li>
              <li>facilitates full disclosure on the part of buyers and sellers</li>
              <li>saves time and money by avoiding multiple viewings and vettings</li>
              <li>helps you find the right horse, the first time</li>
            </ul>
            <p className="text-red-700 font-semibold">
              Please DO NOT fill in this form if you are under 18 or are not the person making the final decision / funding the horse purchase.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Step 1: Your Details ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <FieldGroup label="Email" required>
              <TextInput type="email" value={data.email} onChange={(v) => set("email", v)} placeholder="your@email.com" />
            </FieldGroup>
            <FieldGroup label="First name" required>
              <TextInput value={data.firstName} onChange={(v) => set("firstName", v)} placeholder="Jane" />
            </FieldGroup>
            <FieldGroup label="Surname" required>
              <TextInput value={data.surname} onChange={(v) => set("surname", v)} placeholder="Smith" />
            </FieldGroup>
            <FieldGroup label="Location" required>
              <TextInput value={data.location} onChange={(v) => set("location", v)} placeholder="e.g. Brisbane, QLD" />
            </FieldGroup>
            <FieldGroup label="Mobile phone number" required>
              <TextInput type="tel" value={data.phone} onChange={(v) => set("phone", v)} placeholder="04xx xxx xxx" />
            </FieldGroup>
          </div>
        )}

        {/* ── Step 2: About You ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <FieldGroup label="I am over the age of 18, I am funding this horse purchase, and I am responsible for the final decision relating to this potential horse purchase" required>
              <RadioGroup
                name="decisionMakerRole"
                options={[
                  "yes and I am also the rider",
                  "yes, but I am purchasing a horse for a junior rider",
                  "no — if you answered 'no' please do not fill in this form",
                ]}
                value={data.decisionMakerRole}
                onChange={(v) => set("decisionMakerRole", v)}
              />
            </FieldGroup>
            <FieldGroup label="This form covers the viewing of" required>
              <RadioGroup
                name="coverageType"
                options={[
                  "a specific horse",
                  "any horse listed with PHS — tick this to save filling out forms for other horses listed with us",
                ]}
                value={data.coverageType}
                onChange={(v) => set("coverageType", v)}
              />
            </FieldGroup>
          </div>
        )}

        {/* ── Step 3: The Horse ────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <FieldGroup label="Name of the horse/s that I am interested in" required>
              <TextInput value={data.horseName} onChange={(v) => set("horseName", v)} placeholder="e.g. Buckley's Chance" />
            </FieldGroup>
            <FieldGroup
              label="I have: accessed the PHS website; read the horse's full ad; accessed the horse's portfolio; read the Owner Response Form; and watched the horse's videos."
              required
            >
              <RadioGroup
                name="hasResearched"
                options={[
                  "I have, and I think the horse looks suitable.",
                  "no — please do NOT tick this box, please do this BEFORE submitting this form.",
                ]}
                value={data.hasResearched}
                onChange={(v) => set("hasResearched", v)}
              />
            </FieldGroup>
            <FieldGroup label="Are you ready to purchase?" required>
              <RadioGroup
                name="budgetStatus"
                options={[
                  "Yes, my budget is sufficient to cover the horse's asking price",
                  "Yes, but my budget is less than the horse's asking price",
                  "I am waiting on finance",
                  "Looking to buy in the future when finances allow",
                ]}
                value={data.budgetStatus}
                onChange={(v) => set("budgetStatus", v)}
              />
            </FieldGroup>
            {(data.budgetStatus === "Yes, but my budget is less than the horse's asking price") && (
              <FieldGroup label="Please indicate your price point (we need to know if it is potentially acceptable to the seller before booking a viewing)" required>
                <TextInput value={data.budgetAmount} onChange={(v) => set("budgetAmount", v)} placeholder="e.g. $12,000" />
              </FieldGroup>
            )}
          </div>
        )}

        {/* ── Step 4: Your Request ─────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <FieldGroup label="I am requesting (select all that apply)" required>
              <CheckboxGroup
                name="requestTypes"
                options={[
                  "More information or video",
                  "Phone call with seller",
                  "Viewing — I will attend this",
                  "Viewing — but I will send someone on my behalf",
                  "Remote / video viewing",
                  "Phone call to discuss a potential sight unseen purchase",
                ]}
                values={data.requestTypes}
                onChange={(v) => set("requestTypes", v)}
              />
            </FieldGroup>
            {data.requestTypes.includes("More information or video") && (
              <FieldGroup label="If you have requested more information or video, what would you like to find out or see?">
                <TextArea value={data.requestedInfo} onChange={(v) => set("requestedInfo", v)} placeholder="Please describe what you'd like to know or see…" />
              </FieldGroup>
            )}
            {(data.requestTypes.includes("Viewing — I will attend this") || data.requestTypes.includes("Viewing — but I will send someone on my behalf") || data.requestTypes.includes("Remote / video viewing")) && (
              <FieldGroup label="What date would suit you best for a viewing?">
                <TextInput type="date" value={data.preferredViewingDate} onChange={(v) => set("preferredViewingDate", v)} />
              </FieldGroup>
            )}
          </div>
        )}

        {/* ── Step 5: Coach & Viewing ──────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-6">
            <FieldGroup label="My coach's name (if you don't have a coach please write N/A)" required>
              <TextInput value={data.coachName} onChange={(v) => set("coachName", v)} placeholder="e.g. Sarah Jones or N/A" />
            </FieldGroup>
            <FieldGroup label="Factors to consider regarding the viewing (select all that apply)" required>
              <CheckboxGroup
                name="viewingFactors"
                options={[
                  "My coach will attend the viewing with me.",
                  "A friend or family member will attend the viewing with me.",
                  "I may request an off property viewing.",
                  "I would like to jump the horse at the viewing.",
                  "I would probably like to book a second viewing, if the first is successful.",
                  "None of the above.",
                ]}
                values={data.viewingFactors}
                onChange={(v) => set("viewingFactors", v)}
              />
            </FieldGroup>
            <FieldGroup label="If additional information or videos are being requested, please explain what you require">
              <TextArea value={data.additionalInfoRequest} onChange={(v) => set("additionalInfoRequest", v)} placeholder="Optional…" />
            </FieldGroup>
          </div>
        )}

        {/* ── Step 6: Disciplines & Activities ─────────────────────────────── */}
        {step === 6 && (
          <div className="space-y-6">
            <FieldGroup label="Potential horse must be suitable for (select all that apply)" required>
              <CheckboxGroup
                name="disciplines"
                options={[
                  "Dressage", "Eventing", "Showjumping", "Working Equitation",
                  "Pony Club", "Adult Rider Club", "Showing", "Campdrafting",
                  "Reining", "Western Pleasure", "Team Penning",
                  "Mustering / Feed Lot work", "Trail riding / pleasure",
                  "Companion / Therapy", "Breeding", "Other (please describe below)",
                ]}
                values={data.disciplines}
                onChange={(v) => set("disciplines", v)}
              />
            </FieldGroup>
            <FieldGroup label="I like to (please select all that apply)" required>
              <CheckboxGroup
                name="activities"
                options={[
                  "do a variety of activities with my horse",
                  "stick to arena work",
                  "compete",
                  "work my horse regularly — 4 or more times a week",
                  "work my horse 2–3 times a week",
                  "work my horse once a week or less",
                  "enjoy my horse but do not ride",
                  "ride but do not wish to compete",
                ]}
                values={data.activities}
                onChange={(v) => set("activities", v)}
              />
            </FieldGroup>
          </div>
        )}

        {/* ── Step 7: Horse Type ───────────────────────────────────────────── */}
        {step === 7 && (
          <div className="space-y-6">
            <FieldGroup label="Which statement best describes the horse I am looking for?" required>
              <RadioGroup
                name="horseDescription"
                options={[
                  "Experienced, mature schoolmaster with significant results",
                  "Experienced, mature schoolmaster — may be stepping down a level",
                  "Confident / seasoned competitor with significant wins / placings",
                  "Confident / seasoned competitor for pony club / adult rider club",
                  "Educated all-rounder for pleasure riding, low level competitions, not expecting to win",
                  "True beginner's horse",
                  "Second or third pony for a confident / capable child",
                  "Genuine 'first off the lead' child's pony",
                  "Lead pony for young child",
                  "Happy hacker for a pleasure rider",
                  "Young horse, under saddle and has been 'out' a few times",
                  "Green broken / just started under saddle youngster",
                  "Unbroken youngster ready to break in",
                  "Foal",
                  "Other",
                ]}
                value={data.horseDescription}
                onChange={(v) => set("horseDescription", v)}
              />
            </FieldGroup>
            <FieldGroup label="Please select the statements that best explain the 'type' of horse I am looking for (select all that apply)" required>
              <CheckboxGroup
                name="horseTypeAttributes"
                options={[
                  "hot and energetic",
                  "forward and responsive",
                  "willing but not forward",
                  "plodder — more whoa than go",
                  "generally unflappable",
                  "completely unflappable at all times",
                  "can be quirky",
                  "can have vices",
                  "green",
                  "basic level of education",
                  "well educated",
                ]}
                values={data.horseTypeAttributes}
                onChange={(v) => set("horseTypeAttributes", v)}
              />
            </FieldGroup>
            <FieldGroup label="Please tick any non-negotiables related to this purchase (select all that apply)" required>
              <CheckboxGroup
                name="nonNegotiables"
                options={[
                  "horse must be ridden and work softly in a snaffle bit",
                  "horse must be fit and currently in full work / competing",
                  "horse must have a completely clean medical history",
                  "horse must be completely vice free",
                  "horse can't require any special management — feeding, handling, paddocking",
                  "horse must be completely unflappable in all situations — fireworks, sideshows etc",
                  "horse must be completely unflappable on trails, being ridden down busy roads",
                  "horse must be familiar with farm life",
                  "horse must be familiar and safe with children",
                  "horse must be completely beginner safe",
                  "there aren't any non-negotiables — no horse is perfect and I don't want to miss one by imposing too many restrictions",
                  "other",
                ]}
                values={data.nonNegotiables}
                onChange={(v) => set("nonNegotiables", v)}
              />
            </FieldGroup>
          </div>
        )}

        {/* ── Step 8: Rider Goals ──────────────────────────────────────────── */}
        {step === 8 && (
          <div className="space-y-6">
            <FieldGroup label="Rider goals for this horse, performance-wise" required>
              <RadioGroup
                name="riderGoals"
                options={[
                  "Competing at National Level",
                  "Competing at State Level",
                  "Competing at Regional / Lower Level",
                  "Not competing",
                ]}
                value={data.riderGoals}
                onChange={(v) => set("riderGoals", v)}
              />
            </FieldGroup>
            <FieldGroup label="Please include any other information that might help us assess whether the match might be suitable (e.g. 'rider would like the horse to take them from EVA80 level to 1*')" required>
              <TextArea rows={4} value={data.additionalGoalInfo} onChange={(v) => set("additionalGoalInfo", v)} placeholder="Describe your goals and expectations…" />
            </FieldGroup>
            <FieldGroup label="Rider competence level" required>
              <RadioGroup
                name="riderCompetenceLevel"
                options={[
                  "Experienced Professional — lifetime of experience producing and competing both young and educated horses; unfazed by any nonsense; can ride green horses",
                  "Very Experienced Junior Rider — lifetime of experience producing and competing; unfazed by nonsense; can ride green horses",
                  "Experienced Amateur Rider — riding / competing regularly for at least 5 years; independent hands and balanced position; confident in all situations; can handle some quirks",
                  "Experienced Junior Rider — riding / competing regularly for at least 5 years; independent hands and balanced position; confident in all situations; can handle some quirks",
                  "Capable Amateur Rider — riding / competing regularly for at least 3 years; independent hands and position at all times; confident if horse is reasonably well behaved; prefers schoolmaster without major quirks",
                  "Novice Rider — independent hands and established position; can walk, trot, canter independently and balanced at all times; needs impeccably well behaved established schoolmaster without quirks",
                  "Beginner — sometimes unbalanced and unsure / nervous; needs a very forgiving, experienced schoolmaster who is completely non-reactive",
                ]}
                value={data.riderCompetenceLevel}
                onChange={(v) => set("riderCompetenceLevel", v)}
              />
            </FieldGroup>
          </div>
        )}

        {/* ── Step 9: Rider Profile ────────────────────────────────────────── */}
        {step === 9 && (
          <div className="space-y-6">
            <FieldGroup label="Rider / handler confidence level" required>
              <RadioGroup
                name="riderConfidence"
                options={[
                  "I am confident regardless of the horse.",
                  "I am confident depending on which horse — a green, hot or quirky horse would worry me.",
                  "I am confident depending on which horse — a big, forward or competitive performance type would worry me.",
                  "I am confident on a very placid, well-educated 'more whoa than go' type.",
                  "I am somewhat nervous, some of the time.",
                  "I am very nervous, most of the time.",
                  "I am terrified (don't worry, we can find you a horse that won't care!)",
                ]}
                value={data.riderConfidence}
                onChange={(v) => set("riderConfidence", v)}
              />
            </FieldGroup>
            <FieldGroup label="Rider circumstances" required>
              <RadioGroup
                name="riderCircumstances"
                options={[
                  "I have had a significant break from riding and am just getting back in the saddle.",
                  "I ride every now and then.",
                  "I ride regularly and feel that I am 'riding fit'.",
                ]}
                value={data.riderCircumstances}
                onChange={(v) => set("riderCircumstances", v)}
              />
            </FieldGroup>
            <FieldGroup label="Rider age" required>
              <RadioGroup
                name="riderAge"
                options={["under 12", "12 and under 16", "16 and under 19", "over 19"]}
                value={data.riderAge}
                onChange={(v) => set("riderAge", v)}
              />
            </FieldGroup>
            <FieldGroup label="Additional rider information (optional) — please include information relating to age, goals, confidence, skills, history, experience and professional support">
              <TextArea rows={4} value={data.riderInfo} onChange={(v) => set("riderInfo", v)} placeholder="Optional — anything that helps us assess suitability…" />
            </FieldGroup>
          </div>
        )}

        {/* ── Step 10: Purchase & Management ───────────────────────────────── */}
        {step === 10 && (
          <div className="space-y-6">
            <FieldGroup label="Factors relating to this purchase (select all that apply)" required>
              <CheckboxGroup
                name="purchaseFactors"
                options={[
                  "I have just started searching for a horse.",
                  "I have been looking for a horse for a long time.",
                  "I have a very fixed criteria for my horse purchase.",
                  "I am flexible about which horse I choose.",
                  "I am confident making a decision about the purchase.",
                  "I will need time and advice from my coach or others to help me make a decision.",
                  "I have had issues purchasing horses in the past — failed vet checks, breakdowns in negotiations with sellers, etc.",
                  "I have had issues with newly purchased horses — horses misbehaving or not suiting me.",
                ]}
                values={data.purchaseFactors}
                onChange={(v) => set("purchaseFactors", v)}
              />
            </FieldGroup>
            <FieldGroup label="Any other non-negotiables (optional)">
              <TextArea value={data.otherNonNegotiables} onChange={(v) => set("otherNonNegotiables", v)} placeholder="List any other non-negotiables here…" />
            </FieldGroup>
            <FieldGroup label="Level of vetting required (so the seller can indicate if this is available in their area)" required>
              <RadioGroup
                name="vettingLevel"
                options={[
                  "Simple health check",
                  "Full pre-purchase exam",
                  "Full pre-purchase plus standard leg x-rays",
                  "Full pre-purchase plus full range of x-rays — back and / or neck",
                  "Full pre-purchase plus full range of x-rays (legs, back and neck) and other diagnostic exams",
                ]}
                value={data.vettingLevel}
                onChange={(v) => set("vettingLevel", v)}
              />
            </FieldGroup>
            <FieldGroup label="Your expectations regarding vet check findings" required>
              <RadioGroup
                name="vetExpectations"
                options={[
                  "I will not purchase a horse if there are any adverse findings on the report or x-rays.",
                  "I will not purchase a horse if there are any adverse findings unless these have already been disclosed in writing.",
                  "I understand that most horses do not have completely 'finding free' x-rays or vet checks.",
                  "I would consider purchasing a horse with manageable / low risk findings.",
                  "I would consider purchasing a horse with manageable / moderate risk findings.",
                ]}
                value={data.vetExpectations}
                onChange={(v) => set("vetExpectations", v)}
              />
            </FieldGroup>
            <FieldGroup label="Horse management — conditions under which the horse will be kept and managed (select all that apply)" required>
              <CheckboxGroup
                name="managementConditions"
                options={[
                  "horse will be paddocked in a herd situation",
                  "horse will be kept in an individual paddock with other horses in sight",
                  "the horse will be kept completely alone without other horses on the property",
                  "horse will be stabled with paddock access",
                  "horse will be stabled 24 hours a day",
                  "this is a 'first horse' purchase for the buyer / family",
                  "horse will be kept at home with owner / rider",
                  "horse will be kept at an agistment facility",
                  "the horse will be solely hand fed / no access to grazing",
                  "new home is an 'itch' area",
                  "we have a small straight load float",
                  "we do not have access to a local vet",
                  "other",
                ]}
                values={data.managementConditions}
                onChange={(v) => set("managementConditions", v)}
              />
            </FieldGroup>
            <FieldGroup label="Location and name of agistment facility (if kept at home, write 'Home')" required>
              <TextInput value={data.agistmentLocation} onChange={(v) => set("agistmentLocation", v)} placeholder="e.g. Sunny Ridge Agistment, Samford QLD or Home" />
            </FieldGroup>
            <FieldGroup label="Experience and support" required>
              <RadioGroup
                name="experienceLevel"
                options={[
                  "I am a very experienced horse owner.",
                  "I haven't got a lot of experience but I have experienced horse people around me and lots of support.",
                  "I haven't got a lot of experience or support.",
                  "This is a 'first horse' purchase.",
                ]}
                value={data.experienceLevel}
                onChange={(v) => set("experienceLevel", v)}
              />
            </FieldGroup>
            <FieldGroup label="My expectations regarding buying a horse and settling it into its new home" required>
              <RadioGroup
                name="settlingExpectations"
                options={[
                  "I understand that horses take time to settle into their new home and that trying to replicate the management of their old home will assist this process. I will take my time to build a relationship with the horse.",
                  "I expect the new horse to 'hit the ground running' and not take any time to settle. I intend to manage it my own way, regardless of previous management. I do not believe that a horse's behaviour is affected by feed, management or a change of home.",
                ]}
                value={data.settlingExpectations}
                onChange={(v) => set("settlingExpectations", v)}
              />
            </FieldGroup>
            {data.managementConditions.includes("other") && (
              <FieldGroup label="Please list any other horse management factors">
                <TextArea value={data.otherManagementFactors} onChange={(v) => set("otherManagementFactors", v)} placeholder="Describe other management factors…" />
              </FieldGroup>
            )}
          </div>
        )}

        {/* ── Step 11: Waiver & Signature ──────────────────────────────────── */}
        {step === 11 && (
          <div className="space-y-6">
            <div className="rounded-lg bg-stone-100 border border-stone-300 p-4 text-sm text-stone-700 space-y-3 max-h-72 overflow-y-auto">
              <p className="font-bold text-stone-900">Waiver</p>
              <p>In signing this Agreement, the potential buyer agrees to and accepts the following Waiver conditions:</p>
              <p>I, the undersigned, in consideration for being permitted to participate in any way in horse sport activities including entering the property, viewing, handling, riding, understand, acknowledge and accept that:</p>
              <ul className="list-disc pl-4 space-y-2">
                <li>Horse sports are a dangerous recreational activity and horses can act in a sudden and unpredictable way.</li>
                <li>There is a significant risk that serious injury or death may result from horse riding and associated activities and I freely assume all such risks, even if arising from the negligence of Performance Horse Sales (PHS) and / or the horse's connections.</li>
                <li>I voluntarily participate at my own risk, and assume sole responsibility for any injury, death or property damage I may suffer.</li>
                <li>I understand and acknowledge the dangers associated with alcohol and mind-altering drugs and agree not to consume them before and during the activity.</li>
                <li>I will follow the directions of the horse's connections and understand that any misconduct may result in cancellation of my participation.</li>
                <li>I agree to wear a helmet at all times whilst participating.</li>
                <li>I, for myself and on behalf of my heirs, assigns, personal representatives and next of kin, hereby release and hold harmless PHS and the horse's connections with respect to all injury, disability, death, or loss or damage to person or property.</li>
              </ul>
            </div>

            <FieldGroup label="Waiver agreement" required>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.waiverAgreed}
                  onChange={(e) => set("waiverAgreed", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-300 accent-[#24384e] shrink-0"
                />
                <span className="text-sm text-stone-700 leading-snug">I agree to the Waiver conditions above.</span>
              </label>
            </FieldGroup>

            <div className="rounded-lg bg-stone-100 border border-stone-300 p-4 text-sm text-stone-700 space-y-2">
              <p className="font-bold text-stone-900">Declaration by potential buyer</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>I declare that I am 18 years of age or older.</li>
                <li>I am the person responsible for making the final decision regarding this purchase.</li>
                <li>I am funding this purchase.</li>
                <li>My circumstances are exactly as described in this form.</li>
                <li>Once a viewing is booked, I am bound by the Terms and Conditions available at <a href="https://www.performancehorsesales.com.au/phs-services/forms-terms-conditions" target="_blank" rel="noopener noreferrer" className="text-[#24384e] underline">performancehorsesales.com.au</a>.</li>
              </ul>
            </div>

            <FieldGroup label="Declaration agreement" required>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.declarationAgreed}
                  onChange={(e) => set("declarationAgreed", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-300 accent-[#24384e] shrink-0"
                />
                <span className="text-sm text-stone-700 leading-snug">I agree and have digitally signed this declaration.</span>
              </label>
            </FieldGroup>

            <FieldGroup label="Your Signature" required>
              <p className="text-xs text-stone-500 mb-2">Sign in the box below using your mouse or finger.</p>
              <SignatureCanvas onChange={(dataUrl) => set("signatureData", dataUrl ?? "")} />
            </FieldGroup>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-10 pt-6 border-t border-stone-200">
          {step > 1 ? (
            <button
              onClick={back}
              className="px-5 py-2 rounded-md border border-stone-300 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}
          {step < TOTAL_STEPS ? (
            <button
              onClick={next}
              className="px-6 py-2 rounded-md text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#24384e" }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="px-6 py-2 rounded-md text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "hsl(20 55% 45%)" }}
            >
              {submitting ? "Submitting…" : "Submit EOI"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
