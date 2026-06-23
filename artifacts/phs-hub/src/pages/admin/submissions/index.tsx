import { useState } from "react";
import { useListSubmissions } from "@workspace/api-client-react";
import { Link, useSearch } from "wouter";
import AdminLayout from "@/components/layout/admin-layout";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";

export default function SubmissionsList() {
  const search$ = useSearch();
  const initialStatus = new URLSearchParams(search$).get("status") ?? "active";
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useListSubmissions({
    status: (statusFilter === "all" || statusFilter === "active") ? undefined : statusFilter,
    search: search || undefined,
  });

  const allSubmissions = data?.submissions ?? [];
  const submissions = statusFilter === "active"
    ? allSubmissions.filter((s: any) => s.status !== "archived")
    : allSubmissions;

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete submission");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/submissions"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Submission deleted" });
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Error", description: "Could not delete submission.", variant: "destructive" }),
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update submission");
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["/api/submissions"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: status === "archived" ? "Submission archived" : "Submission restored to Active" });
    },
    onError: () => toast({ title: "Error", description: "Could not update submission.", variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Submissions</h1>
          <p className="text-muted-foreground mt-1">Manage and review all horse listings.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by horse name, breed, or seller..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (excl. Archived)</SelectItem>
                <SelectItem value="all">All (incl. Archived)</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contact_made_by_phs">Contact Made by PHS</SelectItem>
                <SelectItem value="declined_by_phs">Declined by PHS</SelectItem>
                <SelectItem value="declined_by_client">Declined by Client</SelectItem>
                <SelectItem value="costs_agreement_sent">Costs Agreement Sent</SelectItem>
                <SelectItem value="drafting">Drafting</SelectItem>
                <SelectItem value="approval_pack_sent">Approval Pack Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="listed">Listed</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="contract_signed">Contract Signed</SelectItem>
                <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
                <SelectItem value="vetted">Vetted</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Horse</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Discipline</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    {statusFilter === "archived" ? "No archived submissions." : "No submissions found."}
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((sub: any) => (
                  <TableRow key={sub.id} className={`hover:bg-muted/30 ${sub.status === "archived" ? "opacity-60" : ""}`}>
                    <TableCell>
                      <div className="font-medium">{sub.horseName || 'Unnamed'}</div>
                      <div className="text-xs text-muted-foreground">{sub.breed} • {sub.age} yrs</div>
                    </TableCell>
                    <TableCell>
                      <div>{sub.sellerName}</div>
                      <div className="text-xs text-muted-foreground">{sub.sellerEmail}</div>
                    </TableCell>
                    <TableCell>{sub.discipline}</TableCell>
                    <TableCell className="font-medium">{sub.askingPrice || 'POA'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(sub.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell><StatusBadge status={sub.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 border-0" asChild>
                          <Link href={`/admin/submissions/${sub.id}`}>View</Link>
                        </Button>
                        {sub.status === "archived" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Unarchive"
                            onClick={() => archiveMutation.mutate({ id: sub.id, status: "new" })}
                            disabled={archiveMutation.isPending}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                            <span className="sr-only">Unarchive</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                            title="Archive"
                            onClick={() => archiveMutation.mutate({ id: sub.id, status: "archived" })}
                            disabled={archiveMutation.isPending}
                          >
                            <Archive className="h-4 w-4" />
                            <span className="sr-only">Archive</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete permanently"
                          onClick={() => setDeleteTarget({ id: sub.id, name: sub.horseName || "Unnamed" })}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all associated
              media files, AI content, and notes. This cannot be undone.
              <br /><br />
              <span className="text-amber-700 font-medium">Tip: use Archive instead to keep the record safe.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
