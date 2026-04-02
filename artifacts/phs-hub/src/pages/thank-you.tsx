import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-bold text-primary">Thank You!</h1>
        <p className="text-lg text-muted-foreground">
          Your listing has been submitted successfully. Our team will review the information and get back to you shortly.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/">Submit Another Horse</Link>
        </Button>
      </div>
    </div>
  );
}
