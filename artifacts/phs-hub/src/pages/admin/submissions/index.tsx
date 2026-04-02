import { useState } from "react";
import { useListSubmissions } from "@workspace/api-client-react";
import { Link } from "wouter";
import AdminLayout from "@/components/layout/admin-layout";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function SubmissionsList() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useListSubmissions({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new": return <Badge variant="secondary">New</Badge>;
      case "processing": return <Badge variant="outline" className="text-blue-500 border-blue-500">Processing</Badge>;
      case "awaiting_review": return <Badge variant="outline" className="text-amber-500 border-amber-500">Awaiting Review</Badge>;
      case "needs_edit": return <Badge variant="destructive">Needs Edit</Badge>;
      case "approved": return <Badge variant="outline" className="text-emerald-500 border-emerald-500">Approved</Badge>;
      case "published": return <Badge className="bg-[#24384e] hover:bg-[#1a2d3f]">Published</Badge>;
      case "archived": return <Badge variant="outline" className="text-gray-500">Archived</Badge>;
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
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="awaiting_review">Awaiting Review</SelectItem>
                <SelectItem value="needs_edit">Needs Edit</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="published">Published</SelectItem>
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
                      <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                        <Link href={`/admin/submissions/${sub.id}`}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
