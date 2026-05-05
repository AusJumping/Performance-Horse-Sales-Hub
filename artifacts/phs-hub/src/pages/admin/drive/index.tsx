import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, FolderOpen, ExternalLink, RefreshCw, Plus } from "lucide-react";


interface DriveSettings {
  id?: number;
  rootFolderId?: string | null;
  rootFolderLink?: string | null;
  sellerFolderParentId: string | null;
  sellerFolderLink?: string | null;
  isConnected: boolean;
  lastTestedAt?: string | null;
  lastTestError?: string | null;
}

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

export default function DriveSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery<DriveSettings>({
    queryKey: ["/api/drive/settings"],
    queryFn: () => apiFetch("/drive/settings"),
  });

  const createRootFolderMutation = useMutation({
    mutationFn: () => apiFetch("/drive/settings/create-root-folder", { method: "POST" }),
    onSuccess: (data: { sellerFolderId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drive/settings"] });
      setFolderIdInput(data.sellerFolderId);
      toast({
        title: "Drive folders created",
        description: "PHS App Folders → SELLER FOLDERS created in your Google Drive.",
      });
    },
    onError: (err: Error) =>
      toast({ title: "Failed to create folders", description: err.message, variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: () => apiFetch("/drive/test", { method: "POST" }),
    onSuccess: (data: { email: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drive/settings"] });
      toast({ title: "Connection successful", description: `Connected as ${data.email}` });
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drive/settings"] });
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
    },
  });

  const connected = settings?.isConnected;

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Google Drive</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect to Sally's Google Drive to automatically file EOIs and create horse folders.
          </p>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection Status</CardTitle>
            <CardDescription>
              Uses the secure Replit Google Drive integration. No password required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : connected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {isLoading ? "Checking…" : connected ? "Connected" : "Not connected"}
                </span>
                {settings?.lastTestedAt && (
                  <span className="text-xs text-muted-foreground">
                    — last tested {new Date(settings.lastTestedAt).toLocaleString()}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Test Connection
              </Button>
            </div>
            {settings?.lastTestError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {settings.lastTestError}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Folder Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Seller Folders Location
            </CardTitle>
            <CardDescription>
              The app needs a folder in your Drive where it can create horse folders. Use the button
              below to let the app create it for you — this is the easiest option.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <p className="text-sm font-medium">Folder structure</p>
              <p className="text-xs text-muted-foreground">
                Creates the full folder structure in your Google Drive:
              </p>
              <div className="text-xs font-mono bg-background border rounded px-3 py-2 space-y-0.5 text-foreground">
                <div>📁 PHS App Folders</div>
                <div className="pl-4">📁 SELLER FOLDERS</div>
                <div className="pl-8 text-muted-foreground">← horse folders go here</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Once created, Sally can move her existing seller folders into{" "}
                <strong>SELLER FOLDERS</strong>.
              </p>
              {settings?.rootFolderId ? (
                <div className="space-y-1.5">
                  <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Folders already created
                  </Badge>
                  <div className="flex gap-2">
                    {settings.rootFolderLink && (
                      <a href={settings.rootFolderLink} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-600 underline flex items-center gap-1">
                        PHS App Folders <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {settings.sellerFolderLink && (
                      <a href={settings.sellerFolderLink} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-600 underline flex items-center gap-1">
                        SELLER FOLDERS <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => createRootFolderMutation.mutate()}
                  disabled={createRootFolderMutation.isPending}
                  className="bg-[#24384e] hover:bg-[#1a2d3f]"
                >
                  {createRootFolderMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : <Plus className="h-4 w-4 mr-2" />}
                  Create Folder Structure in Drive
                </Button>
              )}
            </div>

          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="flex-shrink-0 font-semibold text-foreground">1.</span>
              <span>
                When a horse is approved, click <strong>Create Drive Folder</strong> on the
                submission detail page. The app will create:{" "}
                <em>[Horse Name] — Seller Folder</em> containing three subfolders:
                Portfolio, Documents, and EOI Viewer Forms.
              </span>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 font-semibold text-foreground">2.</span>
              <span>
                When an EOI comes in, click <strong>Backup to Drive</strong> on the EOI detail page.
                The app will create a formatted Google Doc and file it in the matching horse's{" "}
                <em>EOI Viewer Forms</em> folder.
              </span>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 font-semibold text-foreground">3.</span>
              <span>
                All created files are accessible directly from the admin — links appear on the
                submission and EOI detail pages.
              </span>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
              <strong>Safety note:</strong> The app only creates new files inside folders you
              configure above. It never reads, renames, moves, or deletes any existing content in
              your Drive.
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
