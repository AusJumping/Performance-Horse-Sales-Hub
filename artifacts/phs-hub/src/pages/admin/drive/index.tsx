import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FolderOpen,
  ExternalLink,
  RefreshCw,
  Plus,
  Circle,
} from "lucide-react";

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

function StepNumber({
  n,
  done,
  active,
}: {
  n: number;
  done: boolean;
  active: boolean;
}) {
  if (done)
    return (
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 border border-green-300 flex items-center justify-center">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      </div>
    );
  if (active)
    return (
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#24384e] flex items-center justify-center text-white text-xs font-bold">
        {n}
      </div>
    );
  return (
    <div className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-xs font-bold">
      {n}
    </div>
  );
}

export default function DriveSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery<DriveSettings>({
    queryKey: ["/api/drive/settings"],
    queryFn: () => apiFetch("/drive/settings"),
  });

  const createRootFolderMutation = useMutation({
    mutationFn: () =>
      apiFetch("/drive/settings/create-root-folder", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drive/settings"] });
      toast({
        title: "Drive folders created",
        description:
          "PHS App Folders → SELLER FOLDERS created in your Google Drive.",
      });
    },
    onError: (err: Error) =>
      toast({
        title: "Failed to create folders",
        description: err.message,
        variant: "destructive",
      }),
  });

  const testMutation = useMutation({
    mutationFn: () => apiFetch("/drive/test", { method: "POST" }),
    onSuccess: (data: { email: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drive/settings"] });
      toast({
        title: "Connection successful",
        description: `Connected as ${data.email}`,
      });
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drive/settings"] });
      toast({
        title: "Connection failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const connected = settings?.isConnected ?? false;
  const foldersCreated = !!settings?.rootFolderId;
  const fullySetUp = connected && foldersCreated;

  const step1Done = connected;
  const step2Done = foldersCreated;
  const step2Active = connected && !foldersCreated;

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Google Drive Setup
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect Sally's Google Drive so the app can automatically create
            horse folders and file EOI documents.
          </p>
        </div>

        {/* All-done banner */}
        {fullySetUp && (
          <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="flex-1 text-sm text-green-800">
              <strong>Google Drive is connected and ready.</strong> Horse
              folders will be created automatically when you click{" "}
              <em>Create Drive Folder</em> on a submission.
            </div>
          </div>
        )}

        {/* Step 1 — Connect */}
        <Card className={!step1Done ? "ring-2 ring-[#24384e]/20" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <StepNumber n={1} done={step1Done} active={!step1Done} />
              <div>
                <CardTitle className="text-base">
                  Connect to Google Drive
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Verify that the app can access Sally's Google account.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : connected ? (
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-800 border-green-200"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-red-50 text-red-700 border-red-200"
                  >
                    <XCircle className="h-3 w-3 mr-1" /> Not connected
                  </Badge>
                )}
                {settings?.lastTestedAt && (
                  <span className="text-xs text-muted-foreground">
                    Last tested{" "}
                    {new Date(settings.lastTestedAt).toLocaleString()}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant={connected ? "outline" : "default"}
                className={
                  !connected ? "bg-[#24384e] hover:bg-[#1a2d3f]" : ""
                }
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                {connected ? "Re-test" : "Connect"}
              </Button>
            </div>
            {settings?.lastTestError && (
              <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {settings.lastTestError}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Step 2 — Create folders */}
        <Card
          className={
            !step1Done
              ? "opacity-50 pointer-events-none"
              : step2Active
              ? "ring-2 ring-[#24384e]/20"
              : ""
          }
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <StepNumber n={2} done={step2Done} active={step2Active} />
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Create Folder Structure
                </CardTitle>
                <CardDescription className="mt-0.5">
                  The app creates a home folder in Google Drive where all horse
                  folders will live.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs font-mono bg-muted/40 border rounded px-3 py-2 space-y-0.5 text-foreground">
              <div>📁 PHS App Folders</div>
              <div className="pl-4">📁 SELLER FOLDERS</div>
              <div className="pl-8 text-muted-foreground">
                ← horse folders go here
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Once created, Sally can move her existing seller folders into{" "}
              <strong>SELLER FOLDERS</strong>.
            </p>

            {step2Done ? (
              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-800 border-green-200"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Folders created
                </Badge>
                <div className="flex gap-3 flex-wrap">
                  {settings?.rootFolderLink && (
                    <a
                      href={settings.rootFolderLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 underline flex items-center gap-1"
                    >
                      PHS App Folders <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {settings?.sellerFolderLink && (
                    <a
                      href={settings.sellerFolderLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 underline flex items-center gap-1"
                    >
                      SELLER FOLDERS <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <Button
                onClick={() => createRootFolderMutation.mutate()}
                disabled={createRootFolderMutation.isPending || !connected}
                className="bg-[#24384e] hover:bg-[#1a2d3f]"
              >
                {createRootFolderMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Folder Structure in Drive
              </Button>
            )}
          </CardContent>
        </Card>

        {/* How it works — only show once set up */}
        {fullySetUp && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="flex-shrink-0 font-semibold text-foreground">
                  1.
                </span>
                <span>
                  When a horse is approved, click{" "}
                  <strong>Create Drive Folder</strong> on the submission detail
                  page. The app creates{" "}
                  <em>[Horse Name] — Seller Folder</em> with three subfolders:
                  Portfolio, Documents, and EOI Viewer Forms.
                </span>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 font-semibold text-foreground">
                  2.
                </span>
                <span>
                  When an EOI comes in, click <strong>Backup to Drive</strong>{" "}
                  on the EOI detail page. The app creates a formatted Google Doc
                  and files it in that horse's EOI Viewer Forms folder.
                </span>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 font-semibold text-foreground">
                  3.
                </span>
                <span>
                  Links to all created folders and documents appear directly on
                  the submission and EOI detail pages.
                </span>
              </div>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs">
                <strong>Safety note:</strong> The app only creates new files
                inside folders it creates above. It never reads, renames, moves,
                or deletes any existing content in your Drive.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
