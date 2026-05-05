import { Link } from "wouter";
const phsLogo = `${import.meta.env.BASE_URL}phs-logo.png`;

export default function FindAHorseThankYou() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-lg text-center space-y-5">
        <img src={phsLogo} alt="PHS" className="h-20 w-20 rounded-full object-cover mx-auto shadow" />
        <h1 className="text-3xl font-bold text-[#24384e]">Thank you!</h1>
        <p className="text-stone-600 leading-relaxed">
          Your 'Help Me Find a Horse' search request has been submitted successfully. Sally will be in touch within 12 hours to discuss next steps.
        </p>
        <p className="text-stone-500 text-sm">
          Questions? Call{" "}
          <a href="tel:0428239317" className="text-[#24384e] font-medium">0428 239 317</a>
        </p>
        <div className="pt-4">
          <Link href="/find-a-horse" className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
            ← Submit another search
          </Link>
        </div>
      </div>
    </div>
  );
}
