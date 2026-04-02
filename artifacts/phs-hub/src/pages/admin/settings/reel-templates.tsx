import { useState } from "react";
import AdminLayout from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Film, Plus, Trash2, Star, Pencil, Check, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ReelTemplate {
  id: number;
  name: string;
  description: string | null;
  apiKey: string;
  templateId: string;
  isDefault: boolean;
  createdAt: string;
}

async function fetchTemplates(): Promise<ReelTemplate[]> {
  const res = await fetch("/api/reel-templates");
  if (!res.ok) throw new Error("Failed to load templates");
  return res.json();
}

const EMPTY_FORM = { name: "", description: "", apiKey: "", templateId: "", isDefault: false };

export default function ReelTemplatesSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<ReelTemplate[]>({
    queryKey: ["reel-templates"],
    queryFn: fetchTemplates,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["reel-templates"] });

  const createMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
      const res = await fetch("/api/reel-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
    },
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast({ title: "Template added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof EMPTY_FORM> }) => {
      const res = await fetch(`/api/reel-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
    },
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      setForm(EMPTY_FORM);
      toast({ title: "Template updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/reel-templates/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Template deleted" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/reel-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); toast({ title: "Default template updated" }); },
  });

  const handleSubmit = () => {
    if (!form.name.trim() || !form.apiKey.trim() || !form.templateId.trim()) {
      toast({ title: "Name, API Key and Template ID are required.", variant: "destructive" });
      return;
    }
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const startEdit = (t: ReelTemplate) => {
    setEditingId(t.id);
    setForm({ name: t.name, description: t.description ?? "", apiKey: "", templateId: t.templateId, isDefault: t.isDefault });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Film className="h-6 w-6 text-rose-500" /> Reel Templates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure Creatomate templates for automated reel generation. Each template has its own API key and template ID.
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Template
            </Button>
          )}
        </div>

        {showForm && (
          <Card className="border-rose-200 bg-rose-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{editingId ? "Edit Template" : "New Reel Template"}</CardTitle>
              <CardDescription>
                Find your Template ID in Creatomate → Templates. Your API key is in Account → API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Template Name *</label>
                  <Input
                    placeholder="e.g. Standard Landscape Reel"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <Input
                    placeholder="e.g. 16:9, three photos, 15s"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Creatomate API Key *{editingId ? " (leave blank to keep existing)" : ""}
                </label>
                <Input
                  type="password"
                  placeholder={editingId ? "Enter new key to replace, or leave blank" : "Paste your Creatomate API key"}
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Creatomate Template ID *</label>
                <Input
                  placeholder="e.g. 7a86f03f-2c95-4c5c-abf0-5c769043fba6"
                  value={form.templateId}
                  onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isDefault"
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isDefault" className="text-sm cursor-pointer">Set as default template</label>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSubmit} disabled={isPending} className="gap-2">
                  <Check className="h-4 w-4" />
                  {isPending ? "Saving…" : editingId ? "Save Changes" : "Add Template"}
                </Button>
                <Button variant="ghost" onClick={cancelForm} className="gap-2">
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading templates…</div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No reel templates configured yet. Click <strong>Add Template</strong> to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <Card key={t.id} className={t.isDefault ? "border-rose-300 bg-rose-50/20" : ""}>
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{t.name}</span>
                      {t.isDefault && (
                        <Badge variant="outline" className="text-rose-600 border-rose-300 text-[10px] gap-1">
                          <Star className="h-2.5 w-2.5 fill-rose-500 text-rose-500" /> Default
                        </Badge>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    )}
                    <div className="flex gap-4 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Template: <span className="text-foreground">{t.templateId}</span>
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Key: <span className="text-foreground">{t.apiKey}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!t.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Set as default"
                        onClick={() => setDefaultMutation.mutate(t.id)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => startEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
