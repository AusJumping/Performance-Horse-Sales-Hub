import { useEffect } from "react";
import { useLocation } from "wouter";
import { isAdminAuthenticated } from "@/hooks/use-admin-auth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate("/admin/login");
    }
  }, []);

  if (!isAdminAuthenticated()) return null;

  return <>{children}</>;
}
