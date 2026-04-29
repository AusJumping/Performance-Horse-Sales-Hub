import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  ExternalLink,
  FilePen,
  Clapperboard,
  Inbox,
  FileStack,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { clearAdminToken } from "@/hooks/use-admin-auth";
const phsLogo = `${import.meta.env.BASE_URL}phs-logo.png`;

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, navigate] = useLocation();

  const navigation = [
    { name: "Dashboard",    href: "/admin",             icon: LayoutDashboard },
    { name: "Submissions",  href: "/admin/submissions", icon: FileStack },
    { name: "EOIs",         href: "/admin/eois",        icon: Inbox },
  ];

  const handleLogout = () => {
    clearAdminToken();
    navigate("/admin/login");
  };

  const NavItem = ({
    href,
    icon: Icon,
    label,
    isActive,
    external,
    extraRight,
  }: {
    href: string;
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    external?: boolean;
    extraRight?: ReactNode;
  }) => {
    const base =
      "flex items-center gap-3 rounded-xl px-3 py-2 transition-all text-sm";
    const activeClass = "bg-sidebar-accent text-sidebar-accent-foreground font-medium";
    const inactiveClass =
      "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground";

    const iconBox = (
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          isActive
            ? "bg-accent/20 text-accent"
            : "bg-sidebar-foreground/10 text-sidebar-foreground/60 group-hover:bg-accent/10 group-hover:text-accent"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
    );

    const content = (
      <>
        {iconBox}
        <span className="flex-1">{label}</span>
        {extraRight}
      </>
    );

    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`group ${base} ${isActive ? activeClass : inactiveClass}`}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        href={href}
        className={`group ${base} ${isActive ? activeClass : inactiveClass}`}
      >
        {content}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-4">
      <div className="flex h-14 items-center px-4 lg:h-16">
        <Link href="/admin" className="flex items-center gap-2.5 font-semibold">
          <img src={phsLogo} alt="PHS logo" className="h-8 w-8 rounded-full object-cover" />
          <span className="text-base text-sidebar-foreground font-semibold">PHS Admin</span>
        </Link>
      </div>

      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm gap-1">
          {navigation.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/admin" && location.startsWith(item.href));
            return (
              <NavItem
                key={item.name}
                href={item.href}
                icon={item.icon}
                label={item.name}
                isActive={isActive}
              />
            );
          })}

          <div className="my-3 border-t border-sidebar-border" />

          <NavItem
            href="/admin/settings/reel-templates"
            icon={Clapperboard}
            label="Reel Templates"
            isActive={location.startsWith("/admin/settings/reel-templates")}
          />

          <div className="my-3 border-t border-sidebar-border" />

          <NavItem
            href="/"
            icon={FilePen}
            label="Seller Form"
            isActive={false}
            external
            extraRight={<ExternalLink className="h-3 w-3 opacity-40" />}
          />
          <NavItem
            href="/eoi"
            icon={Send}
            label="EOI Form"
            isActive={false}
            external
            extraRight={<ExternalLink className="h-3 w-3 opacity-40" />}
          />
        </nav>
      </div>

      <div className="mt-auto p-4">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-all"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-foreground/10 text-sidebar-foreground/60 group-hover:bg-accent/10 group-hover:text-accent transition-colors">
            <LogOut className="h-4 w-4" />
          </span>
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-sidebar md:block">
        <SidebarContent />
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-16 lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 w-[240px]">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1" />
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
