import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import AdminLayout from "@/components/layout/admin-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, FolderOpen } from "lucide-react";

const STATUSES = [
  { value: "new",                     label: "New",                     className: "bg-sky-100 text-sky-800 border-sky-200" },
  { value: "awaiting_review",         label: "Awaiting Review",         className: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "contact_made_by_phs",     label: "Contact Made by PHS",     className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { value: "contact_email_sent",      label: "Contact Email Sent",      className: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "declined_by_phs",         label: "Declined by PHS",         className: "bg-red-100 text-red-700 border-red-200" },
  { value: "declined_by_client",      label: "Declined by Client",      className: "bg-rose-100 text-rose-700 border-rose-200" },
  { value: "costs_agreement_signed",  label: "Costs Agreement Signed",  className: "bg-violet-100 text-violet-800 border-violet-200" },
  { value: "search_criteria_approved",label: "Search Criteria Approved",className: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "live",                    label: "Live",                    className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "deposit_paid",            label: "Deposit Paid",            className: "bg-teal-100 text-teal-800 border-teal-200" },
  { value: "purchased",               label: "Purchased",               className: "bg-green-100 text-green-800 border-green-200" },
  { value: "paused",                  label: "Paused",                  className: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "search_completed",        label: "Search Completed",        className: "bg-cyan-100 text-cyan-800 border-cyan-200" },
];

export function SearchStatusBadge({ status }: { status: string }) {
  const s = STATUSES.find((x) => x.value === status);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s?.className ?? "bg-stone-100 text-stone-600 border-stone-200"}`}>
      {s?.label ?? status}
    </span>
  );
}

interface HorseSearch {
  id: number;
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  location: string;
  searchServiceLevel: string;
  status: string;
  driveFolderLink: string | null;
  driveSetupStatus: string;
  createdAt: string;
  formData: Record<string, unknown>;
}

async function fetchSearches(): Promise<HorseSearch[]> {
  const res = await fetch("/api/horse-searches");
  if (!res.ok) throw new Error("Failed to fetch searches");
  return res.json();
}

export default function HorseSearchesList() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["horse-searches"], queryFn: fetchSearches });

  const filtered = (data ?? []).filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      `${item.firstName} ${item.surname}`.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Horse Search Requests</h1>
          <p className="text-muted-foreground mt-1">'Help Me Find a Horse' form submissions.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/find-a-horse" target="_blank" rel="noreferrer">View Search Form ↗</a>
        </Button>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or location…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {data?.length === 0 ? "No search requests yet." : "No searches match your filters."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Drive</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(item.createdAt), "d MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{item.firstName} {item.surname}</div>
                    <div className="text-xs text-muted-foreground">{item.location}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px]">
                    <span className="truncate block">{item.searchServiceLevel === "level2" ? "Premium Concierge" : "Standard Search"}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(item.formData?.budget as string) ?? "—"}
                  </TableCell>
                  <TableCell>
                    {item.driveFolderLink ? (
                      <a href={item.driveFolderLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline">
                        <FolderOpen className="h-3 w-3" /> Open
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {item.driveSetupStatus === "failed" ? "⚠ Failed" : item.driveSetupStatus === "creating" ? "Creating…" : "Pending"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell><SearchStatusBadge status={item.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 border-0">
                      <Link href={`/admin/horse-searches/${item.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminLayout>
  );
}
