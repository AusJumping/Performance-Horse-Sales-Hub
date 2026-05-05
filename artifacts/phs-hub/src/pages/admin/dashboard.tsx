import { useGetDashboardStats, useGetRecentSubmissions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import AdminLayout from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Clock, CheckCircle, FileText, BarChart3, Mail, SearchCheck } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { SearchStatusBadge } from "./horse-searches/index";

interface HorseSearch {
  id: number;
  firstName: string;
  surname: string;
  location: string;
  searchServiceLevel: string;
  status: string;
  formData: Record<string, unknown>;
  createdAt: string;
}

export default function Dashboard() {
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();
  const { data: recent, isLoading: isLoadingRecent } = useGetRecentSubmissions();

  const { data: eois } = useQuery<{ id: number; status: string }[]>({
    queryKey: ["eois"],
    queryFn: async () => {
      const res = await fetch("/api/eois");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: horseSearches, isLoading: isLoadingSearches } = useQuery<HorseSearch[]>({
    queryKey: ["horse-searches"],
    queryFn: async () => {
      const res = await fetch("/api/horse-searches");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const newEoiCount = (eois ?? []).filter((e) => e.status === "new").length;
  const newSearchCount = (horseSearches ?? []).filter((s) => s.status === "new").length;
  const recentSearches = (horseSearches ?? []).slice(0, 5);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <Button asChild>
          <Link href="/admin/submissions">
            View All Submissions <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {isLoadingStats ? (
          Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <Link href="/admin/submissions">
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-foreground/20 border-l-4 border-l-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">View all →</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/submissions?status=awaiting_review">
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-accent/40 border-l-4 border-l-accent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Awaiting Review</CardTitle>
                  <Clock className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.awaitingReview || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Requires attention →</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/submissions?status=published">
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-foreground/20 border-l-4 border-l-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Published</CardTitle>
                  <CheckCircle className="h-4 w-4 text-[#24384e]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.published || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Live listings →</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/submissions">
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-foreground/20 border-l-4 border-l-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.recentCount || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Last 7 days →</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/eois">
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-sky-400/40 border-l-4 border-l-sky-400">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">New EOIs</CardTitle>
                  <Mail className="h-4 w-4 text-sky-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{newEoiCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">View new EOIs →</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/horse-searches">
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-amber-500/40 border-l-4 border-l-amber-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">New Searches</CardTitle>
                  <SearchCheck className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{newSearchCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Horse finder requests →</p>
                </CardContent>
              </Card>
            </Link>
          </>
        )}
      </div>

      {/* Recent panels — side by side on large screens */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Recent Submissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription className="mt-0.5">Latest horses submitted by sellers.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/submissions">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingRecent ? (
              <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : recent?.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No submissions yet.</div>
            ) : (
              <div className="space-y-2">
                {recent?.map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-medium text-sm truncate">{sub.horseName || "Unnamed Horse"}</span>
                      <span className="text-xs text-muted-foreground truncate">{sub.sellerName} · {sub.askingPrice || "Price N/A"}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <StatusBadge status={sub.status} />
                      <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 border-0 h-7 text-xs" asChild>
                        <Link href={`/admin/submissions/${sub.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Horse Searches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recent Horse Searches</CardTitle>
              <CardDescription className="mt-0.5">Latest 'Help Me Find a Horse' requests.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/horse-searches">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingSearches ? (
              <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : recentSearches.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No search requests yet.</div>
            ) : (
              <div className="space-y-2">
                {recentSearches.map((hs) => (
                  <div key={hs.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-medium text-sm truncate">{hs.firstName} {hs.surname}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {hs.location} · {(hs.formData?.budget as string) || "No budget"} · {hs.searchServiceLevel === "level2" ? "Premium" : "Standard"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <SearchStatusBadge status={hs.status} />
                      <Button size="sm" className="bg-[#24384e] text-white hover:bg-[#1a2d3f] h-7 text-xs border-0" asChild>
                        <Link href={`/admin/horse-searches/${hs.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  );
}
