import { useState } from "react";
import { useLocation } from "wouter";
import { setAdminToken } from "@/hooks/use-admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff } from "lucide-react";

const phsLogo = `${import.meta.env.BASE_URL}phs-logo.png`;

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const { token } = await res.json();
        setAdminToken(token);
        navigate("/admin");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Incorrect password.");
      }
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={phsLogo} alt="PHS logo" className="h-16 w-16 rounded-full object-cover mb-4 shadow" />
          <h1 className="text-2xl font-bold text-[#24384e]">PHS Admin</h1>
          <p className="text-sm text-stone-500 mt-1">Performance Horse Sales</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-full bg-[#24384e]/10 flex items-center justify-center">
              <Lock className="h-4 w-4 text-[#24384e]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-800">Staff Login</h2>
              <p className="text-xs text-stone-400">Enter your admin password to continue</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Admin password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="pr-10"
                autoFocus
                data-testid="input-adminPassword"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center" data-testid="text-loginError">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-[#24384e] hover:bg-[#1a2d3f]"
              disabled={loading || !password}
              data-testid="button-login"
            >
              {loading ? "Checking..." : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="text-center mt-6">
          <a href="/" className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
            ← Back to seller form
          </a>
        </p>
      </div>
    </div>
  );
}
