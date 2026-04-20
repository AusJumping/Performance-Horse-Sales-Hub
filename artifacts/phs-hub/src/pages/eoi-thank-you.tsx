import { Link } from "wouter";

export default function EoiThankYou() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-stone-200 p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: "hsl(20 55% 45%)" }}>
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#24384e]">EOI Submitted!</h1>
        <p className="text-stone-600 text-sm leading-relaxed">
          Thank you for your Expression of Interest. PHS will review your submission and share it with the seller. 
          We aim to respond within <strong>12 hours</strong>.
        </p>
        <p className="text-stone-500 text-xs leading-relaxed">
          If you don't hear from us, please contact us on <strong>0428 239 317</strong>.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-block text-sm font-medium text-[#24384e] underline underline-offset-2 hover:opacity-70"
          >
            Return to home
          </Link>
        </div>
      </div>
    </div>
  );
}
