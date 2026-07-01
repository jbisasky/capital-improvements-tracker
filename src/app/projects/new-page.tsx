import { type ReactElement, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
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
import { extractProjectFromDocuments } from "@/services/gemini-extraction-batch";
import { ExtractionReview } from "@/app/projects/extraction-review";
import { type ProjectFormData as FormData } from "@/app/projects/project-form-types";
import { NewProjectAttachments } from "@/app/projects/new-project-attachments";
import { dedupeAttachmentFiles } from "@/domain/attachment-validation";

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
    ...(data.receiptDetailLevel ? { receiptDetailLevel: data.receiptDetailLevel } : {}),
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
    receiptDetailLevel: extraction.receiptDetailLevel,
  };
}

function buildSourceLabel(files: File[]): string {
  if (files.length === 1) return files[0]?.name ?? "upload";
  return `${String(files.length)} files (AI synthesized)`;
}

type PageStep = "upload" | "extracting" | "review" | "form";

export function ProjectNewPage(): ReactElement {
  const navigate = useNavigate();
  const prefix = useRoutePrefix();
  const { addProjectWithAttachments } = useStorage();

  const [step, setStep] = useState<PageStep>("upload");
  const [projectId] = useState(() => crypto.randomUUID());
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [reviewExtraction, setReviewExtraction] = useState<ExtractionResult | null>(null);
  const [reviewSourceLabel, setReviewSourceLabel] = useState("");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState<FormData | null>(null);
  const [saving, setSaving] = useState(false);

  const keyConfigured = hasGeminiKey();

  function handleExtract(): void {
    if (pendingFiles.length === 0) return;

    setReviewExtraction(null);
    setReviewSourceLabel("");
    setAttachmentError(null);
    setStep("extracting");
    trackAIExtractionStarted();

    void extractProjectFromDocuments(pendingFiles).then((result) => {
      if (!result.ok) {
        setAttachmentError(result.error.message);
        setStep("upload");
        return;
      }

      setReviewExtraction(result.value.result);
      setReviewSourceLabel(buildSourceLabel(pendingFiles));
      setStep("review");
    });
  }

  function handleAcceptExtraction(edited: ExtractionResult): void {
    const confidence = edited.confidence < 0.6 ? "low" : edited.confidence < 0.8 ? "medium" : "high";
    trackAIExtractionAccepted(confidence);

    setPrefilled(extractionToFormData(edited));
    setReviewExtraction(null);
    setReviewSourceLabel("");
    setStep("form");
  }

  function handleDiscardExtraction(): void {
    setReviewExtraction(null);
    setReviewSourceLabel("");
    setStep("upload");
  }

  function handleSkipToManual(): void {
    setPrefilled(null);
    setReviewExtraction(null);
    setReviewSourceLabel("");
    setStep("form");
  }

  function handleSubmit(data: ProjectFormData): void {
    const project = formToProject(data, projectId);
    const files = dedupeAttachmentFiles(pendingFiles);

    setSaving(true);
    setSubmitError(null);
    void addProjectWithAttachments(project, files).then((result) => {
      setSaving(false);
      if (result.ok) {
        trackProjectCreated(project.taxTreatment);
        void navigate(`${prefix}/projects/${project.id}`);
      } else {
        setSubmitError(result.error.message);
      }
    });
  }

  if (step === "review" && reviewExtraction != null) {
    return (
      <div className="space-y-6">
        <Link to={`${prefix}/projects`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="size-4" /> Back to projects
        </Link>
        <ExtractionReview
          extraction={reviewExtraction}
          sourceLabel={reviewSourceLabel}
          onAccept={handleAcceptExtraction}
          onDiscard={handleDiscardExtraction}
        />
      </div>
    );
  }

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
        <NewProjectAttachments
          files={pendingFiles}
          onFilesChange={setPendingFiles}
          onValidationError={(message) => {
            setAttachmentError(message.length > 0 ? message : null);
          }}
        />
        {attachmentError != null && (
          <p className="text-sm text-red-600">{attachmentError}</p>
        )}
        <ProjectForm
          {...(prefilled != null ? { initial: prefilled } : {})}
          onSubmit={handleSubmit}
          submitLabel={saving ? "Creating…" : "Create Project"}
        />
        {submitError != null && (
          <p className="text-sm text-red-600">{submitError}</p>
        )}
      </div>
    );
  }

  const extractingLabel =
    step === "extracting" && pendingFiles.length > 1
      ? `Analyzing ${String(pendingFiles.length)} files…`
      : step === "extracting"
        ? "Extracting…"
        : pendingFiles.length > 1
          ? `Extract details with AI (${String(pendingFiles.length)} files)`
          : "Extract details with AI";

  return (
    <div className="space-y-6">
      <Link to={`${prefix}/projects`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to projects
      </Link>
      <h1 className="text-2xl font-semibold">Add New Project</h1>

      <NewProjectAttachments
        files={pendingFiles}
        onFilesChange={setPendingFiles}
        onValidationError={(message) => {
          setAttachmentError(message.length > 0 ? message : null);
        }}
        showExtract
        extracting={step === "extracting"}
        extractLabel={extractingLabel}
        keyConfigured={keyConfigured}
        settingsHref={`${prefix}/settings`}
        onExtract={handleExtract}
      />

      {attachmentError != null && (
        <p className="text-sm text-red-600">{attachmentError}</p>
      )}

      <button
        type="button"
        onClick={handleSkipToManual}
        className="cursor-pointer rounded-md border px-4 py-2 text-sm hover:bg-accent"
      >
        Enter details manually
      </button>
    </div>
  );
}
