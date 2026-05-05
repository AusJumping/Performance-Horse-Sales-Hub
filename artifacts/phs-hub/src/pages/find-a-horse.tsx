import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import SignaturePad from "@/components/signature-pad";
const phsLogo = `${import.meta.env.BASE_URL}phs-logo.png`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5 pb-3 border-b border-stone-200">
      <h3 className="text-sm font-bold text-[#24384e] uppercase tracking-widest">{title}</h3>
      {sub && <p className="text-xs text-stone-500 mt-1">{sub}</p>}
    </div>
  );
}

function FieldLabel({ label, required, note }: { label: string; required?: boolean; note?: string }) {
  return (
    <div className="mb-2">
      <label className="block text-sm font-semibold text-stone-800 leading-snug">
        {label}{required && <span className="text-amber-700 ml-1">*</span>}
      </label>
      {note && <p className="text-xs text-stone-500 mt-1 leading-snug">{note}</p>}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}

function TextInput({ name, value, onChange, placeholder, type = "text" }: { name: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} name={name} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#24384e] focus:outline-none focus:ring-1 focus:ring-[#24384e]" />
  );
}

function TextArea({ name, value, onChange, placeholder, rows = 3 }: { name: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea name={name} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#24384e] focus:outline-none focus:ring-1 focus:ring-[#24384e] resize-y" />
  );
}

function CheckboxGroup({ name, options, values, onChange }: { name: string; options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt]);
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt} className="flex items-start gap-3 cursor-pointer group">
          <input type="checkbox" name={name} value={opt} checked={values.includes(opt)} onChange={() => toggle(opt)}
            className="mt-1 h-4 w-4 rounded border-stone-300 accent-[#24384e] shrink-0" />
          <span className="text-sm text-stone-700 group-hover:text-stone-900 leading-snug">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function RadioGroup({ name, options, value, onChange }: { name: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt} className="flex items-start gap-3 cursor-pointer group">
          <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)}
            className="mt-1 h-4 w-4 border-stone-300 accent-[#24384e] shrink-0" />
          <span className="text-sm text-stone-700 group-hover:text-stone-900 leading-snug">{opt}</span>
        </label>
      ))}
    </div>
  );
}

// ─── Form State ───────────────────────────────────────────────────────────────

type FD = {
  email: string;
  emailOptional: string;
  firstName: string;
  surname: string;
  location: string;
  phone: string;
  searchServiceLevel: string;
  mainReason: string;
  searchFactors: string[];
  preferredLocation: string;
  budget: string;
  horseAgeRange: string[];
  horseHeight: string[];
  characteristicsLiked: string;
  dealBreakers: string;
  mainDiscipline: string;
  horseType: string;
  riderGoals: string;
  currentCompetitionLevel: string;
  futureGoals: string;
  riderCompetence: string;
  ridingConfidence: string;
  riderHistory: string;
  riderAge: string;
  horseStatements: string[];
  horseManagement: string[];
  searchRestrictions: string[];
  otherInfo: string;
  termsAgreed: boolean;
  readyToSign: string;
  signature: string;
};

const EMPTY: FD = {
  email: "", emailOptional: "", firstName: "", surname: "", location: "", phone: "",
  searchServiceLevel: "", mainReason: "", searchFactors: [], preferredLocation: "",
  budget: "", horseAgeRange: [], horseHeight: [], characteristicsLiked: "", dealBreakers: "",
  mainDiscipline: "", horseType: "", riderGoals: "", currentCompetitionLevel: "", futureGoals: "",
  riderCompetence: "", ridingConfidence: "", riderHistory: "", riderAge: "",
  horseStatements: [], horseManagement: [], searchRestrictions: [], otherInfo: "",
  termsAgreed: false, readyToSign: "", signature: "",
};

const STEPS = [
  "Contact Details",
  "Search Service",
  "About Your Search",
  "Location & Budget",
  "Horse Criteria",
  "Discipline & Horse Type",
  "Goals & Level",
  "Rider Profile",
  "Horse Requirements",
  "Terms & Signature",
];

const SEARCH_FACTORS = [
  "I have encountered issues when viewing or purchasing a horse.",
  "I have had issues with newly purchased horses.",
  "I am time poor regarding attending viewings.",
  "I have a very fixed criteria and set views on what I want to purchase.",
  "I am unsure of what I want to purchase.",
  "I am flexible and would love some guidance.",
  "I have been looking for a horse for a long time.",
  "I have just started looking for a horse.",
  "I will run everything past my coach before making a decision.",
  "I am confident of making my own decision regarding the purchase.",
  "I have had issues with horses that impact my ability to confidently view a horse (this is fine and we can work with you on this).",
  "I have medical issues that may impact my ability to view or ride a horse (this is fine and we can work with you on this).",
  "I am very fussy and most horses just don't strike my fancy.",
];

const DISCIPLINES = [
  "Eventing / Combined Training", "Showjumping", "Dressage", "Showing",
  "Interschool competition", "Pony Club all rounder", "Adult Rider Club all rounder",
  "Lower level all rounder", "Working Equitation", "Campdrafting", "Reining",
  "Western Pleasure", "Team Penning", "Mustering / Feed Lot work",
  "Trail riding / pleasure", "Companion / Therapy", "Breeding",
];

const HORSE_TYPES = [
  "Exceptional top level competition horse (with budget to match)",
  "Competitive performance horse", "Schoolmaster",
  "'Second / Third' horse or pony", "'First' horse or pony",
  "Prospect that I can educate further.", "Mature horse with a basic education",
  "Green broken", "Unbroken",
];

const RIDER_GOALS = [
  "National level competitions", "State level competitions", "Local competitions",
  "Club days", "Clinics", "Lessons", "I do not wish to compete this horse",
];

const RIDER_COMPETENCE = [
  "Experienced rider — lifetime of experience producing and competing both young and educated horses. Unfazed by any nonsense and has the ability to ride green horses.",
  "Capable rider — riding and competing regularly for at least five years, independent hands and balanced seat; confident in all situations. Can handle some quirks.",
  "Intermediate rider — riding and competing regularly for at least three years, independent hands and balanced seat; confident if horse is reasonably well behaved. Prefers a schoolmaster type.",
  "Novice rider — riding regularly for at least a year, independent hands and balanced seat; can walk, trot and canter. Needs an impeccably well behaved, established schoolmaster without quirks.",
  "Beginner — riding for less than a year, sometimes unbalanced and unsure/nervous. Needs a very forgiving, experienced schoolmaster.",
];

const RIDING_CONFIDENCE = [
  "confident",
  "somewhat nervous",
  "nervous",
  "my knees are shaking and I am terrified (don't worry, we can find a horse that doesn't notice!)",
  "how I feel, depends on how I feel about the horse",
];

const HORSE_STATEMENTS = [
  "has excellent results", "has competed", "has had outings",
  "has no medical issues, injuries or management needs",
  "management needs are ok as long as they don't affect performance",
  "no quirks", "no vices", "quirks and vices are ok as long as manageable by rider",
  "sharp and reactive to the aides", "willing and responsive to the aides", "more 'woah than go'.",
  "generally calm and non reactive but I realise that horses are living beings and things can happen.",
  "familiar with Agricultural Show atmosphere - fireworks and sideshows",
  "familiar with farm life.",
  "comfortable with the nonsense and noise of child riders or family members.",
  "there aren't any 'not negotiable' with this search (if you tick this - you will be our favourite client!)",
  "completely bombproof - this may not be possible to find depending on other criteria",
];

const HORSE_MANAGEMENT = [
  "Horse will be kept at home with owners.", "Horse will be on full care agistment.",
  "Horse will be at DIY agistment.", "Horse will be paddocked alone.",
  "Horse will be paddocked in a herd situation.",
  "Horse will be paddocked alone but have horses over the fence or in sight.",
  "Horse will be stabled at night and paddocked during the day.",
  "Horse will be stabled 24 hours a day.", "Horse will be in an 'itch' area.",
  "I have a small straight load float.", "I have a large straight load float.",
  "I have an angle float or truck.", "This is a 'first horse' purchase.",
  "This is a 'first horse' purchase but buyers have lots of expert support.",
  "Vets are available locally.", "Vets are not available locally.",
  "I have owned horses with metabolic disorders or who are considered to be 'overweight'.",
  "I have experience riding and training challenging or hot horses.",
  "I have experience feeding and retraining Off the Track thoroughbreds.",
  "I have experience educating young horses.",
  "I have experience managing horses with medical needs.",
];

const SEARCH_RESTRICTIONS = [
  "one gender - i.e. only geldings",
  "by breed - i.e. no thoroughbreds",
  "colour or markings",
  "location - within 5 hours drive",
  "height i.e. 12-13hh - less than two hands height range and not open to other options",
  "budget i.e. it is less than the advertised market price for horses that match the search criteria",
  "completely unflappable in every situation and vice / quirk free",
  "not entirely compatible criteria - i.e. schoolmaster under 10 years old",
  "less than 1000k search area",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FindAHorse() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [fd, setFd] = useState<FD>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FD, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FD>(key: K) => (val: FD[K]) => setFd(prev => ({ ...prev, [key]: val }));
  const s = (k: keyof FD) => fd[k] as string;
  const a = (k: keyof FD) => fd[k] as string[];

  const validate = (step: number): Partial<Record<keyof FD, string>> => {
    const e: Partial<Record<keyof FD, string>> = {};
    switch (step) {
      case 0:
        if (!s("email")) e.email = "Required";
        if (!s("firstName")) e.firstName = "Required";
        if (!s("surname")) e.surname = "Required";
        if (!s("location")) e.location = "Required";
        if (!s("phone")) e.phone = "Required";
        break;
      case 1:
        if (!s("searchServiceLevel")) e.searchServiceLevel = "Please select a service";
        break;
      case 2:
        if (!s("mainReason")) e.mainReason = "Required";
        if (a("searchFactors").length === 0) e.searchFactors = "Please select at least one";
        break;
      case 3:
        if (!s("preferredLocation")) e.preferredLocation = "Required";
        if (!s("budget")) e.budget = "Required";
        break;
      case 4:
        if (a("horseAgeRange").length === 0) e.horseAgeRange = "Please select at least one";
        if (a("horseHeight").length === 0) e.horseHeight = "Please select at least one";
        if (!s("characteristicsLiked")) e.characteristicsLiked = "Required";
        if (!s("dealBreakers")) e.dealBreakers = "Required";
        break;
      case 5:
        if (!s("mainDiscipline")) e.mainDiscipline = "Required";
        if (!s("horseType")) e.horseType = "Required";
        break;
      case 6:
        if (!s("riderGoals")) e.riderGoals = "Required";
        if (!s("currentCompetitionLevel")) e.currentCompetitionLevel = "Required";
        if (!s("futureGoals")) e.futureGoals = "Required";
        break;
      case 7:
        if (!s("riderCompetence")) e.riderCompetence = "Required";
        if (!s("ridingConfidence")) e.ridingConfidence = "Required";
        if (!s("riderHistory")) e.riderHistory = "Required";
        if (!s("riderAge")) e.riderAge = "Required";
        break;
      case 8:
        if (a("horseStatements").length === 0) e.horseStatements = "Please select at least one";
        if (a("horseManagement").length === 0) e.horseManagement = "Please select at least one";
        break;
      case 9:
        if (!fd.termsAgreed) e.termsAgreed = "You must agree to the terms to proceed";
        if (!s("readyToSign")) e.readyToSign = "Please select one";
        if (!s("signature") || !s("signature").startsWith("data:image")) e.signature = "Please draw your signature above";
        break;
    }
    return e;
  };

  const next = () => {
    const errs = validate(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast({ title: "Please complete all required fields.", variant: "destructive" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setErrors({});
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const back = () => { setErrors({}); setStep(s => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const submit = async () => {
    const errs = validate(9);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast({ title: "Please complete all required fields.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { email, emailOptional, firstName, surname, location, phone, searchServiceLevel,
        mainReason, searchFactors, preferredLocation, budget, horseAgeRange, horseHeight,
        characteristicsLiked, dealBreakers, mainDiscipline, horseType, riderGoals,
        currentCompetitionLevel, futureGoals, riderCompetence, ridingConfidence, riderHistory,
        riderAge, horseStatements, horseManagement, searchRestrictions, otherInfo,
        termsAgreed, readyToSign, signature } = fd;

      const res = await fetch("/api/horse-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, surname, email, emailOptional, phone, location, searchServiceLevel,
          formData: {
            mainReason, searchFactors, preferredLocation, budget, horseAgeRange, horseHeight,
            characteristicsLiked, dealBreakers, mainDiscipline, horseType, riderGoals,
            currentCompetitionLevel, futureGoals, riderCompetence, ridingConfidence,
            riderHistory, riderAge, horseStatements, horseManagement, searchRestrictions,
            otherInfo, readyToSign,
          },
          termsAgreed,
          signatureData: signature,
        }),
      });

      if (!res.ok) throw new Error("Submission failed");
      setLocation("/find-a-horse/thank-you");
    } catch {
      toast({ title: "Submission failed. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-[#24384e] text-white py-8 px-4 text-center">
        <img src={phsLogo} alt="Performance Horse Sales logo" className="mx-auto mb-4 h-24 w-24 rounded-full object-cover shadow-lg" />
        <h1 className="text-2xl sm:text-3xl font-bold">Performance Horse Sales</h1>
        <p className="text-white/80 text-sm mt-1">'Please Help Me Find a Horse' — Search Request Form</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
            <span className="font-medium">Step {step + 1} of {STEPS.length}</span>
            <span>{STEPS[step]}</span>
          </div>
          <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#24384e] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Intro (step 0 only) */}
        {step === 0 && (
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 mb-6 text-sm text-stone-700 space-y-3 leading-relaxed">
            <p className="font-semibold text-[#24384e]">Why use our Search Service?</p>
            <p>We have extensive contacts with both professionals and individuals with horses to sell — many 'off market'.</p>
            <p>Once we receive your criteria, we will source and compile an evolving database of horses that meet your needs. Each time a horse is added, we will let you know.</p>
            <p>Often horses are purchased by our clients in a week or two — after they have spent months to years of fruitless searching.</p>
            <p className="text-xs text-stone-500">* Prices are PLUS GST &nbsp;·&nbsp; Please contact us on <a href="tel:0428239317" className="text-[#24384e] font-medium">0428 239 317</a> if you do not receive a response within 12 hours.</p>
          </div>
        )}

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-6">

          {/* Step 0 — Contact */}
          {step === 0 && (
            <div className="space-y-5">
              <SectionHeader title="Contact Details" />
              <div>
                <FieldLabel label="Primary Email" required />
                <TextInput name="email" value={s("email")} onChange={set("email")} placeholder="you@example.com" type="email" />
                <FieldError message={errors.email} />
              </div>
              <div>
                <FieldLabel label="Secondary / alternative email" />
                <TextInput name="emailOptional" value={s("emailOptional")} onChange={set("emailOptional")} placeholder="Optional" type="email" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="First name" required />
                  <TextInput name="firstName" value={s("firstName")} onChange={set("firstName")} />
                  <FieldError message={errors.firstName} />
                </div>
                <div>
                  <FieldLabel label="Surname" required />
                  <TextInput name="surname" value={s("surname")} onChange={set("surname")} />
                  <FieldError message={errors.surname} />
                </div>
              </div>
              <div>
                <FieldLabel label="Suburb / town and state" required />
                <TextInput name="location" value={s("location")} onChange={set("location")} placeholder="e.g. Bowral NSW" />
                <FieldError message={errors.location} />
              </div>
              <div>
                <FieldLabel label="Phone number" required />
                <TextInput name="phone" value={s("phone")} onChange={set("phone")} placeholder="0400 000 000" type="tel" />
                <FieldError message={errors.phone} />
              </div>
            </div>
          )}

          {/* Step 1 — Search Service */}
          {step === 1 && (
            <div className="space-y-5">
              <SectionHeader title="Search Service Selection" />
              <div className="space-y-4">
                {[
                  {
                    value: "level1",
                    label: "'Horse Finder' Standard Search",
                    price: "$500 upfront PLUS $500 completion fee",
                    desc: "Perfect if you are struggling to find horses but are confident about managing the assessment and buying process yourself. Includes creation of search criteria and ads, placement across online and social media, professional and private contacts, and a database of up to 30 horses.",
                  },
                  {
                    value: "level2",
                    label: "Premium 'Concierge' Search",
                    price: "$1,000 upfront PLUS 5% completion fee (min $1,000, capped at $2,000)",
                    desc: "Perfect if you don't have the time or skills to find and successfully secure the horse of your dreams. Includes all Standard inclusions PLUS managing all initial enquiries, negotiation, booking viewings, vet check guidance, transport contacts, and a Bill of Sale after completion.",
                  },
                ].map(opt => (
                  <label key={opt.value}
                    className={`block rounded-xl border-2 p-4 cursor-pointer transition-all ${s("searchServiceLevel") === opt.value ? "border-[#24384e] bg-[#24384e]/5" : "border-stone-200 hover:border-stone-300"}`}>
                    <div className="flex items-start gap-3">
                      <input type="radio" name="searchServiceLevel" value={opt.value}
                        checked={s("searchServiceLevel") === opt.value}
                        onChange={() => set("searchServiceLevel")(opt.value)}
                        className="mt-1 h-4 w-4 accent-[#24384e] shrink-0" />
                      <div>
                        <p className="font-semibold text-stone-900 text-sm">{opt.label}</p>
                        <p className="text-xs text-amber-700 font-medium mt-0.5">{opt.price}</p>
                        <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{opt.desc}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <FieldError message={errors.searchServiceLevel} />
              <p className="text-xs text-stone-400 italic">Note: Industry standard search commission is 10% — this is just to find the horse. Our fee covers the full process.</p>
            </div>
          )}

          {/* Step 2 — About Your Search */}
          {step === 2 && (
            <div className="space-y-5">
              <SectionHeader title="About Your Search" />
              <div>
                <FieldLabel label="Main reason why you would like some help finding a horse" required />
                <TextArea name="mainReason" value={s("mainReason")} onChange={set("mainReason")} rows={4} placeholder="Tell us what's brought you to PHS Search…" />
                <FieldError message={errors.mainReason} />
              </div>
              <div>
                <FieldLabel label="Search factors — tick all that apply" required />
                <CheckboxGroup name="searchFactors" options={SEARCH_FACTORS} values={a("searchFactors")} onChange={set("searchFactors")} />
                <FieldError message={errors.searchFactors} />
              </div>
            </div>
          )}

          {/* Step 3 — Location & Budget */}
          {step === 3 && (
            <div className="space-y-5">
              <SectionHeader title="Location & Budget" />
              <div>
                <FieldLabel label="Preferred location of search" required
                  note="Please think about the cost, time and logistics of this range and whether it is really feasible." />
                <RadioGroup name="preferredLocation" options={["Worldwide", "Australia Wide", "Surrounding states", "State wide"]}
                  value={s("preferredLocation")} onChange={set("preferredLocation")} />
                <FieldError message={errors.preferredLocation} />
              </div>
              <div>
                <FieldLabel label="Budget (not including search fees, vetting and transport costs)" required />
                <TextInput name="budget" value={s("budget")} onChange={set("budget")} placeholder="e.g. $15,000 – $20,000" />
                <FieldError message={errors.budget} />
              </div>
            </div>
          )}

          {/* Step 4 — Horse Criteria */}
          {step === 4 && (
            <div className="space-y-5">
              <SectionHeader title="Horse Criteria" />
              <div>
                <FieldLabel label="Preferred horse age range" required />
                <CheckboxGroup name="horseAgeRange" options={["Under 7", "7 and under 16", "Under 18", "Flexible"]}
                  values={a("horseAgeRange")} onChange={set("horseAgeRange")} />
                <FieldError message={errors.horseAgeRange} />
              </div>
              <div>
                <FieldLabel label="Preferred horse height" required
                  note="Potential horses will be sent within half a hand (5cm) either side of criteria selected. If you wish to have a broader criteria, select two options. A narrower criteria is only available on a Premium Search." />
                <CheckboxGroup name="horseHeight" options={["Under 12hh", "12–14.2hh", "14.2–16hh", "Over 16hh"]}
                  values={a("horseHeight")} onChange={set("horseHeight")} />
                <FieldError message={errors.horseHeight} />
              </div>
              <div>
                <FieldLabel label="Please list a maximum of 3 characteristics that you really like in a horse" required />
                <TextArea name="characteristicsLiked" value={s("characteristicsLiked")} onChange={set("characteristicsLiked")}
                  placeholder="1. Kind and willing&#10;2. Forward going but not hot&#10;3. Good on the ground" rows={3} />
                <FieldError message={errors.characteristicsLiked} />
              </div>
              <div>
                <FieldLabel label="Please list a maximum of 3 deal breakers that you will not tolerate" required />
                <TextArea name="dealBreakers" value={s("dealBreakers")} onChange={set("dealBreakers")}
                  placeholder="1. Bucks&#10;2. Rears&#10;3. Hard to catch" rows={3} />
                <FieldError message={errors.dealBreakers} />
              </div>
            </div>
          )}

          {/* Step 5 — Discipline & Horse Type */}
          {step === 5 && (
            <div className="space-y-5">
              <SectionHeader title="Discipline & Horse Type" />
              <div>
                <FieldLabel label="Rider's main discipline or focus for the horse" required />
                <RadioGroup name="mainDiscipline" options={DISCIPLINES} value={s("mainDiscipline")} onChange={set("mainDiscipline")} />
                <FieldError message={errors.mainDiscipline} />
              </div>
              <div>
                <FieldLabel label="Which statement best describes the horse you are looking for" required />
                <RadioGroup name="horseType" options={HORSE_TYPES} value={s("horseType")} onChange={set("horseType")} />
                <FieldError message={errors.horseType} />
              </div>
            </div>
          )}

          {/* Step 6 — Goals & Level */}
          {step === 6 && (
            <div className="space-y-5">
              <SectionHeader title="Goals & Current Level" />
              <div>
                <FieldLabel label="Rider's goals for this horse, performance wise" required
                  note="Please choose the highest goal." />
                <RadioGroup name="riderGoals" options={RIDER_GOALS} value={s("riderGoals")} onChange={set("riderGoals")} />
                <FieldError message={errors.riderGoals} />
              </div>
              <div>
                <FieldLabel label="Horse must be training or competing at the following level" required
                  note="e.g. Novice dressage, EVA95 eventing, 100cm showjumping" />
                <TextInput name="currentCompetitionLevel" value={s("currentCompetitionLevel")} onChange={set("currentCompetitionLevel")}
                  placeholder="e.g. Prelim dressage / 80cm SJ" />
                <FieldError message={errors.currentCompetitionLevel} />
              </div>
              <div>
                <FieldLabel label="Rider's future goals for this horse" required />
                <TextArea name="futureGoals" value={s("futureGoals")} onChange={set("futureGoals")}
                  placeholder="Where do you hope to be in 2–3 years with this horse?" rows={3} />
                <FieldError message={errors.futureGoals} />
              </div>
            </div>
          )}

          {/* Step 7 — Rider Profile */}
          {step === 7 && (
            <div className="space-y-5">
              <SectionHeader title="Rider Profile" />
              <div>
                <FieldLabel label="Rider competence level" required />
                <RadioGroup name="riderCompetence" options={RIDER_COMPETENCE} value={s("riderCompetence")} onChange={set("riderCompetence")} />
                <FieldError message={errors.riderCompetence} />
              </div>
              <div>
                <FieldLabel label="When I am riding, I feel…" required />
                <RadioGroup name="ridingConfidence" options={RIDING_CONFIDENCE} value={s("ridingConfidence")} onChange={set("ridingConfidence")} />
                <FieldError message={errors.ridingConfidence} />
              </div>
              <div>
                <FieldLabel label="Rider history" required
                  note="Significant milestones, competitions, current comfort zone, issues, goals etc." />
                <TextArea name="riderHistory" value={s("riderHistory")} onChange={set("riderHistory")} rows={4}
                  placeholder="Tell us about your riding background…" />
                <FieldError message={errors.riderHistory} />
              </div>
              <div>
                <FieldLabel label="Rider age or age bracket" required
                  note="If you don't think this is relevant to the search, write 'adult' or 'child'." />
                <TextInput name="riderAge" value={s("riderAge")} onChange={set("riderAge")} placeholder="e.g. Adult, 35" />
                <FieldError message={errors.riderAge} />
              </div>
            </div>
          )}

          {/* Step 8 — Horse Requirements */}
          {step === 8 && (
            <div className="space-y-5">
              <SectionHeader title="Horse Requirements" />
              <div>
                <FieldLabel label="Statements that describe the horse you are looking for" required />
                <CheckboxGroup name="horseStatements" options={HORSE_STATEMENTS} values={a("horseStatements")} onChange={set("horseStatements")} />
                <FieldError message={errors.horseStatements} />
              </div>
              <div>
                <FieldLabel label="Horse management notes" required
                  note="Please be honest — these factors will help the seller assess whether the horse is suitable for you." />
                <CheckboxGroup name="horseManagement" options={HORSE_MANAGEMENT} values={a("horseManagement")} onChange={set("horseManagement")} />
                <FieldError message={errors.horseManagement} />
              </div>
              <div>
                <FieldLabel label="I would like to restrict the search by the following" required={false}
                  note="Note: these may restrict our ability to take on the search or may incur a surcharge." />
                <CheckboxGroup name="searchRestrictions" options={SEARCH_RESTRICTIONS} values={a("searchRestrictions")} onChange={set("searchRestrictions")} />
              </div>
              <div>
                <FieldLabel label="Any other information that may be useful to the search" />
                <TextArea name="otherInfo" value={s("otherInfo")} onChange={set("otherInfo")} rows={4}
                  placeholder="Anything else Sally should know…" />
              </div>
            </div>
          )}

          {/* Step 9 — Terms & Signature */}
          {step === 9 && (
            <div className="space-y-5">
              <SectionHeader title="General Search Terms & Signature" />
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-stone-700 space-y-1.5 leading-snug">
                <p>· I am over 18 years old and have read, understand and agree to the terms below.</p>
                <p>· I am ready, willing and able to view and purchase — horses are added as fast or slow as they are found.</p>
                <p>· I guarantee that all information provided in my search form and criteria is correct and that the search is exactly as described.</p>
                <p>· I understand that no horse will fit every single, exact criteria — the 30 horses added to the database will be horses that PHS believes are potentially 'fit for purpose'.</p>
                <p>· I understand that the search process is designed to help me work out what I need/want, what is available at my budget, and to help me find the horse.</p>
                <p>· I agree to pay a deposit to hold the horse for second viewings and vet checks.</p>
                <p>· I agree to pay costs, in full, when they are due.</p>
                <p>· I have READ and AGREED to the full Search Terms and Conditions publicly available on our website.</p>
              </div>
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={fd.termsAgreed} onChange={(e) => setFd(p => ({ ...p, termsAgreed: e.target.checked }))}
                    className="mt-1 h-4 w-4 rounded border-stone-300 accent-[#24384e] shrink-0" />
                  <span className="text-sm text-stone-800 font-medium">I agree to the General Search Terms above.</span>
                </label>
                <FieldError message={errors.termsAgreed} />
              </div>
              <div>
                <FieldLabel label="I am ready to…" required />
                <RadioGroup name="readyToSign" options={[
                  "I am ready to sign the Costs Agreement, pay the invoice and to start the search.",
                  "I would like to discuss the process further, before proceeding. Please note, we do not discuss the market or our strategy, prior to the client paying the invoice and the search.",
                ]} value={s("readyToSign")} onChange={set("readyToSign")} />
                <FieldError message={errors.readyToSign} />
              </div>
              <div>
                <FieldLabel label="Your Signature" required />
                <div className="rounded-lg border border-stone-300 overflow-hidden">
                  <SignaturePad
                    onSave={(dataUrl) => setFd(p => ({ ...p, signature: dataUrl }))}
                    savedSignature={s("signature")}
                  />
                </div>
                <FieldError message={errors.signature} />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button onClick={back} className="px-5 py-2.5 rounded-md border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-100 transition-colors">
              ← Back
            </button>
          ) : <div />}

          {step < STEPS.length - 1 ? (
            <button onClick={next} className="px-6 py-2.5 rounded-md bg-[#24384e] text-white text-sm font-semibold hover:bg-[#1a2d3f] transition-colors shadow-sm">
              Next →
            </button>
          ) : (
            <button onClick={submit} disabled={submitting}
              className="px-6 py-2.5 rounded-md bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 disabled:opacity-50 transition-colors shadow-sm">
              {submitting ? "Submitting…" : "Submit Search Request"}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">
          Questions? Call{" "}
          <a href="tel:0428239317" className="text-[#24384e] font-medium">0428 239 317</a>
          {" "}— we respond within 12 hours.
        </p>
      </div>
    </div>
  );
}
