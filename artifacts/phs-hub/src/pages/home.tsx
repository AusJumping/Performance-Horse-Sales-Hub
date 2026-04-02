import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateSubmission } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
const phsLogo = `${import.meta.env.BASE_URL}phs-logo.png`;

// ─── Checkbox Group Helper ───────────────────────────────────────────────────

function CheckboxGroup({
  name,
  options,
  values,
  onChange,
}: {
  name: string;
  options: string[];
  values: string[];
  onChange: (vals: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  };
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            name={name}
            value={opt}
            checked={values.includes(opt)}
            onChange={() => toggle(opt)}
            className="mt-1 h-4 w-4 rounded border-stone-300 text-[#24384e] focus:ring-[#24384e] shrink-0 accent-[#24384e]"
            data-testid={`checkbox-${name}-${opt.slice(0, 20).replace(/[\s/]+/g, "-").toLowerCase()}`}
          />
          <span className="text-sm text-stone-700 group-hover:text-stone-900 leading-snug">{opt}</span>
        </label>
      ))}
    </div>
  );
}

// ─── Radio Group Helper ───────────────────────────────────────────────────────

function RadioGroup({
  name,
  options,
  value,
  onChange,
  inline = false,
}: {
  name: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "flex flex-wrap gap-4" : "space-y-2"}>
      {options.map((opt) => (
        <label key={opt} className="flex items-start gap-3 cursor-pointer group">
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="mt-1 h-4 w-4 border-stone-300 text-[#24384e] focus:ring-[#24384e] shrink-0 accent-[#24384e]"
            data-testid={`radio-${name}-${opt.slice(0, 20).replace(/[\s/]+/g, "-").toLowerCase()}`}
          />
          <span className="text-sm text-stone-700 group-hover:text-stone-900 leading-snug">{opt}</span>
        </label>
      ))}
    </div>
  );
}

// ─── Field Label ──────────────────────────────────────────────────────────────

function FieldLabel({
  label,
  required,
  note,
}: {
  label: string;
  required?: boolean;
  note?: string;
}) {
  return (
    <div className="mb-2">
      <label className="block text-sm font-semibold text-stone-800 leading-snug">
        {label}
        {required && <span className="text-amber-700 ml-1">*</span>}
      </label>
      {note && (
        <p className="text-xs text-stone-500 mt-1 leading-snug">{note}</p>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5 pb-3 border-b border-stone-200">
      <h3 className="text-sm font-bold text-[#24384e] uppercase tracking-widest">
        {title}
      </h3>
      {sub && <p className="text-xs text-stone-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Disclosure Box ───────────────────────────────────────────────────────────

function DisclosureBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-xs text-stone-600 mb-4 space-y-1 leading-snug">
      {children}
    </div>
  );
}

// ─── Text Input ───────────────────────────────────────────────────────────────

function TextInput({
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-testid={`input-${name}`}
      className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#24384e] focus:outline-none focus:ring-1 focus:ring-[#24384e]"
    />
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

function TextArea({
  name,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      data-testid={`textarea-${name}`}
      className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#24384e] focus:outline-none focus:ring-1 focus:ring-[#24384e] resize-y"
    />
  );
}

// ─── Error Message ────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  "Intro & Contact Details",
  "Listing Service",
  "Horse Details",
  "Education & Disciplines",
  "Rider Suitability",
  "Under Saddle & Vices",
  "Work, Fitness & Competition",
  "Handling, Feeding & Medical",
  "Health Records & Vet",
  "Sale Details & Declaration",
];

// ─── Form State Type ──────────────────────────────────────────────────────────

type FD = {
  email: string;
  declaration18: string;
  firstName: string;
  secondName: string;
  streetAddress: string;
  suburbTownStatePostcode: string;
  phoneNumber: string;
  currentRiderName: string;
  listingServiceType: string;
  listingServiceAdditionalInfo: string;
  additionalMarketing: string[];
  photosVideoCommitment: string;
  preferredSalesPrice: string;
  salesAdvertisementDescription: string;
  horseName: string;
  horseLocation: string;
  age: string;
  height: string;
  colour: string;
  gender: string;
  breed: string;
  registrations: string;
  generalEducation: string[];
  educationAdditionalInfo: string;
  disciplines: string[];
  skills: string[];
  needsWorkToImprove: string;
  minimumRiderLevel: string;
  riderSuitabilityExtra: string[];
  horseRequires: string[];
  riderSuitabilityVariesInfo: string;
  underSaddle: string[];
  underSaddleAdditionalInfo: string;
  vicesOrQuirks: string[];
  vicesAdditionalInfo: string;
  behaviourInOutOfWork: string[];
  fitnessLevel: string;
  currentlyCompeting: string;
  competitionHistory: string;
  competitionHistoryAdditionalInfo: string;
  gearTackNeeds: string[];
  gearAdditionalInfo: string;
  handlingBehaviour: string[];
  handlingAdditionalInfo: string;
  feeding: string[];
  feedingAdditionalInfo: string;
  medicalManagementIssues: string[];
  medicalAdditionalInfo: string;
  management: string[];
  managementAdditionalInfo: string;
  lastVaccinationDate: string;
  vaccinatedFor: string[];
  lastDentalDate: string;
  dentalAdditionalInfo: string;
  farrier: string[];
  farrierAdditionalInfo: string;
  vetChecks: string[];
  vetChecksAdditionalInfo: string;
  reasonForSale: string;
  idealHome: string;
  generalTermsAgreed: boolean;
  digitalSignatureConfirmation: string;
  signature: string;
};

const SAMPLE: FD = {
  // Step 0 — Contact
  email: "jessica.mcallister@gmail.com",
  declaration18: "I agree",
  firstName: "Jessica",
  secondName: "McAllister",
  streetAddress: "88 Bridle Track Road",
  suburbTownStatePostcode: "Goulburn NSW 2580",
  phoneNumber: "0411 222 333",
  currentRiderName: "",
  // Step 1 — Listing Service
  listingServiceType: "1. Listing Service - commission/ completion fee due later (see terms)",
  listingServiceAdditionalInfo: "",
  additionalMarketing: ["Featured Horsezone ad $75"],
  photosVideoCommitment: "I will send this today",
  preferredSalesPrice: "$22,500 firm. Horse priced to sell quickly — genuine sale.",
  salesAdvertisementDescription: "",
  // Step 2 — Horse Details
  horseName: "Highfield Copper / Copper",
  horseLocation: "",
  age: "10 years",
  height: "16.0hh",
  colour: "Chestnut with wide blaze and two hind socks",
  gender: "Gelding",
  breed: "Thoroughbred x Hanoverian, Sire: Redoute's Choice xx, Dam: Hannelore",
  registrations: "EA registered #TB-HAN-7812",
  // Step 3 — Education & Disciplines
  generalEducation: ["Well educated", "Established level of education"],
  educationAdditionalInfo: "Copper has had consistent professional training for 7 years. He is established through all three gaits, working on collection and extension. A very genuine, honest horse.",
  disciplines: ["dressage/ showing", "eventing"],
  skills: [
    "trail riding",
    "low level jump schooling - cavalettis/ x rails",
    "low level cross country schooling",
    "not worried by fireworks",
    "not worried by busy roads",
    "not concerned by farm life - tractors, trucks, motorbikes, livestock",
    "not concerned by dogs or other pets",
  ],
  needsWorkToImprove: "Flying changes — he has the natural ability but needs consistent work. Currently confirmed at counter canter.",
  // Step 4 — Rider Suitability
  minimumRiderLevel:
    "Intermediate Rider defined as someone who has been riding / competing regularly for at least three years, has independent hands and balanced position/ seat; can walk, trot and canter on their own horse. Rider is confident if the horse is reasonably well behaved. Prefers a schoolmaster type without any major quirks.",
  riderSuitabilityExtra: [
    "Would suit a young rider - 18-24 yo",
    "Would suit an amateur adult rider",
    "Would suit a mature, older rider",
  ],
  horseRequires: ["A rider who is under regular professional instruction."],
  riderSuitabilityVariesInfo:
    "With an experienced, confident rider Copper is a delight. He can pick up on rider tension and become slightly more forward-going, but nothing dramatic.",
  // Step 5 — Under Saddle & Vices
  underSaddle: [
    "willing and responsive",
    "puts in as much effort as required by the rider",
    "soft and 'light' in the bridle",
    "willingly collects",
    "tolerant of rider mistakes",
    "non-reactive unless something major happens",
    "can be looky in certain situations",
  ],
  underSaddleAdditionalInfo:
    "Copper has a beautiful, swinging trot and a lovely uphill canter. He can spook at unusual objects in the arena (plastic bags, flags) but recovers within a stride or two.",
  vicesOrQuirks: [
    "cold backed at the start of each ride - tense, tail swishy but DOESN'T buck, pigroot or kick out",
    "can be looky in certain situations",
    "this happens but not regularly",
  ],
  vicesAdditionalInfo:
    "Cold back resolves completely after a 5-minute walk on a loose rein. Looky behaviour is situational — unfamiliar venues and windy days are the most common trigger. Entirely manageable.",
  // Step 6 — Work, Fitness & Competition
  behaviourInOutOfWork: [
    "does not need regular riding to be reliable and safe",
    "needs lunging before riding after a spell",
  ],
  fitnessLevel: "In work ridden 3 plus times a week",
  currentlyCompeting: "yes",
  competitionHistory: "Competed and won/ placed at shows/ competitions",
  competitionHistoryAdditionalInfo:
    "Multiple class wins at affiliated dressage competitions in NSW, including 2 x Grand Champion Hack at regional shows. Currently competing at Novice dressage and 80cm eventing.",
  gearTackNeeds: [
    "'light; and happy being ridden in a snaffle bit",
    "no specific tack needed",
  ],
  gearAdditionalInfo: "",
  // Step 7 — Handling, Feeding & Medical
  handlingBehaviour: [
    "unflappable and calm, safe and easy to manage",
    "easy to catch",
    "well mannered on the ground",
    "leads calmly and willingly",
    "ties up happily and calmly without fuss or pulling back",
    "self loads or loads into float/ truck very easily, stands quietly when travelling, unloads calmly",
    "easy and calm to clip",
    "reliable for the farrier/ to handle when picking out feet",
    "is good for the vet",
    "easy to wash",
    "tolerant of handler mistakes",
  ],
  handlingAdditionalInfo: "",
  feeding: ["horse is fed 'hard' feed"],
  feedingAdditionalInfo:
    "AM: 600g Mitavite Gumnuts + 300g Coolstance copra + 500g lucerne chaff. PM: same. Meadow hay ad lib overnight. Easy keeper — excellent condition on current regime.",
  medicalManagementIssues: [
    "no past or present medical issues",
    "given supplements as a 'preventative'.",
  ],
  medicalAdditionalInfo:
    "Daily Vitamin E & Selenium supplement as a preventative only. Clean bill of health — no history of lameness, injury, or illness. Pre-purchase vet check can be arranged at buyer's expense.",
  management: [
    "can be kept in a herd situation",
    "management is entirely flexible",
  ],
  managementAdditionalInfo:
    "Currently paddocked with two other geldings. Settles happily in any management situation — very adaptable.",
  // Step 8 — Health Records
  lastVaccinationDate: "January 2025",
  vaccinatedFor: ["Tetanus", "Strangles", "Hendra", "Equine Influenza"],
  lastDentalDate: "October 2024",
  dentalAdditionalInfo: "No dental issues noted — vet dentist very happy with his mouth.",
  farrier: ["shod"],
  farrierAdditionalInfo: "Shod all four feet. 6-weekly farrier cycle. No corrective work required.",
  vetChecks: [
    "past vet checks available",
    "vet check can be done at potential buyers expense",
  ],
  vetChecksAdditionalInfo: "",
  // Step 9 — Sale & Declaration
  reasonForSale:
    "Seller is expecting her first child and will not have the time or energy to give Copper the consistent riding and attention he deserves. It is a very difficult decision — he has been a wonderful partner.",
  idealHome:
    "Looking for a committed amateur or junior competitor who trains regularly with a coach and wants a genuine, talented horse to develop their dressage or eventing career. Copper thrives with consistency, regular work, and lots of positive attention. He would also suit a more experienced pleasure rider who wants a reliable, beautiful horse to enjoy.",
  generalTermsAgreed: true,
  digitalSignatureConfirmation:
    "I understand the service that I have selected and confirm that I want to list the horse with PHS. To speed up the process, I will send photos and videos to 0428239317 via WhatsApp to confirm the listing - PHS will start drafting the ad and portfolio.",
  signature: "Jessica McAllister",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createSubmission = useCreateSubmission();

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof FD, string>>>({});
  const [fd, setFd] = useState<FD>(SAMPLE);

  const setField =
    <K extends keyof FD>(key: K) =>
    (val: FD[K]) =>
      setFd((prev) => ({ ...prev, [key]: val }));

  const s = (key: keyof FD) => fd[key] as string;
  const a = (key: keyof FD) => fd[key] as string[];
  const b = (key: keyof FD) => fd[key] as boolean;

  // ─── Validation ────────────────────────────────────────────────────────────

  const validate = (step: number): Partial<Record<keyof FD, string>> => {
    const e: Partial<Record<keyof FD, string>> = {};
    switch (step) {
      case 0:
        if (!s("email")) e.email = "Required";
        if (!s("declaration18")) e.declaration18 = "Required";
        if (s("declaration18") === "I disagree - please do not fill in this form")
          e.declaration18 = "You must agree to proceed with the listing.";
        if (!s("firstName")) e.firstName = "Required";
        if (!s("secondName")) e.secondName = "Required";
        if (!s("streetAddress")) e.streetAddress = "Required";
        if (!s("suburbTownStatePostcode")) e.suburbTownStatePostcode = "Required";
        if (!s("phoneNumber")) e.phoneNumber = "Required";
        break;
      case 1:
        if (!s("listingServiceType")) e.listingServiceType = "Required";
        if (!s("photosVideoCommitment")) e.photosVideoCommitment = "Required";
        if (!s("preferredSalesPrice")) e.preferredSalesPrice = "Required";
        break;
      case 2:
        if (!s("horseName")) e.horseName = "Required";
        if (!s("age")) e.age = "Required";
        if (!s("height")) e.height = "Required";
        if (!s("colour")) e.colour = "Required";
        if (!s("gender")) e.gender = "Required";
        break;
      case 3:
        if (a("generalEducation").length === 0)
          e.generalEducation = "Please select at least one option";
        if (a("disciplines").length === 0)
          e.disciplines = "Please select at least one option";
        break;
      case 4:
        if (!s("minimumRiderLevel")) e.minimumRiderLevel = "Required";
        if (a("riderSuitabilityExtra").length === 0)
          e.riderSuitabilityExtra = "Please select at least one option";
        break;
      case 5:
        if (a("underSaddle").length === 0)
          e.underSaddle = "Please select at least one option";
        if (a("vicesOrQuirks").length === 0)
          e.vicesOrQuirks = "Please select at least one option";
        break;
      case 6:
        if (a("behaviourInOutOfWork").length === 0)
          e.behaviourInOutOfWork = "Please select at least one option";
        if (!s("fitnessLevel")) e.fitnessLevel = "Required";
        if (!s("currentlyCompeting")) e.currentlyCompeting = "Required";
        if (!s("competitionHistory")) e.competitionHistory = "Required";
        if (a("gearTackNeeds").length === 0)
          e.gearTackNeeds = "Please select at least one option";
        break;
      case 7:
        if (a("handlingBehaviour").length === 0)
          e.handlingBehaviour = "Please select at least one option";
        if (a("feeding").length === 0)
          e.feeding = "Please select at least one option";
        if (!s("feedingAdditionalInfo"))
          e.feedingAdditionalInfo = "Required";
        if (a("medicalManagementIssues").length === 0)
          e.medicalManagementIssues = "Please select at least one option";
        if (a("management").length === 0)
          e.management = "Please select at least one option";
        break;
      case 8:
        if (!s("lastVaccinationDate")) e.lastVaccinationDate = "Required";
        if (a("vaccinatedFor").length === 0)
          e.vaccinatedFor = "Please select at least one option";
        if (!s("lastDentalDate")) e.lastDentalDate = "Required";
        if (a("farrier").length === 0)
          e.farrier = "Please select at least one option";
        if (a("vetChecks").length === 0)
          e.vetChecks = "Please select at least one option";
        break;
      case 9:
        if (!s("reasonForSale")) e.reasonForSale = "Required";
        if (!s("idealHome")) e.idealHome = "Required";
        if (!b("generalTermsAgreed"))
          e.generalTermsAgreed = "You must agree to the terms to proceed";
        if (!s("digitalSignatureConfirmation"))
          e.digitalSignatureConfirmation = "Required";
        if (!s("signature")) e.signature = "Required";
        break;
    }
    return e;
  };

  const next = () => {
    const errs = validate(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast({ title: "Please complete all required fields before continuing.", variant: "destructive" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setErrors({});
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const back = () => {
    setErrors({});
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    const errs = validate(9);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast({ title: "Please complete all required fields before submitting.", variant: "destructive" });
      return;
    }
    try {
      await createSubmission.mutateAsync({
        data: {
          formData: fd as unknown as Record<string, unknown>,
          sellerName: `${fd.firstName} ${fd.secondName}`.trim(),
          sellerEmail: fd.email,
          sellerPhone: fd.phoneNumber,
          horseName: fd.horseName,
          breed: fd.breed,
          age: fd.age,
          colour: fd.colour,
          height: fd.height,
          sex: fd.gender,
          askingPrice: fd.preferredSalesPrice,
          location: fd.horseLocation || fd.suburbTownStatePostcode,
          discipline: fd.disciplines.join(", "),
        },
      });
      setLocation("/thank-you");
    } catch {
      toast({ title: "Submission failed. Please try again.", variant: "destructive" });
    }
  };

  // ─── Step Content ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // ── STEP 0: Intro & Contact ─────────────────────────────────────────────
      case 0:
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 text-sm text-stone-700 space-y-3">
              <p>
                We know that we can find your horse the perfect new home and we thank you for
                your trust in the process.
              </p>
              <p className="font-semibold text-amber-800">
                Please contact us on 0428239317 if you do not receive a response within 12 hours.
              </p>
              <p className="font-medium text-stone-800">Our aim is that the listing process:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2 text-stone-600">
                <li>is stress free</li>
                <li>prevents your time being wasted</li>
                <li>
                  facilitates full disclosure on the part of buyers and sellers which means everyone
                  is legally protected
                </li>
                <li>and everyone is happy with the outcome...</li>
                <li>you secure a timely sale at a price that you are happy with</li>
                <li>the buyer, buys the right horse</li>
                <li>your horse is in the right, long term home</li>
              </ul>
              <p className="font-medium text-stone-800">What happens next:</p>
              <ol className="list-decimal list-inside space-y-0.5 ml-2 text-stone-600">
                <li>PHS will contact the seller to answer any questions and confirm the listing.</li>
                <li>PHS drafts the horses ad and portfolio.</li>
              </ol>
              <p className="text-xs italic text-stone-500">
                Please note - from time of form filled in, to ads going live, is usually under 12
                hours, depending on how fast the seller signs forms, sends photos and videos and
                approves text.
              </p>
              <ol className="list-decimal list-inside space-y-0.5 ml-2 text-stone-600" start={2}>
                <li>
                  PHS markets the horse privately, directly as well as via social media and website
                  ads/posts.
                </li>
                <li>
                  PHS sends all viewing application forms to the seller and/or provides feedback re
                  the sale.
                </li>
                <li>
                  If seller wishes to proceed with a potential viewer/buyer, PHS facilitates contact
                  regarding phone call, viewing or purchase.
                </li>
                <li>
                  PHS provides advice, if required, and manages the marketing, administration, and
                  supports the seller and buyer through the sale process.
                </li>
              </ol>
              <p className="text-xs text-stone-500">
                Please note that the seller is the one who makes all decisions relating to the sale
                and all payments are made directly to them.
              </p>
              <p>
                The information on this form will not be shared with any other parties, without your
                consent, and will be stored securely.
              </p>
              <p>
                Please thoroughly read this form and, more importantly, the following{" "}
                <a
                  href="https://www.performancehorsesales.com.au/phs-services/forms-terms-conditions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#24384e] underline font-medium"
                >
                  Terms and Conditions of Listing Process, Commission etc
                </a>{" "}
                — available via that link and publicly on our website — to assess whether this is
                the right service for you, prior to signing.
              </p>
            </div>

            <div>
              <FieldLabel label="Email" required />
              <TextInput
                name="email"
                type="email"
                value={s("email")}
                onChange={setField("email")}
                placeholder="your@email.com"
              />
              <FieldError message={errors.email} />
            </div>

            <div>
              <FieldLabel
                label="I declare that I am over 18, have the legal right to list and sell this horse and will be financially and legally responsible for the payment of fees."
                required
              />
              <RadioGroup
                name="declaration18"
                value={s("declaration18")}
                onChange={setField("declaration18")}
                options={[
                  "I agree",
                  "I disagree - please do not fill in this form",
                ]}
              />
              <FieldError message={errors.declaration18} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <FieldLabel label="First name:" required />
                <TextInput name="firstName" value={s("firstName")} onChange={setField("firstName")} />
                <FieldError message={errors.firstName} />
              </div>
              <div>
                <FieldLabel label="Second name:" required />
                <TextInput name="secondName" value={s("secondName")} onChange={setField("secondName")} />
                <FieldError message={errors.secondName} />
              </div>
            </div>

            <div>
              <FieldLabel label="Street number and road:" required />
              <TextInput
                name="streetAddress"
                value={s("streetAddress")}
                onChange={setField("streetAddress")}
                placeholder="e.g. 42 Stockman Lane"
              />
              <FieldError message={errors.streetAddress} />
            </div>

            <div>
              <FieldLabel label="Suburb/ town, state and post code:" required />
              <TextInput
                name="suburbTownStatePostcode"
                value={s("suburbTownStatePostcode")}
                onChange={setField("suburbTownStatePostcode")}
                placeholder="e.g. Armidale NSW 2350"
              />
              <FieldError message={errors.suburbTownStatePostcode} />
            </div>

            <div>
              <FieldLabel label="Phone number:" required />
              <TextInput
                name="phoneNumber"
                type="tel"
                value={s("phoneNumber")}
                onChange={setField("phoneNumber")}
                placeholder="e.g. 0400 000 000"
              />
              <FieldError message={errors.phoneNumber} />
            </div>

            <div>
              <FieldLabel label="Name of current rider, if not with owner:" />
              <TextInput
                name="currentRiderName"
                value={s("currentRiderName")}
                onChange={setField("currentRiderName")}
              />
            </div>
          </div>
        );

      // ── STEP 1: Listing Service ─────────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-6">
            <div className="bg-[#eef2f6] border border-[#b8cad8] rounded-lg p-5 text-sm text-stone-700 space-y-2">
              <p className="font-semibold text-[#24384e]">
                Our Listing Service includes all administration including contract of sale,
                marketing, communication including negotiation and advice/support for both parties.
              </p>
              <p className="font-bold text-[#24384e]">Listing Service</p>
              <p>Cost: $0 upfront</p>
              <p>
                Then 5% commission/completion fee - minimum $500/capped at $2000.
              </p>
              <p>We offer a 10% discount off commission, when paid upfront.</p>
              <p className="text-xs italic text-stone-500">
                Please note prices are PLUS GST
              </p>
            </div>

            <div>
              <FieldLabel label="Listing Service" required />
              <RadioGroup
                name="listingServiceType"
                value={s("listingServiceType")}
                onChange={setField("listingServiceType")}
                options={[
                  "1. Listing Service - commission/ completion fee due later (see terms)",
                  "2. Listing Service - commission paid upfront for 10% off completion fee",
                ]}
              />
              <FieldError message={errors.listingServiceType} />
            </div>

            <div>
              <FieldLabel label="Optional - additional information:" />
              <TextArea
                name="listingServiceAdditionalInfo"
                value={s("listingServiceAdditionalInfo")}
                onChange={setField("listingServiceAdditionalInfo")}
                rows={3}
              />
            </div>

            <div>
              <FieldLabel label="Additional marketing (optional)" />
              <CheckboxGroup
                name="additionalMarketing"
                values={a("additionalMarketing")}
                onChange={setField("additionalMarketing")}
                options={[
                  "Featured Horsezone ad $75",
                  "Horsedeals ad package from $59",
                  "No additional marketing",
                ]}
              />
            </div>

            <div>
              <FieldLabel label="Photos and video, please send EVERYTHING you have:" required />
              <RadioGroup
                name="photosVideoCommitment"
                value={s("photosVideoCommitment")}
                onChange={setField("photosVideoCommitment")}
                options={["I will send this today", "I will send asap"]}
              />
              <FieldError message={errors.photosVideoCommitment} />
            </div>

            <div>
              <FieldLabel
                label="Preferred sales price plus any additional information around pricing:"
                required
              />
              <TextArea
                name="preferredSalesPrice"
                value={s("preferredSalesPrice")}
                onChange={setField("preferredSalesPrice")}
                rows={2}
                placeholder="e.g. $15,000 firm. Open to genuine offers."
              />
              <FieldError message={errors.preferredSalesPrice} />
            </div>

            <div>
              <FieldLabel
                label="Sales Advertisement/ Description:"
                note="Please include this if advertising your horse if you have an ad already written. Please note that PHS will re-write this or write an ad, using our proforma, for advertising. This text will then be sent to the seller for editing and approval before the ads go 'live'."
              />
              <TextArea
                name="salesAdvertisementDescription"
                value={s("salesAdvertisementDescription")}
                onChange={setField("salesAdvertisementDescription")}
                rows={5}
              />
            </div>
          </div>
        );

      // ── STEP 2: Horse Details ───────────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-6">
            <SectionHeader title="Horse Details" />

            <div>
              <FieldLabel label="Horses registered name/ stable name" required />
              <TextInput
                name="horseName"
                value={s("horseName")}
                onChange={setField("horseName")}
                placeholder="e.g. Sunfire Dancer / Sunny"
              />
              <FieldError message={errors.horseName} />
            </div>

            <div>
              <FieldLabel label="Location of horse; if different from owner's address:" />
              <TextInput
                name="horseLocation"
                value={s("horseLocation")}
                onChange={setField("horseLocation")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <FieldLabel label="Age" required />
                <TextInput
                  name="age"
                  value={s("age")}
                  onChange={setField("age")}
                  placeholder="e.g. 8 years"
                />
                <FieldError message={errors.age} />
              </div>
              <div>
                <FieldLabel label="Height" required />
                <TextInput
                  name="height"
                  value={s("height")}
                  onChange={setField("height")}
                  placeholder="e.g. 16.2hh"
                />
                <FieldError message={errors.height} />
              </div>
            </div>

            <div>
              <FieldLabel label="Colour:" required />
              <TextInput
                name="colour"
                value={s("colour")}
                onChange={setField("colour")}
                placeholder="e.g. Bay with white blaze and two socks"
              />
              <FieldError message={errors.colour} />
            </div>

            <div>
              <FieldLabel label="Horse's gender" required />
              <RadioGroup
                name="gender"
                value={s("gender")}
                onChange={setField("gender")}
                options={["Mare", "Gelding", "Stallion", "Colt", "Filly"]}
                inline
              />
              <FieldError message={errors.gender} />
            </div>

            <div>
              <FieldLabel label="Optional question: Breed (plus Sire and Dam if known):" />
              <TextInput
                name="breed"
                value={s("breed")}
                onChange={setField("breed")}
                placeholder="e.g. Warmblood x TB, Sire: Florestan II, Dam: Bella"
              />
            </div>

            <div>
              <FieldLabel label="Optional question: Registrations if known:" />
              <TextInput
                name="registrations"
                value={s("registrations")}
                onChange={setField("registrations")}
              />
            </div>
          </div>
        );

      // ── STEP 3: Education & Disciplines ────────────────────────────────────
      case 3:
        return (
          <div className="space-y-7">
            <div>
              <SectionHeader title="General Education" />
              <FieldLabel
                label="Horses general education, please tick all that apply:"
                required
              />
              <CheckboxGroup
                name="generalEducation"
                values={a("generalEducation")}
                onChange={setField("generalEducation")}
                options={[
                  "Schoolmaster",
                  "Superior level of education",
                  "Well educated",
                  "Established level of education",
                  "Basic education",
                  "Started under saddle",
                  "Handled only",
                  "Unhandled",
                ]}
              />
              <FieldError message={errors.generalEducation} />
            </div>

            <div>
              <FieldLabel label="Optional question: Additional information re education -" />
              <TextArea
                name="educationAdditionalInfo"
                value={s("educationAdditionalInfo")}
                onChange={setField("educationAdditionalInfo")}
                rows={3}
              />
            </div>

            <div>
              <SectionHeader title="Disciplines" />
              <FieldLabel label="Horses current or future disciplines/ use:" required />
              <CheckboxGroup
                name="disciplines"
                values={a("disciplines")}
                onChange={setField("disciplines")}
                options={[
                  "dressage/ showing",
                  "eventing",
                  "showjumping",
                  "working equitation",
                  "pony club/ adult rider club",
                  "campdrafting, team penning, reining, roping etc",
                  "mustering/ feed lot work",
                  "pleasure/ trail riding",
                  "companion/ therapy",
                  "breeding",
                ]}
              />
              <FieldError message={errors.disciplines} />
            </div>

            <div>
              <SectionHeader title="Skills & Experience" sub="Optional — tick all that apply" />
              <FieldLabel label="Horses 'skills' or experience - in addition to it's preferred disciplines:" />
              <CheckboxGroup
                name="skills"
                values={a("skills")}
                onChange={setField("skills")}
                options={[
                  "trail riding",
                  "mustered or done cattle work",
                  "hasn't mustered but is safe and quiet to ride near cattle/ sheep",
                  "low level jump schooling - cavalettis/ x rails",
                  "low level cross country schooling",
                  "working equitation obstacles or similar",
                  "bareback",
                  "lunging",
                  "leading other horses",
                  "safe for beginners on the lead",
                  "safe for novices under instruction",
                  "safe for child riders",
                  "not concerned by the nonsense of children, within it's vicinity (this doesn't include child riders)",
                  "tricks",
                  "has visited and swum at the beach",
                  "swimming in dams or rivers",
                  "happily stabled 24 hours a day in a busy city stable",
                  "not worried by fireworks",
                  "not worried by busy roads",
                  "not concerned by farm life - tractors, trucks, motorbikes, livestock",
                  "not concerned by dogs or other pets",
                ]}
              />
            </div>

            <div>
              <FieldLabel label="The horse needs work to improve..." />
              <p className="text-xs text-stone-500 mb-1.5">
                Please provide information if applicable.
              </p>
              <TextArea
                name="needsWorkToImprove"
                value={s("needsWorkToImprove")}
                onChange={setField("needsWorkToImprove")}
                rows={3}
              />
            </div>
          </div>
        );

      // ── STEP 4: Rider Suitability ───────────────────────────────────────────
      case 4:
        return (
          <div className="space-y-7">
            <SectionHeader title="Rider / Handler Suitability" />

            <div>
              <FieldLabel
                label="Rider/ Handler Suitability. The minimum 'competence level' of rider, who potentially suits this horse is:"
                required
              />
              <RadioGroup
                name="minimumRiderLevel"
                value={s("minimumRiderLevel")}
                onChange={setField("minimumRiderLevel")}
                options={[
                  "Experienced Rider defined as someone who has a lifetime of experience producing and competing both young and educated horses. Unfazed by any nonsense and has the ability and experience to ride green horses.",
                  "Capable Rider defined as someone who has been riding / competing regularly for at least five years, has independent hands and balanced position/ seat; can walk, trot and canter on multiple horses both young and educated. Is confident in all situations. Can handle some quirks in horses.",
                  "Intermediate Rider defined as someone who has been riding / competing regularly for at least three years, has independent hands and balanced position/ seat; can walk, trot and canter on their own horse. Rider is confident if the horse is reasonably well behaved. Prefers a schoolmaster type without any major quirks.",
                  "Novice rider defined as someone who has been riding regularly (multiple times a week) for at least a year, has independent hands and balanced position/ seat; can walk, trot and canter. Needs an impeccably well behaved, established schoolmaster type without quirks to be confident.",
                  "Beginner defined as someone who has been riding for less than a year, is sometimes unbalanced and unsure/ nervous. Needs a very forgiving, experienced schoolmaster.",
                ]}
              />
              <FieldError message={errors.minimumRiderLevel} />
            </div>

            <div>
              <FieldLabel
                label="Extra info re suitability - please tick as many as you think apply:"
                required
              />
              <CheckboxGroup
                name="riderSuitabilityExtra"
                values={a("riderSuitabilityExtra")}
                onChange={setField("riderSuitabilityExtra")}
                options={[
                  "Would suit a child rider - under 14 yo",
                  "Would suit a junior rider - under 18 yo",
                  "Would suit a young rider - 18-24 yo",
                  "Would suit an amateur adult rider",
                  "Would suit a mature, older rider",
                ]}
              />
              <FieldError message={errors.riderSuitabilityExtra} />
            </div>

            <div>
              <FieldLabel label="This horse will require:" />
              <CheckboxGroup
                name="horseRequires"
                values={a("horseRequires")}
                onChange={setField("horseRequires")}
                options={[
                  "Further professional training.",
                  "A rider who is under regular professional instruction.",
                  "N/A",
                ]}
              />
            </div>

            <div>
              <FieldLabel label="If the 'rider suitability' varies for any reason, depending on the circumstances, please explain this below:" />
              <TextArea
                name="riderSuitabilityVariesInfo"
                value={s("riderSuitabilityVariesInfo")}
                onChange={setField("riderSuitabilityVariesInfo")}
                rows={3}
              />
            </div>
          </div>
        );

      // ── STEP 5: Under Saddle & Vices ────────────────────────────────────────
      case 5:
        return (
          <div className="space-y-7">
            <div>
              <SectionHeader title="Under Saddle" />
              <FieldLabel
                label="What the horse is like under saddle, please tick those that best describe the horse:"
                required
              />
              <CheckboxGroup
                name="underSaddle"
                values={a("underSaddle")}
                onChange={setField("underSaddle")}
                options={[
                  "forward and sharp",
                  "willing and responsive",
                  "puts in as much effort as required by the rider",
                  "not quite willing",
                  "lazy",
                  "stubborn",
                  "adapts to the competence/ confidence level of the rider i.e. beginner safe but steps up with a more experienced rider",
                  "reacts to unbalanced riders or mixed 'signals'",
                  "soft and 'light' in the bridle",
                  "willingly collects",
                  "takes time and skill to 'collect'/ inconsistent 'frame' and contact",
                  "can be heavy in the bridle",
                  "tolerant of rider mistakes",
                  "non-reactive and unflappable under saddle",
                  "non-reactive unless something major happens",
                  "generally very calm and reliable but not unflappable",
                  "can be looky in certain situations",
                  "spooky and reactive",
                  "reacts to rider nerves",
                  "has quirks - this will be covered in the next section",
                  "has vices - this will be covered in the next section",
                  "the horse/ pony is not under saddle",
                ]}
              />
              <FieldError message={errors.underSaddle} />
            </div>

            <div>
              <FieldLabel label="Optional question: Additional information re. what the horse is like to ride -" />
              <TextArea
                name="underSaddleAdditionalInfo"
                value={s("underSaddleAdditionalInfo")}
                onChange={setField("underSaddleAdditionalInfo")}
                rows={3}
              />
            </div>

            <div>
              <SectionHeader title="Vices or Quirks" />
              <DisclosureBox>
                <p>
                  Please note, the QUESTION FOLLOWING this one gives you the opportunity to explain
                  when and why this might happen - re feed, time of year, if the horse is in season
                  etc.
                </p>
                <p>
                  Please remember that disclosing this information won't prevent the horse from
                  being viewed or sold but it will fully inform potential buyers.
                </p>
                <p>
                  This will minimize time wasting, make sure you are legally protected and help your
                  horse find the best possible home.
                </p>
              </DisclosureBox>
              <FieldLabel label="Vices or quirks:" required />
              <CheckboxGroup
                name="vicesOrQuirks"
                values={a("vicesOrQuirks")}
                onChange={setField("vicesOrQuirks")}
                options={[
                  "no vices or quirks",
                  "cold backed at the start of each ride - tense, tail swishy but DOESN'T buck, pigroot or kick out",
                  "cold backed - AFTER A SPELL ONLY - tense, tail swishy but DOESN'T buck, pigroot or kick out",
                  "can occasionally kick out under saddle i.e. during a canter transition",
                  "kicks out at other horses",
                  "crow hops",
                  "pigroots",
                  "bucks",
                  "looky - has a look and may stop or slowly move sideways away from something",
                  "spooks - jumps on the spot/ sideways or moves forward quickly",
                  "shy - stops and rapidly spins around away from something",
                  "jacks up - refuses to go forward and front feet leave the ground momentarily but horse does not stand on back legs",
                  "rear - front feet leave the ground and horse stands on back legs",
                  "horse shy",
                  "reacts to rider nerves",
                  "lazy",
                  "unwilling to go forward",
                  "needs 'grass reins'",
                  "snatches the reins/ evades contact",
                  "fussy in the contact",
                  "shakes head",
                  "heavy in the contact",
                  "difficult to turn or stop",
                  "difficult to stop",
                  "rushes",
                  "is hot",
                  "is tense",
                  "bolts",
                  "is 'marey'",
                  "calls out to other horses but still willingly gets on with the job",
                  "is 'matey' calls out and is reluctant to leave other horses",
                  "separation anxiety - has issues leaving other horses",
                  "'naps' - has issues leaving home or the paddock - not necessarily 'matey'",
                  "this happens regularly",
                  "this happens but not regularly",
                ]}
              />
              <FieldError message={errors.vicesOrQuirks} />
            </div>

            <div>
              <FieldLabel label="If applicable: Please provide more information as to when the vice or quirk may occur and why this might happen - re feed related, related to rider nerves, time of year, if the horse is in season etc -" />
              <TextArea
                name="vicesAdditionalInfo"
                value={s("vicesAdditionalInfo")}
                onChange={setField("vicesAdditionalInfo")}
                rows={3}
              />
            </div>
          </div>
        );

      // ── STEP 6: Work, Fitness & Competition ────────────────────────────────
      case 6:
        return (
          <div className="space-y-7">
            <div>
              <SectionHeader title="Work & Fitness" />
              <FieldLabel label="Horses behaviour when in and out of work:" required />
              <CheckboxGroup
                name="behaviourInOutOfWork"
                values={a("behaviourInOutOfWork")}
                onChange={setField("behaviourInOutOfWork")}
                options={[
                  "needs regular riding 4 plus times a week to be reliable and safe",
                  "does not need regular riding to be reliable and safe",
                  "is safe to hop straight on after a spell",
                  "needs lunging before riding each day",
                  "needs lunging before riding after a spell",
                  "N/A",
                ]}
              />
              <FieldError message={errors.behaviourInOutOfWork} />
            </div>

            <div>
              <FieldLabel label="Horses current level of fitness:" required />
              <RadioGroup
                name="fitnessLevel"
                value={s("fitnessLevel")}
                onChange={setField("fitnessLevel")}
                options={[
                  "In work 5 plus times a week",
                  "In work ridden 3 plus times a week",
                  "In light work - ridden 1 or 2 times a week",
                  "Not in work",
                  "N/A",
                ]}
              />
              <FieldError message={errors.fitnessLevel} />
            </div>

            <div>
              <SectionHeader title="Competition" />
              <FieldLabel label="Is the horse currently competing?" required />
              <RadioGroup
                name="currentlyCompeting"
                value={s("currentlyCompeting")}
                onChange={setField("currentlyCompeting")}
                options={["yes", "no"]}
                inline
              />
              <FieldError message={errors.currentlyCompeting} />
            </div>

            <div>
              <FieldLabel
                label="Horses competition history, please choose the only one option - the HIGHEST level that applies to this horse:"
                note="Please make sure that this information can be verified as it will be checked."
                required
              />
              <RadioGroup
                name="competitionHistory"
                value={s("competitionHistory")}
                onChange={setField("competitionHistory")}
                options={[
                  "Competed and won/ placed at National level",
                  "Has qualified for National level shows, competed but didn't place",
                  "Has qualified for National level shows but didn't compete",
                  "Completed and won/ placed at State level",
                  "Competed at state level",
                  "Competed and won/ placed at shows/ competitions",
                  "Has been to shows/ competitions and competed",
                  "Competed at pony club or adult rider club level",
                  "Has been on outings to shows or clinics but hasn't competed",
                  "Has been on outings to lessons",
                  "Has been on outings to trail ride",
                  "Has only been ridden at home",
                  "Has only been ridden by professional when being broken in",
                  "N/A",
                ]}
              />
              <FieldError message={errors.competitionHistory} />
            </div>

            <div>
              <FieldLabel label="Optional question: Additional information re competition history, significant placings and results. For example, height or level that the horse is training/ competing; if it requires further work on a specific area i.e. flying changes." />
              <TextArea
                name="competitionHistoryAdditionalInfo"
                value={s("competitionHistoryAdditionalInfo")}
                onChange={setField("competitionHistoryAdditionalInfo")}
                rows={3}
              />
            </div>

            <div>
              <SectionHeader title="Gear & Tack" />
              <FieldLabel
                label="Horses specific 'gear' or tack needs, if none, choose 'no specific tack needed' -"
                required
              />
              <CheckboxGroup
                name="gearTackNeeds"
                values={a("gearTackNeeds")}
                onChange={setField("gearTackNeeds")}
                options={[
                  "specific saddle",
                  "wide saddle",
                  "narrow saddle",
                  "panel saddle",
                  "saddle pad i.e. thinline pad with shims",
                  "'light; and happy being ridden in a snaffle bit",
                  "worked in a snaffle most of the time but requires a different bit for different events/ disciplines",
                  "specific bit i.e. pelham, kimblewick, universal, combination or gag",
                  "specific noseband or bridle",
                  "other specfic gear",
                  "this gear will be included in sale",
                  "no specific tack needed",
                  "N/A",
                ]}
              />
              <FieldError message={errors.gearTackNeeds} />
            </div>

            <div>
              <FieldLabel label="Optional question: Additional information regarding horses specific 'gear' or tack needs -" />
              <TextArea
                name="gearAdditionalInfo"
                value={s("gearAdditionalInfo")}
                onChange={setField("gearAdditionalInfo")}
                rows={3}
              />
            </div>
          </div>
        );

      // ── STEP 7: Handling, Feeding & Medical ─────────────────────────────────
      case 7:
        return (
          <div className="space-y-7">
            <div>
              <SectionHeader title="Handling" />
              <DisclosureBox>
                <p>
                  Please remember that disclosing this information won't prevent the horse from
                  being viewed or sold but it will fully inform potential buyers.
                </p>
                <p>
                  This will minimize time wasting, make sure you are legally protected and help your
                  horse find the best possible home.
                </p>
              </DisclosureBox>
              <FieldLabel
                label="What the horse is like to handle, please tick the statements that best describe the horse:"
                required
              />
              <CheckboxGroup
                name="handlingBehaviour"
                values={a("handlingBehaviour")}
                onChange={setField("handlingBehaviour")}
                options={[
                  "unflappable and calm, safe and easy to manage",
                  "easy to catch",
                  "tricky to catch",
                  "well mannered on the ground",
                  "could be described as pushy or 'in your face' - in a friendly way",
                  "pushy",
                  "challenging to manage on the ground",
                  "cranky to handle",
                  "leads calmly and willingly",
                  "safe but needs a 'managing' when being led",
                  "lazy and or stubborn to handle",
                  "spooky or reactive to certain things i.e. washing or rugging",
                  "ties up happily and calmly without fuss or pulling back",
                  "has issues being tied up",
                  "self loads or loads into float/ truck very easily, stands quietly when travelling, unloads calmly",
                  "issues loading or travelling in float/ truck",
                  "has never been floated or trucked",
                  "easy and calm to clip",
                  "is not easy to clip and/ or requires sedation",
                  "unsure whether horse has been clipped or not",
                  "hasn't been clipped",
                  "needle phobic",
                  "horse shy",
                  "needs to be paddocked alone",
                  "kicks out when being handled",
                  "bites",
                  "girthy",
                  "easy to wash",
                  "doesn't love being washed",
                  "reliable for the farrier/ to handle when picking out feet",
                  "needs 'managing' for the farrier",
                  "has issues with the farrier",
                  "is good for the vet",
                  "has issues with vets",
                  "tolerant of handler mistakes",
                  "needs a capable handler due to size or age",
                  "needs an experienced handler for safety reasons",
                  "has separation anxiety",
                  "has other vices",
                  "has other quirks",
                ]}
              />
              <FieldError message={errors.handlingBehaviour} />
            </div>

            <div>
              <FieldLabel label="Optional question: Additional information regarding the circumstances above or if you ticked 'other', please list here -" />
              <TextArea
                name="handlingAdditionalInfo"
                value={s("handlingAdditionalInfo")}
                onChange={setField("handlingAdditionalInfo")}
                rows={3}
              />
            </div>

            <div>
              <SectionHeader title="Feeding" />
              <FieldLabel
                label="Feeding - please tick all that apply - the following question will allow you to provide more information:"
                required
              />
              <CheckboxGroup
                name="feeding"
                values={a("feeding")}
                onChange={setField("feeding")}
                options={[
                  "horse lives on grass only",
                  "horse is fed hay only",
                  "horse is fed 'hard' feed",
                  "horse cannot be fed certain feeds for behavioural or health reasons - please explain below.",
                  "horse can only be fed certain feeds for behavioural or health reasons - please explain below.",
                ]}
              />
              <FieldError message={errors.feeding} />
            </div>

            <div>
              <FieldLabel
                label="Feeding - please provide additional information below; regarding your answers to the above question. Listing current feeds and weights/ when fed is very helpful."
                required
              />
              <TextArea
                name="feedingAdditionalInfo"
                value={s("feedingAdditionalInfo")}
                onChange={setField("feedingAdditionalInfo")}
                rows={4}
                placeholder="e.g. 2x feeds of Mitavite Calm per day (500g each), meadow hay ad lib overnight."
              />
              <FieldError message={errors.feedingAdditionalInfo} />
            </div>

            <div>
              <SectionHeader title="Medical / Management Issues" />
              <DisclosureBox>
                <p>If not applicable, write 'N/A'.</p>
                <p>
                  Please remember that disclosing this information won't prevent the horse from
                  being viewed or sold but it will fully inform potential buyers.
                </p>
                <p>
                  This will minimize time wasting, make sure you are legally protected and help your
                  horse find the best possible home.
                </p>
              </DisclosureBox>
              <FieldLabel
                label="Medical/ Management issues (current or past) and requirements:"
                required
              />
              <CheckboxGroup
                name="medicalManagementIssues"
                values={a("medicalManagementIssues")}
                onChange={setField("medicalManagementIssues")}
                options={[
                  "metabolic issues (this is NOT just being a 'good doer' but an actual medical issue)",
                  "respiratory issues",
                  "circulatory issues",
                  "skin related issues - itch, melanoma etc (this is not a minor or temporary issue)",
                  "hoof related issues (this is NOT cracks or temporary/ minor issues)",
                  "ligament or tendon related issues",
                  "bone related issues",
                  "muscular issues",
                  "temperature related issues",
                  "small scars",
                  "large scars",
                  "we have current 'clean' xrays.",
                  "we have xrays.",
                  "xrays show some changes that don't affect performance.",
                  "xrays show some changes that do or could affect performance.",
                  "requires supplements to address behaviour.",
                  "given supplements as a 'preventative'.",
                  "requires supplements to address medical issues.",
                  "requires prescription medication to address medical issues",
                  "no medical issues, injuries, supplements or prescription medication.",
                  "issues do not affect performance",
                  "no current medical issues",
                  "no past or present medical issues",
                  "minor or temporary issues - described below",
                ]}
              />
              <FieldError message={errors.medicalManagementIssues} />
            </div>

            <div>
              <FieldLabel label="Optional question: Additional information regarding use of supplements, prescription medication, vet report findings, xrays and issues. Minor or temporary issues can also be noted here. Please feel free to qualify statements with information regarding dates, circumstances etc." />
              <TextArea
                name="medicalAdditionalInfo"
                value={s("medicalAdditionalInfo")}
                onChange={setField("medicalAdditionalInfo")}
                rows={4}
              />
            </div>

            <div>
              <SectionHeader title="Management" />
              <FieldLabel label="Management:" required />
              <CheckboxGroup
                name="management"
                values={a("management")}
                onChange={setField("management")}
                options={[
                  "can be kept in a herd situation",
                  "must be kept in a herd environment",
                  "must have a companion within sight",
                  "can be kept in a paddock on it's own",
                  "can be kept completely on their own/ no other horse on the property",
                  "can be stabled 12 hours a day/ paddocked for 12 hours a day",
                  "can be happily stabled 24 hours a day i.e. in a busy environment like CPEC",
                  "management is entirely flexible",
                  "may be stressed by a change of environment, management or rider and may take time to settle into it's new home",
                  "will be somewhat stressed by a change of environment, management or rider and will take time to settle into it's new home",
                  "other",
                ]}
              />
              <FieldError message={errors.management} />
            </div>

            <div>
              <FieldLabel label="Optional question - please provide additional information regarding management:" />
              <TextArea
                name="managementAdditionalInfo"
                value={s("managementAdditionalInfo")}
                onChange={setField("managementAdditionalInfo")}
                rows={3}
              />
            </div>
          </div>
        );

      // ── STEP 8: Health Records & Vet ───────────────────────────────────────
      case 8:
        return (
          <div className="space-y-7">
            <SectionHeader title="Health Records" />

            <div>
              <FieldLabel label="Date of last vaccinations:" required />
              <TextInput
                name="lastVaccinationDate"
                value={s("lastVaccinationDate")}
                onChange={setField("lastVaccinationDate")}
                placeholder="e.g. March 2025"
              />
              <FieldError message={errors.lastVaccinationDate} />
            </div>

            <div>
              <FieldLabel label="Currently vaccinated for:" required />
              <CheckboxGroup
                name="vaccinatedFor"
                values={a("vaccinatedFor")}
                onChange={setField("vaccinatedFor")}
                options={["Tetanus", "Strangles", "Hendra", "Equine Influenza"]}
              />
              <FieldError message={errors.vaccinatedFor} />
            </div>

            <div>
              <FieldLabel label="Date of last dental:" required />
              <TextInput
                name="lastDentalDate"
                value={s("lastDentalDate")}
                onChange={setField("lastDentalDate")}
                placeholder="e.g. January 2025"
              />
              <FieldError message={errors.lastDentalDate} />
            </div>

            <div>
              <FieldLabel label="Optional question - please provide additional information regarding dental issues, if present:" />
              <TextArea
                name="dentalAdditionalInfo"
                value={s("dentalAdditionalInfo")}
                onChange={setField("dentalAdditionalInfo")}
                rows={3}
              />
            </div>

            <SectionHeader title="Farrier" />

            <div>
              <FieldLabel label="Farrier" required />
              <CheckboxGroup
                name="farrier"
                values={a("farrier")}
                onChange={setField("farrier")}
                options={[
                  "barefoot",
                  "shod",
                  "needs regular corrective shoeing i.e. packing",
                  "needs regular therapeutic shoeing i.e. egg bars, wedges",
                ]}
              />
              <FieldError message={errors.farrier} />
            </div>

            <div>
              <FieldLabel label="Optional question - If corrective or therapeutic shoeing is needed, please explain type, why and if it will be necessary long term:" />
              <TextArea
                name="farrierAdditionalInfo"
                value={s("farrierAdditionalInfo")}
                onChange={setField("farrierAdditionalInfo")}
                rows={3}
              />
            </div>

            <SectionHeader title="Vet Checks" />

            <div>
              <FieldLabel label="Vet checks:" required />
              <CheckboxGroup
                name="vetChecks"
                values={a("vetChecks")}
                onChange={setField("vetChecks")}
                options={[
                  "current xrays available (maximum 3 months old)",
                  "current vet check available (maximum 3 months old)",
                  "vet check includes flexion tests",
                  "past xrays available",
                  "past vet checks available",
                  "vet check can be done at potential buyers expense",
                  "horse is unlikely to pass a vet check",
                ]}
              />
              <FieldError message={errors.vetChecks} />
            </div>

            <div>
              <FieldLabel label="Optional question - If the horse is unlikely to pass a vet check or there is additional information needed, please provide this. This won't necessarily prevent a sale, please explain circumstances below. This will minimise time wasters and protect your legally." />
              <TextArea
                name="vetChecksAdditionalInfo"
                value={s("vetChecksAdditionalInfo")}
                onChange={setField("vetChecksAdditionalInfo")}
                rows={3}
              />
            </div>
          </div>
        );

      // ── STEP 9: Sale Details & Declaration ─────────────────────────────────
      case 9:
        return (
          <div className="space-y-7">
            <SectionHeader title="Sale Details" />

            <div>
              <FieldLabel label="Reason for sale:" required />
              <TextArea
                name="reasonForSale"
                value={s("reasonForSale")}
                onChange={setField("reasonForSale")}
                rows={3}
              />
              <FieldError message={errors.reasonForSale} />
            </div>

            <div>
              <FieldLabel
                label="Please explain the type of home that you are looking for/ best suits your horse:"
                required
              />
              <TextArea
                name="idealHome"
                value={s("idealHome")}
                onChange={setField("idealHome")}
                rows={4}
              />
              <FieldError message={errors.idealHome} />
            </div>

            <SectionHeader title="General Listing Terms" />

            <div className="bg-stone-50 border border-stone-200 rounded-lg p-5 text-sm text-stone-700 space-y-2">
              <p>
                I am over 18 years old and have read, understand and agree to the terms below.
              </p>
              <p>
                I am ready, willing and able to sell the horse named and described in this form.
              </p>
              <p>
                I guarantee that all information, provided in this form, is correct and that the
                horse - while in my care - is exactly as they have described it.
              </p>
              <p>
                I agree that a buyer must pay a deposit to hold the horse for second viewings and
                vet checks.
              </p>
              <p>I agree to pay costs owed to PHS, in full, when they are due.</p>
              <p className="mt-3 text-xs text-stone-500">
                I have READ and AGREED to the following terms and conditions — full Listing Terms
                and Conditions, which include payment of commission/completion fee, are available
                via this link:{" "}
                <a
                  href="https://www.performancehorsesales.com.au/phs-services/forms-terms-conditions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#24384e] underline"
                >
                  Listing Terms and Conditions PDF
                </a>
              </p>
            </div>

            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={b("generalTermsAgreed")}
                  onChange={(e) => setField("generalTermsAgreed")(e.target.checked)}
                  data-testid="checkbox-generalTermsAgreed"
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-[#24384e] focus:ring-[#24384e] shrink-0 accent-[#24384e]"
                />
                <span className="text-sm font-semibold text-stone-800">
                  I agree. <span className="text-amber-700">*</span>
                </span>
              </label>
              <FieldError message={errors.generalTermsAgreed} />
            </div>

            <div>
              <FieldLabel label="Digitally signed below:" required />
              <RadioGroup
                name="digitalSignatureConfirmation"
                value={s("digitalSignatureConfirmation")}
                onChange={setField("digitalSignatureConfirmation")}
                options={[
                  "I understand the service that I have selected and confirm that I want to list the horse with PHS. To speed up the process, I will send photos and videos to 0428239317 via WhatsApp to confirm the listing - PHS will start drafting the ad and portfolio.",
                  "As above, however I would also like to discuss the horse being marketed. Please note, we do not discuss marketing strategy or listing price until the horse is listed with us.",
                  "I have further questions about the process prior to confirming listing.",
                ]}
              />
              <FieldError message={errors.digitalSignatureConfirmation} />
            </div>

            <div>
              <FieldLabel
                label="Your Signature"
                required
                note="Add your signature here — type your full name as your digital signature."
              />
              <TextInput
                name="signature"
                value={s("signature")}
                onChange={setField("signature")}
                placeholder="Type your full name here"
              />
              <FieldError message={errors.signature} />
            </div>
          </div>
        );
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-[#24384e] text-white py-8 px-4 text-center">
        <img
          src={phsLogo}
          alt="Performance Horse Sales logo"
          className="mx-auto mb-4 h-28 w-28 rounded-full object-cover shadow-lg"
        />
        <h1 className="text-2xl sm:text-3xl font-bold">Performance Horse Sales</h1>
        <p className="text-blue-200 text-sm mt-1">Marketing Form — Official Seller Submission</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
            <span className="font-medium">
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-stone-700 font-semibold">{STEPS[step]}</span>
          </div>
          <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#24384e] transition-all duration-500"
              style={{ width: `${progress}%` }}
              data-testid="progress-bar"
            />
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
          <div className="p-6 sm:p-8">{renderStep()}</div>

          {/* Nav buttons */}
          <div className="px-6 sm:px-8 py-4 border-t border-stone-100 flex items-center justify-between bg-stone-50 rounded-b-xl">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              data-testid="button-back"
              className="px-5 py-2 rounded-md border border-stone-300 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                data-testid="button-next"
                className="px-6 py-2 rounded-md bg-[#24384e] text-white text-sm font-semibold hover:bg-[#1a2d3f] transition-colors shadow-sm"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={createSubmission.isPending}
                data-testid="button-submit"
                className="px-6 py-2 rounded-md bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 disabled:opacity-50 transition-colors shadow-sm"
              >
                {createSubmission.isPending ? "Submitting..." : "Submit Listing"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">
          Questions? Call us on{" "}
          <a href="tel:0428239317" className="text-[#24384e] font-medium">
            0428239317
          </a>{" "}
          — we respond within 12 hours.
        </p>
      </div>
    </div>
  );
}
