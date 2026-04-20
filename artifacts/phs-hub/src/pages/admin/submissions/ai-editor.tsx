import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetSubmission, 
  useGetAiOutput, 
  useUpdateAiOutput,
  getGetSubmissionQueryKey,
  getGetAiOutputQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Copy, CheckCircle2 } from "lucide-react";

export default function AiEditor() {
  const { id } = useParams<{ id: string }>();
  const submissionId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sub, isLoading: isLoadingSub } = useGetSubmission(submissionId, {
    query: { enabled: !!submissionId, queryKey: getGetSubmissionQueryKey(submissionId) }
  });

  const { data: aiOutput, isLoading: isLoadingAi } = useGetAiOutput(submissionId, {
    query: { enabled: !!submissionId, queryKey: getGetAiOutputQueryKey(submissionId) }
  });

  const updateAi = useUpdateAiOutput();
  
  const [formData, setFormData] = useState<any>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (aiOutput) {
      setFormData({
        masterListing: aiOutput.masterListing || "",
        shortListing: aiOutput.shortListing || "",
        proHorseMatchListing: aiOutput.proHorseMatchListing || "",
        socialCaption: aiOutput.socialCaption || "",
        shortCaptions: aiOutput.shortCaptions || "",
        hashtags: aiOutput.hashtags || "",
        buyerSummary: aiOutput.buyerSummary || "",
        keySellingPoints: aiOutput.keySellingPoints || "",
        reelOverlayText: aiOutput.reelOverlayText || "",
        reelBrief: aiOutput.reelBrief || "",
      });
    }
  }, [aiOutput]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateAi.mutate(
      { id: submissionId, data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAiOutputQueryKey(submissionId) });
          toast({ title: "Changes Saved", description: "AI content has been updated." });
        }
      }
    );
  };

  const handleCopy = (field: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  if (isLoadingSub || isLoadingAi) {
    return <AdminLayout><div className="space-y-4"><Skeleton className="h-10 w-1/4"/><Skeleton className="h-[600px] w-full"/></div></AdminLayout>;
  }

  const fields = [
    { id: "masterListing", label: "Master Listing", height: "min-h-[300px]" },
    { id: "shortListing", label: "Short Listing", height: "min-h-[150px]" },
    { id: "proHorseMatchListing", label: "ProHorseMatch Listing", height: "min-h-[150px]" },
    { id: "socialCaption", label: "Social Caption (Main)", height: "min-h-[200px]" },
    { id: "shortCaptions", label: "Short Caption Variations (3 alternates)", height: "min-h-[180px]" },
    { id: "hashtags", label: "Hashtags", height: "min-h-[80px]" },
    { id: "buyerSummary", label: "Buyer Suitability Summary", height: "min-h-[150px]" },
    { id: "keySellingPoints", label: "Key Selling Points", height: "min-h-[150px]" },
    { id: "reelOverlayText", label: "Reel Overlay Text", height: "min-h-[100px]" },
    { id: "reelBrief", label: "Reel Brief", height: "min-h-[150px]" },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/admin/submissions/${submissionId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">AI Content Editor</h1>
          <p className="text-muted-foreground">{sub?.horseName} • Review and refine generated content</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={updateAi.isPending} className="bg-primary hover:bg-primary/90">
            <Save className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 max-w-4xl pb-20">
        {!aiOutput?.id && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-6">
              <p className="text-amber-800">AI content has not been generated for this submission yet. Go back to the detail page and click "Generate AI Content".</p>
            </CardContent>
          </Card>
        )}

        {aiOutput?.id && fields.map((field) => (
          <Card key={field.id} className="shadow-sm">
            <CardHeader className="bg-muted/30 border-b py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{field.label}</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleCopy(field.id, formData[field.id])}
                className="h-8"
              >
                {copiedField === field.id ? (
                  <><CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> Copied</>
                ) : (
                  <><Copy className="h-4 w-4 mr-2" /> Copy</>
                )}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Textarea 
                value={formData[field.id]} 
                onChange={(e) => handleChange(field.id, e.target.value)}
                className={`w-full border-0 focus-visible:ring-0 rounded-none p-4 ${field.height} resize-y text-base`}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
