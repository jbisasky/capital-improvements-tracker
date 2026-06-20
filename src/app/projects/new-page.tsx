import { type ReactElement, useState, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Upload, Sparkles } from "lucide-react";
import { useStorage } from "@/services/storage-context";
import { ProjectForm, type ProjectFormData } from "@/app/projects/project-form";
import { type Project, type ExtractionResult } from "@/domain/schemas";
import { useRoutePrefix } from "@/hooks/use-route-prefix";
import {
  trackProjectCreated,
  trackAIExtractionStarted,
  trackAIExtractionAccepted,
} from "@/services/analytics";
import { hasGeminiKey } from "@/services/gemini-key";
import { extractFromDocument } from "@/services/gemini";
import { ExtractionReview } from "@/app/projects/extraction-review";
import { AttachmentSection } from "@/app/projects/attachment-section";
import { type ProjectFormData as FormData } from "@/app/projects/project-form-types";
import {
  ACCEPTED_ATTACHMENT_ACCEPT,
  dedupeAttachmentFiles,
  validateAttachmentFile,
} from "@/domain/attachment-validation";

function formToProject(data: ProjectFormData, projectId: string): Project {
  const now = new Date().toISOString();
  return {
    id: projectId,
    title: data.title,
    completionDate: data.completionDate,
    totalCost: parseFloat(data.totalCost) || 0,
    taxTreatment: data.taxTreatment,
    costBasisAdjustment: parseFloat(data.costBasisAdjustment) || 0,
    deductibleAmount: parseFloat(data.deductibleAmount) || 0,
    irsJustification: data.irsJustification,
    confidence: 1,
    attachments: [],
    createdAt: now,
    updatedAt: now,
    ...(data.category ? { category: data.category } : {}),
    ...(data.vendorName ? { vendorName: data.vendorName } : {}),
    ...(data.vendorTin ? { vendorTin: data.vendorTin } : {}),
    ...(data.paymentMethod ? { paymentMethod: data.paymentMethod } : {}),
    ...(data.datePaymentMade ? { datePaymentMade: data.datePaymentMade } : {}),
    ...(data.permitNumber ? { permitNumber: data.permitNumber } : {}),
    ...(data.usefulLifeYears ? { usefulLifeYears: parseFloat(data.usefulLifeYears) } : {}),
    ...(data.depreciationStartDate ? { depreciationStartDate: data.depreciationStartDate } : {}),
    ...(data.energyCreditType ? { energyCreditType: data.energyCreditType } : {}),
    ...(data.safeHarborElection ? { safeHarborElection: true } : {}),
    ...(data.sqftAffected ? { sqftAffected: parseFloat(data.sqftAffected) } : {}),
    ...(data.notes ? { notes: data.notes } : {}),
  };
}

function extractionToFormData(extraction: ExtractionResult): FormData {
  return {
    title: extraction.title,
    completionDate: extraction.completionDate ?? "",
    totalCost: extraction.totalCost != null ? String(extraction.totalCost) : "",
    taxTreatment: extraction.suggestedTreatment,
    costBasisAdjustment: extraction.costBasisAdjustment != null ? String(extraction.costBasisAdjustment) : "",
    deductibleAmount: extraction.deductibleAmount != null ? String(extraction.deductibleAmount) : "",
    irsJustification: extraction.irsJustification,
    category: extraction.category ?? "",
    vendorName: extraction.vendor ?? "",
    vendorTin: "",
    paymentMethod: extraction.paymentMethod ?? "",
    datePaymentMade: "",
    permitNumber: extraction.permitNumber ?? "",
    usefulLifeYears: "",
    depreciationStartDate: "",
    energyCreditType: "",
    safeHarborElection: false,
    sqftAffected: "",
    notes: "",
  };
}

type PageStep = "upload" | "extracting" | "review" | "form";

export function ProjectNewPage(): ReactElement {
  const navigate = useNavigate();
  const prefix = useRoutePrefix();
  const { addProjectWithAttachments } = useStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<PageStep>("upload");
  const [projectId] = useState(() => crypto.randomUUID());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState<FormData | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const keyConfigured = hasGeminiKey();

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file == null) return;

    const validation = validateAttachmentFile(file, 0);
    if (!validation.ok) {
      setExtractionError(validation.error.message);
      return;
    }

    setSelectedFile(file);
    setExtractionError(null);
  }

  function handleExtract(): void {
    if (selectedFile == null) return;
    setStep("extracting");
    setExtractionError(null);
    trackAIExtractionStarted();

    void extractFromDocument(selectedFile).then((result) => {
      if (result.ok) {
        setExtractionResult(result.value.result);
        setStep("review");
      } else {
        setExtractionError(result.error.message);
        setStep("upload");
      }
    });
  }

  function handleAcceptExtraction(edited: ExtractionResult): void {
    const confidence = edited.confidence < 0.6 ? "low" : edited.confidence < 0.8 ? "medium" : "high";
    trackAIExtractionAccepted(confidence);
    setPrefilled(extractionToFormData(edited));
    setStep("form");
  }

  function handleDiscardExtraction(): void {
    setExtractionResult(null);
    setStep("upload");
  }

  function handleSkipToManual(): void {
    setPrefilled(null);
    setStep("form");
  }

  function handleSubmit(data: ProjectFormData): void {
    const project = formToProject(data, projectId);
    const files = dedupeAttachmentFiles([
      ...(selectedFile != null ? [selectedFile] : []),
      ...pendingFiles,
    ]);

    setSaving(true);
    setSaveError(null);

    void addProjectWithAttachments(project, files).then((result) => {
      setSaving(false);
      if (result.ok) {
        trackProjectCreated(project.taxTreatment);
        void navigate(`${prefix}/projects/${project.id}`);
      } else {
        setSaveError(result.error.message);
      }
    });
  }

  // Review step
  if (step === "review" && extractionResult != null) {
    return (
      <div className="space-y-6">
        <Link to={`${prefix}/projects`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="size-4" /> Back to projects
        </Link>
        <ExtractionReview
          extraction={extractionResult}
          filename={selectedFile?.name ?? "document"}
          onAccept={handleAcceptExtraction}
          onDiscard={handleDiscardExtraction}
        />
      </div>
    );
  }

  // Form step (after extraction or manual)
  if (step === "form") {
    return (
      <div className="space-y-6">
        <Link to={`${prefix}/projects`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="size-4" /> Back to projects
        </Link>
        <h1 className="text-2xl font-semibold">Add New Project</h1>
        {prefilled != null && (
          <p className="text-sm text-muted-foreground">
            Fields below were pre-filled from AI extraction. Review and adjust as needed.
          </p>
        )}

        <AttachmentSection
          projectId={projectId}
          attachments={[]}
          mode="pending"
          pendingFiles={pendingFiles}
          onPendingFilesChange={setPendingFiles}
          includedPendingFile={selectedFile}
          onIncludedPendingFileRemove={() => { setSelectedFile(null); }}
        />

        {saveError != null && (
          <p className="text-sm text-red-600">{saveError}</p>
        )}

        <ProjectForm
          {...(prefilled != null ? { initial: prefilled } : {})}
          onSubmit={handleSubmit}
          submitLabel={saving ? "Creating…" : "Create Project"}
        />
      </div>
    );
  }

  // Upload / extracting step
  return (
    <div className="space-y-6">
      <Link to={`${prefix}/projects`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to projects
      </Link>
      <h1 className="text-2xl font-semibold">Add New Project</h1>

      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-medium">Attachments</h3>
        <p className="text-sm text-muted-foreground">
          Upload a receipt or invoice to extract details with AI. The file will be saved as a
          project attachment when you create the project.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => { fileInputRef.current?.click(); }}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            <Upload className="size-4" />
            Upload file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_ATTACHMENT_ACCEPT}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {selectedFile != null && (
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
            <span className="font-medium">{selectedFile.name}</span>
            <span className="text-muted-foreground">
              ({String(Math.round(selectedFile.size / 1024))} KB)
            </span>
          </div>
        )}

        {extractionError != null && (
          <p className="text-sm text-red-600">{extractionError}</p>
        )}

        {selectedFile != null && keyConfigured && (
          <button
            type="button"
            onClick={handleExtract}
            disabled={step === "extracting"}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            <Sparkles className="size-4" />
            {step === "extracting" ? "Extracting…" : "Extract details with AI"}
          </button>
        )}

        {selectedFile != null && !keyConfigured && (
          <p className="text-sm text-yellow-600">
            Add your Gemini API key in{" "}
            <Link to={`${prefix}/settings`} className="underline">Settings</Link>{" "}
            to enable AI extraction.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSkipToManual}
        className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
      >
        Enter details manually
      </button>
    </div>
  );
}
