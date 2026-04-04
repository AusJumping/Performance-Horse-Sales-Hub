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
  overlayTextField: string;
  text2Field: string;
  text3Field: string;
  text4Field: string;
  text5Field: string;
  text6Field: string;
  brandTextField: string;
  websiteTextField: string;
  image1Field: string;
  image2Field: string;
  image3Field: string;
  image4Field: string;
  logoField: string;
  logoUrl: string;
  apiVersion: string;
  createdAt: string;
}

async function fetchTemplates(): Promise<ReelTemplate[]> {
  const res = await fetch("/api/reel-templates");
  if (!res.ok) throw new Error("Failed to load templates");
  return res.json();
}

const EMPTY_FORM = {
  name: "",
  description: "",
  apiKey: "",
  templateId: "",
  isDefault: false,
  overlayTextField: "Title.text",
  text2Field: "",
  text3Field: "",
  text4Field: "",
  text5Field: "",
  text6Field: "",
  brandTextField: "Brand.text",
  websiteTextField: "Website.text",
  image1Field: "Image-1.source",
  image2Field: "Image-2.source",
  image3Field: "Image-3.source",
  image4Field: "",
  logoField: "",
  logoUrl: "",
  apiVersion: "v1",
};

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
    setForm({
      name: t.name,
      description: t.description ?? "",
      apiKey: "",
      templateId: t.templateId,
      isDefault: t.isDefault,
      overlayTextField: t.overlayTextField ?? "Title.text",
      text2Field: t.text2Field ?? "",
      text3Field: t.text3Field ?? "",
      text4Field: t.text4Field ?? "",
      text5Field: t.text5Field ?? "",
      text6Field: t.text6Field ?? "",
      brandTextField: t.brandTextField ?? "Brand.text",
      websiteTextField: t.websiteTextField ?? "Website.text",
      image1Field: t.image1Field ?? "Image-1.source",
      image2Field: t.image2Field ?? "Image-2.source",
      image3Field: t.image3Field ?? "Image-3.source",
      image4Field: t.image4Field ?? "",
      logoField: t.logoField ?? "",
      logoUrl: t.logoUrl ?? "",
      apiVersion: t.apiVersion ?? "v1",
    });
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Creatomate Template ID *</label>
                  <Input
                    placeholder="e.g. d98214c7-f4e1-4051-93b4-3aed6c5cdaec"
                    value={form.templateId}
                    onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">API Version</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.apiVersion}
                    onChange={(e) => setForm({ ...form, apiVersion: e.target.value })}
                  >
                    <option value="v1">v1</option>
                    <option value="v2">v2</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">Check your Creatomate integration code</p>
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Image Source Field Names
                </p>
                <p className="text-xs text-muted-foreground">
                  Element names for photo slots — copy from your Creatomate template editor. Leave blank to skip a slot.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Image 1</label>
                    <Input
                      placeholder="e.g. Main-Image.source"
                      value={form.image1Field}
                      onChange={(e) => setForm({ ...form, image1Field: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Image 2</label>
                    <Input
                      placeholder="e.g. Slide-1-Image.source"
                      value={form.image2Field}
                      onChange={(e) => setForm({ ...form, image2Field: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Image 3</label>
                    <Input
                      placeholder="e.g. Slide-2-Image.source"
                      value={form.image3Field}
                      onChange={(e) => setForm({ ...form, image3Field: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Image 4 (optional)</label>
                    <Input
                      placeholder="e.g. Slide-3-Image.source"
                      value={form.image4Field}
                      onChange={(e) => setForm({ ...form, image4Field: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Logo
                </p>
                <p className="text-xs text-muted-foreground">
                  If your template has a logo element, enter its element name and the public URL of your logo image. The logo must be reachable from the internet.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Logo Element Name</label>
                    <Input
                      placeholder="e.g. Logo.source"
                      value={form.logoField}
                      onChange={(e) => setForm({ ...form, logoField: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground">From your Creatomate template editor</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Logo URL</label>
                    <Input
                      placeholder="https://your-domain.com/phs-logo.jpg"
                      value={form.logoUrl}
                      onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground">Must be a publicly accessible URL</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Text Field Names
                </p>
                <p className="text-xs text-muted-foreground">
                  Listing text lines are split evenly across all non-empty text slots (1–6). Add more slots to put different text on each slide. Leave brand/website blank if not in your template.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {(["overlayTextField", "text2Field", "text3Field", "text4Field", "text5Field", "text6Field"] as const).map((key, i) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Text Slot {i + 1}{i === 0 ? " *" : " (optional)"}</label>
                      <Input
                        placeholder={i === 0 ? "Title.text" : `e.g. Slide-${i}-Text.text`}
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Brand field</label>
                    <Input
                      placeholder="Brand.text"
                      value={form.brandTextField}
                      onChange={(e) => setForm({ ...form, brandTextField: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground">Leave blank if not in template</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Website field</label>
                    <Input
                      placeholder="Website.text"
                      value={form.websiteTextField}
                      onChange={(e) => setForm({ ...form, websiteTextField: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground">Leave blank if not in template</p>
                  </div>
                </div>
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
                      <Badge variant="secondary" className="text-[10px]">{t.apiVersion ?? "v1"}</Badge>
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    )}
                    <div className="flex gap-4 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Template: <span className="text-foreground">{t.templateId}</span>
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Images: <span className="text-foreground">
                          {[t.image1Field, t.image2Field, t.image3Field, t.image4Field].filter(Boolean).join(", ")}
                        </span>
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
