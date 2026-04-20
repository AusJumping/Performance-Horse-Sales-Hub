import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import AdminLayout from "@/components/layout/admin-layout";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal } from "lucide-react";

const EOI_STATUSES = [
  { value: "new", label: "New", className: "bg-sky-100 text-sky-800 border-sky-200" },
  { value: "under_review", label: "Under Review", className: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "suitable", label: "Suitable", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "not_suitable", label: "Not Suitable", className: "bg-red-100 text-red-800 border-red-200" },
  { value: "viewing_booked", label: "Viewing Booked", className: "bg-violet-100 text-violet-800 border-violet-200" },
  { value: "proceeding", label: "Proceeding", className: "bg-teal-100 text-teal-800 border-teal-200" },
  { value: "declined", label: "Declined", className: "bg-stone-100 text-stone-600 border-stone-200" },
];

export function EoiStatusBadge({ status }: { status: string }) {
  const s = EOI_STATUSES.find((x) => x.value === status);
  const className = s?.className ?? "bg-stone-100 text-stone-600 border-stone-200";
  const label = s?.label ?? status;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

interface Eoi {
  id: number;
  buyerEmail: string;
  buyerFirstName: string;
  buyerSurname: string;
  buyerLocation: string;
  buyerPhone: string;
  horseName: string;
  formData: Record<string, unknown>;
  waiverAgreed: boolean;
  declarationAgreed: boolean;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

async function fetchEois(): Promise<Eoi[]> {
  const res = await fetch("/api/eois");
  if (!res.ok) throw new Error("Failed to fetch EOIs");
  return res.json();
}

export default function EoisList() {
  const search$ = useSearch();
  const initialStatus = new URLSearchParams(search$).get("status") ?? "all";
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["eois"], queryFn: fetchEois });

  const filtered = (data ?? []).filter((e) => {
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      `${e.buyerFirstName} ${e.buyerSurname}`.toLowerCase().includes(q) ||
      e.horseName.toLowerCase().includes(q) ||
      e.buyerEmail.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expressions of Interest</h1>
          <p className="text-muted-foreground mt-1">Buyer EOIs submitted through the public form.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/eoi" target="_blank" rel="noreferrer">View EOI Form ↗</a>
        </Button>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by buyer name, horse, or email…"
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
                {EOI_STATUSES.map((s) => (
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
            {data?.length === 0 ? "No EOIs have been submitted yet." : "No EOIs match your filters."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Horse</TableHead>
                <TableHead>Requesting</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((eoi) => {
                const requestTypes = (eoi.formData?.requestTypes as string[]) ?? [];
                const primaryRequest = requestTypes[0] ?? "—";
                return (
                  <TableRow key={eoi.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(eoi.createdAt), "d MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{eoi.buyerFirstName} {eoi.buyerSurname}</div>
                      <div className="text-xs text-muted-foreground">{eoi.buyerLocation}</div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{eoi.horseName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px]">
                      <span className="truncate block" title={requestTypes.join(", ")}>{primaryRequest}</span>
                      {requestTypes.length > 1 && (
                        <span className="text-xs text-muted-foreground">+{requestTypes.length - 1} more</span>
                      )}
                    </TableCell>
                    <TableCell><EoiStatusBadge status={eoi.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 border-0">
                        <Link href={`/admin/eois/${eoi.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminLayout>
  );
}
