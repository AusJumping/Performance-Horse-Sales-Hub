import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { useCreateSubmission, useGetMediaUploadUrl } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, UploadCloud } from "lucide-react";

// Massive schema to capture all fields
const formSchema = z.object({
  sellerFullName: z.string().min(1, "Required"),
  phoneNumber: z.string().min(1, "Required"),
  emailAddress: z.string().email("Invalid email").min(1, "Required"),
  preferredContactMethod: z.string().min(1, "Required"),
  stateTerritory: z.string().min(1, "Required"),
  suburbTown: z.string().min(1, "Required"),

  horseName: z.string().min(1, "Required"),
  breed: z.string().min(1, "Required"),
  age: z.string().min(1, "Required"),
  colourMarkings: z.string().min(1, "Required"),
  height: z.string().min(1, "Required"),
  sex: z.string().min(1, "Required"),
  microchipNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  registeredName: z.string().optional(),
  studbookRegistry: z.string().optional(),

  askingPrice: z.string().min(1, "Required"),
  saleType: z.string().min(1, "Required"),
  priceNegotiable: z.string().min(1, "Required"),
  gstIncluded: z.string().min(1, "Required"),

  primaryDiscipline: z.string().min(1, "Required"),
  competitionLevel: z.string().min(1, "Required"),
  currentLevelOfWork: z.string().min(1, "Required"),

  hasCompeted: z.string().min(1, "Required"),
  competitionResults: z.string().optional(),
  showEventRecord: z.string().optional(),

  trainingLevel: z.string().min(1, "Required"),
  whoTrained: z.string().min(1, "Required"),
  suitableBeginner: z.string().min(1, "Required"),
  suitableJunior: z.string().min(1, "Required"),

  generalTemperament: z.string().min(1, "Required"),
  onTheGround: z.string().min(1, "Required"),
  underSaddle: z.string().min(1, "Required"),
  vicesOrBadHabits: z.string().min(1, "Required"),
  vicesDescription: z.string().optional(),
  floatLoading: z.string().min(1, "Required"),
  farrier: z.string().min(1, "Required"),
  veterinaryNeedles: z.string().min(1, "Required"),

  currentHealthStatus: z.string().min(1, "Required"),
  onMedication: z.string().min(1, "Required"),
  medicationDescription: z.string().optional(),
  significantInjuries: z.string().min(1, "Required"),
  injuriesDescription: z.string().optional(),
  prePurchaseExam: z.string().min(1, "Required"),
  dentalHistory: z.string().optional(),
  farrierSchedule: z.string().optional(),
  vaccinationHistory: z.string().min(1, "Required"),
  wormingHistory: z.string().min(1, "Required"),

  idealRiderExperience: z.string().min(1, "Required"),
  idealRiderAge: z.string().min(1, "Required"),
  weightLimit: z.string().optional(),
  bestSuitedFor: z.string().min(1, "Required"),

  videoLinks: z.string().optional(),

  additionalInfo: z.string().optional(),
  whySelling: z.string().optional(),
  trialPeriod: z.string().min(1, "Required"),
  locationForViewing: z.string().min(1, "Required"),

  agreeToDeclaration: z.boolean().refine(val => val === true, "You must agree to the declaration")
});

const SECTIONS = [
  "Contact Information",
  "Horse Details",
  "Price & Sale Type",
  "Discipline & Level",
  "History & Education",
  "Temperament",
  "Health",
  "Suitability & Media",
  "Additional & Declaration"
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createSubmission = useCreateSubmission();
  const getUploadUrl = useGetMediaUploadUrl();
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sellerFullName: "",
      phoneNumber: "",
      emailAddress: "",
      preferredContactMethod: "",
      stateTerritory: "",
      suburbTown: "",
      horseName: "",
      breed: "",
      age: "",
      colourMarkings: "",
      height: "",
      sex: "",
      microchipNumber: "",
      registrationNumber: "",
      registeredName: "",
      studbookRegistry: "",
      askingPrice: "",
      saleType: "",
      priceNegotiable: "",
      gstIncluded: "",
      primaryDiscipline: "",
      competitionLevel: "",
      currentLevelOfWork: "",
      hasCompeted: "",
      competitionResults: "",
      showEventRecord: "",
      trainingLevel: "",
      whoTrained: "",
      suitableBeginner: "",
      suitableJunior: "",
      generalTemperament: "",
      onTheGround: "",
      underSaddle: "",
      vicesOrBadHabits: "",
      vicesDescription: "",
      floatLoading: "",
      farrier: "",
      veterinaryNeedles: "",
      currentHealthStatus: "",
      onMedication: "",
      medicationDescription: "",
      significantInjuries: "",
      injuriesDescription: "",
      prePurchaseExam: "",
      dentalHistory: "",
      farrierSchedule: "",
      vaccinationHistory: "",
      wormingHistory: "",
      idealRiderExperience: "",
      idealRiderAge: "",
      weightLimit: "",
      bestSuitedFor: "",
      videoLinks: "",
      additionalInfo: "",
      whySelling: "",
      trialPeriod: "",
      locationForViewing: "",
      agreeToDeclaration: false,
    },
  });

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 0) fieldsToValidate = ["sellerFullName", "phoneNumber", "emailAddress", "preferredContactMethod", "stateTerritory", "suburbTown"];
    else if (step === 1) fieldsToValidate = ["horseName", "breed", "age", "colourMarkings", "height", "sex"];
    else if (step === 2) fieldsToValidate = ["askingPrice", "saleType", "priceNegotiable", "gstIncluded"];
    else if (step === 3) fieldsToValidate = ["primaryDiscipline", "competitionLevel", "currentLevelOfWork"];
    else if (step === 4) fieldsToValidate = ["hasCompeted", "trainingLevel", "whoTrained", "suitableBeginner", "suitableJunior"];
    else if (step === 5) fieldsToValidate = ["generalTemperament", "onTheGround", "underSaddle", "vicesOrBadHabits", "floatLoading", "farrier", "veterinaryNeedles"];
    else if (step === 6) fieldsToValidate = ["currentHealthStatus", "onMedication", "significantInjuries", "prePurchaseExam", "vaccinationHistory", "wormingHistory"];
    else if (step === 7) fieldsToValidate = ["idealRiderExperience", "idealRiderAge", "bestSuitedFor"];
    else if (step === 8) fieldsToValidate = ["trialPeriod", "locationForViewing", "agreeToDeclaration"];

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(s => Math.min(s + 1, SECTIONS.length - 1));
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 0));
    window.scrollTo(0, 0);
  };

  const uploadFile = async (file: File, submissionId: number, type: "photo" | "document") => {
    const { uploadUrl } = await getUploadUrl.mutateAsync({
      data: {
        submissionId,
        filename: file.name,
        mimeType: file.type,
        mediaType: type
      }
    });

    await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type }
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const submission = await createSubmission.mutateAsync({
        data: {
          formData: values,
          sellerName: values.sellerFullName,
          sellerEmail: values.emailAddress,
          sellerPhone: values.phoneNumber,
          horseName: values.horseName,
          breed: values.breed,
          age: values.age,
          colour: values.colourMarkings,
          height: values.height,
          sex: values.sex,
          askingPrice: values.askingPrice,
          location: `${values.suburbTown}, ${values.stateTerritory}`,
          discipline: values.primaryDiscipline
        }
      });

      const totalFiles = photos.length + documents.length;
      
      if (totalFiles > 0) {
        setIsUploading(true);
        let completed = 0;

        for (const file of photos) {
          setUploadStatus(`Uploading photo: ${file.name}`);
          await uploadFile(file, submission.id, "photo");
          completed++;
          setUploadProgress((completed / totalFiles) * 100);
        }

        for (const file of documents) {
          setUploadStatus(`Uploading document: ${file.name}`);
          await uploadFile(file, submission.id, "document");
          completed++;
          setUploadProgress((completed / totalFiles) * 100);
        }
      }

      setLocation("/thank-you");
    } catch (err) {
      toast({
        title: "Error submitting",
        description: "Please check the form and try again.",
        variant: "destructive"
      });
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">Performance Horse Sales</h1>
          <p className="text-lg text-muted-foreground">Official Seller Submission Form</p>
        </div>

        {isUploading ? (
          <Card className="border-t-4 border-t-accent shadow-lg text-center p-10">
            <CardHeader>
              <UploadCloud className="w-12 h-12 mx-auto text-primary mb-4 animate-pulse" />
              <h2 className="text-2xl font-serif text-primary">Uploading Media...</h2>
              <p className="text-muted-foreground">{uploadStatus}</p>
            </CardHeader>
            <CardContent>
              <Progress value={uploadProgress} className="h-4 w-full max-w-md mx-auto" />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-t-4 border-t-accent shadow-lg">
            <CardHeader className="bg-muted/30 border-b pb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">Step {step + 1} of {SECTIONS.length}</span>
                <span className="text-sm font-medium text-primary">{SECTIONS[step]}</span>
              </div>
              <Progress value={((step + 1) / SECTIONS.length) * 100} className="h-2" />
            </CardHeader>
            
            <CardContent className="p-6 sm:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  
                  {step === 0 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-2xl font-serif text-primary border-b pb-2">CONTACT INFORMATION</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="sellerFullName" render={({ field }) => (
                          <FormItem><FormLabel>Seller's Full Name *</FormLabel><FormControl><Input {...field} data-testid="input-sellerFullName" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                          <FormItem><FormLabel>Phone Number *</FormLabel><FormControl><Input {...field} data-testid="input-phoneNumber" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="emailAddress" render={({ field }) => (
                          <FormItem><FormLabel>Email Address *</FormLabel><FormControl><Input type="email" {...field} data-testid="input-emailAddress" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="preferredContactMethod" render={({ field }) => (
                          <FormItem><FormLabel>Preferred Contact Method *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-preferredContactMethod"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Phone">Phone</SelectItem><SelectItem value="Email">Email</SelectItem><SelectItem value="Text/SMS">Text/SMS</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="stateTerritory" render={({ field }) => (
                          <FormItem><FormLabel>State/Territory *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-stateTerritory"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="NSW">NSW</SelectItem><SelectItem value="VIC">VIC</SelectItem><SelectItem value="QLD">QLD</SelectItem><SelectItem value="SA">SA</SelectItem><SelectItem value="WA">WA</SelectItem><SelectItem value="TAS">TAS</SelectItem><SelectItem value="NT">NT</SelectItem><SelectItem value="ACT">ACT</SelectItem><SelectItem value="New Zealand">New Zealand</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="suburbTown" render={({ field }) => (
                          <FormItem><FormLabel>Suburb/Town *</FormLabel><FormControl><Input {...field} data-testid="input-suburbTown" /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-2xl font-serif text-primary border-b pb-2">HORSE DETAILS</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="horseName" render={({ field }) => (
                          <FormItem><FormLabel>Horse's Name *</FormLabel><FormControl><Input {...field} data-testid="input-horseName" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="breed" render={({ field }) => (
                          <FormItem><FormLabel>Breed *</FormLabel><FormControl><Input {...field} data-testid="input-breed" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="age" render={({ field }) => (
                          <FormItem><FormLabel>Age *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-age"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20+"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="colourMarkings" render={({ field }) => (
                          <FormItem><FormLabel>Colour/Markings *</FormLabel><FormControl><Input {...field} data-testid="input-colourMarkings" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="height" render={({ field }) => (
                          <FormItem><FormLabel>Height *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-height"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["14hh", "14.1hh", "14.2hh", "14.3hh", "15hh", "15.1hh", "15.2hh", "15.3hh", "16hh", "16.1hh", "16.2hh", "16.3hh", "17hh", "17.1hh", "17.2hh", "17.3hh", "18hh+"].map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="sex" render={({ field }) => (
                          <FormItem><FormLabel>Sex *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-sex"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Mare">Mare</SelectItem><SelectItem value="Gelding">Gelding</SelectItem><SelectItem value="Stallion">Stallion</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="microchipNumber" render={({ field }) => (
                          <FormItem><FormLabel>Microchip Number</FormLabel><FormControl><Input {...field} data-testid="input-microchipNumber" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="registrationNumber" render={({ field }) => (
                          <FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input {...field} data-testid="input-registrationNumber" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="registeredName" render={({ field }) => (
                          <FormItem><FormLabel>Registered Name</FormLabel><FormControl><Input {...field} data-testid="input-registeredName" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="studbookRegistry" render={({ field }) => (
                          <FormItem><FormLabel>Studbook/Registry</FormLabel><FormControl><Input {...field} data-testid="input-studbookRegistry" /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-2xl font-serif text-primary border-b pb-2">ASKING PRICE AND SALE TYPE</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="askingPrice" render={({ field }) => (
                          <FormItem><FormLabel>Asking Price (AUD) *</FormLabel><FormDescription>Please enter the full price. We do not accept 'POA' listings.</FormDescription><FormControl><Input {...field} placeholder="$" data-testid="input-askingPrice" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="saleType" render={({ field }) => (
                          <FormItem><FormLabel>Sale Type *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-saleType"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="For Sale">For Sale</SelectItem><SelectItem value="For Lease">For Lease</SelectItem><SelectItem value="For Sale or Lease">For Sale or Lease</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="priceNegotiable" render={({ field }) => (
                          <FormItem><FormLabel>Price Negotiable? *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-priceNegotiable"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="gstIncluded" render={({ field }) => (
                          <FormItem><FormLabel>GST Included in Price? *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-gstIncluded"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes — GST is included">Yes — GST is included</SelectItem><SelectItem value="No — GST is not applicable">No — GST is not applicable</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-2xl font-serif text-primary border-b pb-2">DISCIPLINE AND LEVEL</h2>
                      <div className="grid grid-cols-1 gap-6">
                        <FormField control={form.control} name="primaryDiscipline" render={({ field }) => (
                          <FormItem><FormLabel>Primary Discipline *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-primaryDiscipline"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["Showjumping", "Eventing", "Dressage", "Showing", "Pony Club", "Campdraft", "Rodeo", "Trail Riding", "Hack", "Endurance", "Racing", "Western", "Multiple Disciplines", "Other"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="competitionLevel" render={({ field }) => (
                          <FormItem><FormLabel>Competition Level *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-competitionLevel"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["Unregistered/Unaffiliated", "Local/Interschool", "State Level", "National Level", "International Level"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="currentLevelOfWork" render={({ field }) => (
                          <FormItem><FormLabel>Current Level of Work *</FormLabel><FormDescription>Describe the horse's current training level and what they are doing regularly</FormDescription><FormControl><Textarea className="min-h-[100px]" {...field} data-testid="textarea-currentLevelOfWork" /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-2xl font-serif text-primary border-b pb-2">HISTORY & EDUCATION</h2>
                      <div className="grid grid-cols-1 gap-6">
                        <FormField control={form.control} name="hasCompeted" render={({ field }) => (
                          <FormItem><FormLabel>Has this horse competed? *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-hasCompeted"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="competitionResults" render={({ field }) => (
                          <FormItem><FormLabel>Competition Results</FormLabel><FormDescription>List any notable results, championships, or performances. Leave blank if none.</FormDescription><FormControl><Textarea {...field} data-testid="textarea-competitionResults" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="showEventRecord" render={({ field }) => (
                          <FormItem><FormLabel>Show/Event Record</FormLabel><FormDescription>List shows, events, or competitions attended</FormDescription><FormControl><Textarea {...field} data-testid="textarea-showEventRecord" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="trainingLevel" render={({ field }) => (
                          <FormItem><FormLabel>Training Level *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-trainingLevel"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Just Started/Green">Just Started/Green</SelectItem><SelectItem value="Educated">Educated</SelectItem><SelectItem value="Well Educated">Well Educated</SelectItem><SelectItem value="Highly Educated">Highly Educated</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="whoTrained" render={({ field }) => (
                          <FormItem><FormLabel>Who has trained this horse? *</FormLabel><FormDescription>Describe who has trained this horse and any professional training history</FormDescription><FormControl><Textarea {...field} data-testid="textarea-whoTrained" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="suitableBeginner" render={({ field }) => (
                            <FormItem><FormLabel>Is this horse suitable for a beginner? *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-suitableBeginner"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem><SelectItem value="With Guidance">With Guidance</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="suitableJunior" render={({ field }) => (
                            <FormItem><FormLabel>Is this horse suitable for a junior rider? *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-suitableJunior"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem><SelectItem value="With Guidance">With Guidance</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-2xl font-serif text-primary border-b pb-2">TEMPERAMENT AND BEHAVIOUR</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="generalTemperament" render={({ field }) => (
                          <FormItem><FormLabel>General Temperament *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-generalTemperament"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["Quiet/Bombproof", "Sensible", "Average", "Hot/Sharp", "Very Sensitive"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="onTheGround" render={({ field }) => (
                          <FormItem><FormLabel>On the Ground *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-onTheGround"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["Excellent", "Good", "Average", "Needs Work"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="underSaddle" render={({ field }) => (
                          <FormItem><FormLabel>Under Saddle *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-underSaddle"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["Excellent", "Good", "Average", "Needs Work"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="floatLoading" render={({ field }) => (
                          <FormItem><FormLabel>Float/Horse Float Loading *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-floatLoading"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["Excellent", "Good", "Average", "Needs Work"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="farrier" render={({ field }) => (
                          <FormItem><FormLabel>Farrier *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-farrier"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["Excellent", "Good", "Average", "Needs Work"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="veterinaryNeedles" render={({ field }) => (
                          <FormItem><FormLabel>Veterinary/Needles *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-veterinaryNeedles"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["Excellent", "Good", "Average", "Needs Work"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="vicesOrBadHabits" render={({ field }) => (
                          <FormItem><FormLabel>Any Vices or Bad Habits? *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-vicesOrBadHabits"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="vicesDescription" render={({ field }) => (
                          <FormItem><FormLabel>If yes, please describe</FormLabel><FormControl><Input {...field} data-testid="input-vicesDescription" /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>
                  )}

                  {step === 6 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-2xl font-serif text-primary border-b pb-2">HEALTH AND SOUNDNESS</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="currentHealthStatus" render={({ field }) => (
                          <FormItem><FormLabel>Current Health Status *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-currentHealthStatus"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["Excellent", "Good", "Sound With Management", "Has Known Issues"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="prePurchaseExam" render={({ field }) => (
                          <FormItem><FormLabel>Has a Pre-Purchase Examination been done? *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-prePurchaseExam"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["Yes — Passed", "Yes — With Findings", "No"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="onMedication" render={({ field }) => (
                          <FormItem><FormLabel>Is this horse on any medication? *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-onMedication"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="medicationDescription" render={({ field }) => (
                          <FormItem><FormLabel>If yes, please describe</FormLabel><FormControl><Input {...field} data-testid="input-medicationDescription" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="significantInjuries" render={({ field }) => (
                          <FormItem><FormLabel>Has this horse had any significant injuries or illnesses? *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-significantInjuries"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="injuriesDescription" render={({ field }) => (
                          <FormItem><FormLabel>If yes, please describe</FormLabel><FormControl><Input {...field} data-testid="input-injuriesDescription" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="vaccinationHistory" render={({ field }) => (
                          <FormItem><FormLabel>Vaccination History *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-vaccinationHistory"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Up to Date">Up to Date</SelectItem><SelectItem value="Not Up to Date">Not Up to Date</SelectItem><SelectItem value="Unknown">Unknown</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="wormingHistory" render={({ field }) => (
                          <FormItem><FormLabel>Worming History *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-wormingHistory"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Up to Date">Up to Date</SelectItem><SelectItem value="Not Up to Date">Not Up to Date</SelectItem><SelectItem value="Unknown">Unknown</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <div className="col-span-1 md:col-span-2 grid gap-6 md:grid-cols-2">
                          <FormField control={form.control} name="dentalHistory" render={({ field }) => (
                            <FormItem><FormLabel>Dental History</FormLabel><FormDescription>Describe recent dental care</FormDescription><FormControl><Textarea {...field} data-testid="textarea-dentalHistory" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="farrierSchedule" render={({ field }) => (
                            <FormItem><FormLabel>Farrier Schedule</FormLabel><FormDescription>Describe current farrier schedule</FormDescription><FormControl><Textarea {...field} data-testid="textarea-farrierSchedule" /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 7 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-2xl font-serif text-primary border-b pb-2">SUITABILITY & MEDIA</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="idealRiderExperience" render={({ field }) => (
                          <FormItem><FormLabel>Ideal Rider Experience Level *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-idealRiderExperience"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["Beginner", "Novice", "Intermediate", "Advanced", "Professional", "Any Level"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="idealRiderAge" render={({ field }) => (
                          <FormItem><FormLabel>Ideal Rider Age Group *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-idealRiderAge"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{["Child (under 12)", "Junior (12–17)", "Adult Amateur", "Adult Professional", "All Ages"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="weightLimit" render={({ field }) => (
                          <FormItem><FormLabel>Weight Limit</FormLabel><FormDescription>Is there a weight limit for this horse? If yes, please specify.</FormDescription><FormControl><Input {...field} data-testid="input-weightLimit" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="col-span-1 md:col-span-2">
                          <FormField control={form.control} name="bestSuitedFor" render={({ field }) => (
                            <FormItem><FormLabel>This horse is best suited for *</FormLabel><FormDescription>Describe the ideal home, rider, and purpose for this horse</FormDescription><FormControl><Textarea {...field} data-testid="textarea-bestSuitedFor" /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        
                        <div className="col-span-1 md:col-span-2 pt-4 border-t">
                          <h3 className="text-xl font-serif text-primary mb-4 pb-2">MEDIA UPLOADS</h3>
                          <div className="space-y-6">
                            <FormItem>
                              <FormLabel>Upload Photos</FormLabel>
                              <FormDescription>Please upload a minimum of 6 high-quality photos. Include: conformation shots (both sides, front, behind), photos in action (trot, canter, jumping etc.), any rosettes or ribbons, close-up of the face. Maximum 20 photos. Accepted formats: JPG, PNG, HEIC</FormDescription>
                              <Input 
                                type="file" 
                                multiple 
                                accept="image/jpeg,image/png,image/heic"
                                onChange={(e) => {
                                  if (e.target.files) {
                                    setPhotos(Array.from(e.target.files));
                                  }
                                }}
                                data-testid="input-photos"
                              />
                            </FormItem>

                            <FormItem>
                              <FormLabel>Upload Documents</FormLabel>
                              <FormDescription>Upload any relevant documents: vet certificates, competition records, registration papers, etc. Accepted formats: PDF, DOC, DOCX, JPG, PNG</FormDescription>
                              <Input 
                                type="file" 
                                multiple 
                                accept=".pdf,.doc,.docx,image/jpeg,image/png"
                                onChange={(e) => {
                                  if (e.target.files) {
                                    setDocuments(Array.from(e.target.files));
                                  }
                                }}
                                data-testid="input-documents"
                              />
                            </FormItem>

                            <FormField control={form.control} name="videoLinks" render={({ field }) => (
                              <FormItem><FormLabel>Upload Video Links</FormLabel><FormDescription>Paste any YouTube, Vimeo, or Google Drive video links here (one per line). Videos of the horse in action are strongly encouraged.</FormDescription><FormControl><Textarea className="min-h-[100px]" {...field} data-testid="textarea-videoLinks" /></FormControl><FormMessage /></FormItem>
                            )} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 8 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-2xl font-serif text-primary border-b pb-2">ADDITIONAL & DECLARATION</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="trialPeriod" render={({ field }) => (
                          <FormItem><FormLabel>Trial Period Available? *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger data-testid="select-trialPeriod"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem><SelectItem value="On Application">On Application</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="locationForViewing" render={({ field }) => (
                          <FormItem><FormLabel>Location for Viewing *</FormLabel><FormDescription>Where can potential buyers view this horse? Suburb/Town and State.</FormDescription><FormControl><Input {...field} data-testid="input-locationForViewing" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="col-span-1 md:col-span-2 grid gap-6 md:grid-cols-2">
                          <FormField control={form.control} name="additionalInfo" render={({ field }) => (
                            <FormItem><FormLabel>Any Additional Information</FormLabel><FormDescription>Include anything else that would help a buyer understand this horse. Any quirks, special requirements, what makes this horse special.</FormDescription><FormControl><Textarea {...field} data-testid="textarea-additionalInfo" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="whySelling" render={({ field }) => (
                            <FormItem><FormLabel>Why Are You Selling?</FormLabel><FormDescription>Buyers often appreciate understanding the reason for sale.</FormDescription><FormControl><Textarea {...field} data-testid="textarea-whySelling" /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>

                      <div className="bg-muted/50 p-6 rounded-lg mt-8 border">
                        <h3 className="font-bold mb-4">SELLER DECLARATION</h3>
                        <div className="text-sm space-y-2 mb-6">
                          <p>I declare that:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>All information provided in this form is true and accurate to the best of my knowledge</li>
                            <li>I am the legal owner of this horse, or have authority to sell on the owner's behalf</li>
                            <li>I understand that Performance Horse Sales ANZ will use this information to create a listing</li>
                            <li>I agree to the Terms and Conditions of Performance Horse Sales ANZ</li>
                            <li>I understand that a listing fee may apply</li>
                          </ul>
                        </div>
                        <FormField control={form.control} name="agreeToDeclaration" render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-agreeToDeclaration" />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>I agree to the above declaration</FormLabel>
                            </div>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-6 flex justify-between">
              <Button variant="outline" onClick={prevStep} disabled={step === 0} type="button" data-testid="button-prevStep">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              
              {step < SECTIONS.length - 1 ? (
                <Button onClick={nextStep} type="button" data-testid="button-nextStep">
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={form.handleSubmit(onSubmit)} disabled={createSubmission.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90" size="lg" data-testid="button-submitListing">
                  {createSubmission.isPending ? "Submitting..." : "SUBMIT LISTING"}
                </Button>
              )}
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
