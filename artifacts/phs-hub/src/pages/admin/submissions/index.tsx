import { useState } from "react";
import { useListSubmissions } from "@workspace/api-client-react";
import { Link } from "wouter";
import AdminLayout from "@/components/layout/admin-layout";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, Eye, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";

export default function SubmissionsList() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useListSubmissions({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete submission");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Submission deleted" });
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Error", description: "Could not delete submission.", variant: "destructive" }),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new": return <Badge variant="secondary">New</Badge>;
      case "awaiting_review": return <Badge variant="outline" className="text-amber-600 border-amber-400">Awaiting Review</Badge>;
      case "awaiting_seller_response": return <Badge variant="outline" className="text-orange-600 border-orange-400">Awaiting Seller</Badge>;
      case "needs_more_information": return <Badge variant="destructive">Needs More Info</Badge>;
      case "ready_to_list": return <Badge variant="outline" className="text-sky-600 border-sky-400">Ready to List</Badge>;
      case "seller_review_sent": return <Badge variant="outline" className="text-violet-600 border-violet-400">Review Sent</Badge>;
      case "approved_to_market": return <Badge variant="outline" className="text-emerald-600 border-emerald-500">Approved to Market</Badge>;
      case "live": return <Badge className="bg-[#24384e] hover:bg-[#1a2d3f]">Live</Badge>;
      case "viewing_pending": return <Badge variant="outline" className="text-cyan-600 border-cyan-400">Viewing Pending</Badge>;
      case "sold_pending": return <Badge variant="outline" className="text-indigo-600 border-indigo-400">Sold Pending</Badge>;
      case "in_vetting": return <Badge variant="outline" className="text-yellow-700 border-yellow-500">In Vetting</Badge>;
      case "sold": return <Badge className="bg-emerald-700 hover:bg-emerald-800">Sold</Badge>;
      case "archived": return <Badge variant="outline" className="text-gray-500">Archived</Badge>;
      // Legacy
      case "processing": return <Badge variant="outline" className="text-blue-500 border-blue-500">Processing</Badge>;
      case "approved": return <Badge variant="outline" className="text-emerald-500 border-emerald-500">Approved</Badge>;
      case "published": return <Badge className="bg-[#24384e] hover:bg-[#1a2d3f]">Published</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Submissions</h1>
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="awaiting_review">Awaiting Review</SelectItem>
                <SelectItem value="awaiting_seller_response">Awaiting Seller</SelectItem>
                <SelectItem value="needs_more_information">Needs More Info</SelectItem>
                <SelectItem value="ready_to_list">Ready to List</SelectItem>
                <SelectItem value="seller_review_sent">Review Sent</SelectItem>
                <SelectItem value="approved_to_market">Approved to Market</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="viewing_pending">Viewing Pending</SelectItem>
                <SelectItem value="sold_pending">Sold Pending</SelectItem>
                <SelectItem value="in_vetting">In Vetting</SelectItem>
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
              ) : data?.submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No submissions found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.submissions.map((sub: any) => (
                  <TableRow key={sub.id} className="hover:bg-muted/30">
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
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild className="h-10 w-10 p-0">
                          <Link href={`/admin/submissions/${sub.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Details</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
