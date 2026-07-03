import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { type Manifest, type Project } from "@/domain/schemas";
import { assessDocumentation, type DocStatus } from "@/domain/doc-completeness";

// --- Helpers ---

export function formatCurrencyPdf(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatTaxTreatment(treatment: string): string {
  switch (treatment) {
    case "capital_improvement":
      return "Capital Improvement";
    case "repair":
      return "Repair / Maintenance";
    case "deductible":
      return "Deductible Expense";
    case "credit":
      return "Tax Credit";
    case "unknown":
      return "Unclassified";
    default:
      return treatment;
  }
}

export function formatCategory(category: string | undefined): string {
  if (!category) return "—";
  return category
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatDocStatus(status: DocStatus): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "partial":
      return "Partial";
    case "incomplete":
      return "Incomplete";
  }
}

export function getProjectYear(project: Project): string {
  return project.completionDate.slice(0, 4);
}

export function filterProjectsByScope(
  projects: Project[],
  scope: ExportScope,
  year?: string,
): Project[] {
  switch (scope) {
    case "all":
      return projects;
    case "year":
      return projects.filter((p) => getProjectYear(p) === year);
    default:
      return projects;
  }
}

export function getAvailableYears(projects: Project[]): string[] {
  const years = new Set(projects.map(getProjectYear));
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

export type ExportScope = "all" | "year";

// --- Styles ---

Font.registerHyphenationCallback((word) => [word]);

const SLATE_TEAL = "#11262c";
const ZINC_100 = "#f4f4f5";
const ZINC_300 = "#d4d4d8";
const ZINC_500 = "#71717a";
const ZINC_700 = "#3f3f46";
const ZINC_900 = "#18181b";
const GREEN = "#15803d";
const AMBER = "#b45309";
const RED = "#b91c1c";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: ZINC_900,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },

  // Header / cover
  coverHeader: {
    marginBottom: 32,
    borderBottomWidth: 2,
    borderBottomColor: SLATE_TEAL,
    paddingBottom: 16,
  },
  coverTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: SLATE_TEAL,
    marginBottom: 4,
  },
  coverSubtitle: {
    fontSize: 11,
    color: ZINC_700,
    marginBottom: 2,
  },
  coverMeta: {
    fontSize: 8,
    color: ZINC_500,
  },

  // Summary box
  summaryBox: {
    backgroundColor: ZINC_100,
    borderRadius: 4,
    padding: 12,
    marginBottom: 24,
    flexDirection: "row",
    gap: 24,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 7,
    color: ZINC_500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: SLATE_TEAL,
  },
  summaryNote: {
    fontSize: 7,
    color: ZINC_500,
    marginTop: 2,
  },

  // Section heading
  sectionHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: SLATE_TEAL,
    marginBottom: 8,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: ZINC_300,
    paddingBottom: 4,
  },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: SLATE_TEAL,
    borderRadius: 2,
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: ZINC_100,
  },
  tableRowAlt: {
    backgroundColor: ZINC_100,
  },
  tableCell: {
    fontSize: 8,
    color: ZINC_700,
  },

  // Column widths
  colTitle: { flex: 3 },
  colDate: { width: 64 },
  colCategory: { width: 72 },
  colCost: { width: 68, textAlign: "right" },
  colBasis: { width: 68, textAlign: "right" },
  colTreatment: { width: 80 },
  colStatus: { width: 52 },

  // Project detail card
  projectCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ZINC_300,
    borderRadius: 4,
    overflow: "hidden",
  },
  projectCardHeader: {
    backgroundColor: SLATE_TEAL,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  projectCardTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    flex: 1,
  },
  projectCardCost: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  projectCardBody: {
    padding: 10,
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 7,
    color: ZINC_500,
    width: 110,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fieldValue: {
    fontSize: 8,
    color: ZINC_700,
    flex: 1,
  },
  justificationBox: {
    marginTop: 8,
    backgroundColor: ZINC_100,
    borderRadius: 3,
    padding: 8,
  },
  justificationLabel: {
    fontSize: 7,
    color: ZINC_500,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  justificationText: {
    fontSize: 8,
    color: ZINC_700,
    lineHeight: 1.4,
  },
  attachmentList: {
    marginTop: 6,
  },
  attachmentItem: {
    fontSize: 7,
    color: ZINC_500,
    marginBottom: 1,
  },
  docStatusBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },

  // Footer / disclaimer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: ZINC_300,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: ZINC_500,
  },
  disclaimer: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: ZINC_300,
    borderRadius: 3,
    padding: 10,
    backgroundColor: "#fffbeb",
  },
  disclaimerText: {
    fontSize: 7,
    color: AMBER,
    lineHeight: 1.5,
  },
});

// --- Sub-components ---

function DocStatusText({
  status,
}: {
  status: DocStatus;
}): React.ReactElement {
  const color =
    status === "complete" ? GREEN : status === "partial" ? AMBER : RED;
  return (
    <Text style={[styles.docStatusBadge, { color }]}>
      {formatDocStatus(status)}
    </Text>
  );
}

function SummaryTable({
  projects,
  propertyType,
}: {
  projects: Project[];
  propertyType: Manifest["property"];
}): React.ReactElement {
  return (
    <View>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.colTitle]}>Project</Text>
        <Text style={[styles.tableHeaderCell, styles.colDate]}>Date</Text>
        <Text style={[styles.tableHeaderCell, styles.colCategory]}>
          Category
        </Text>
        <Text
          style={[styles.tableHeaderCell, styles.colCost, { color: "#fff" }]}
        >
          Total Cost
        </Text>
        <Text
          style={[styles.tableHeaderCell, styles.colBasis, { color: "#fff" }]}
        >
          Basis Adj.
        </Text>
        <Text style={[styles.tableHeaderCell, styles.colTreatment]}>
          Treatment
        </Text>
        <Text style={[styles.tableHeaderCell, styles.colStatus]}>Docs</Text>
      </View>
      {projects.map((p, i) => {
        const assessment = assessDocumentation(
          p,
          propertyType?.propertyType,
        );
        return (
          <View
            key={p.id}
            style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
          >
            <Text style={[styles.tableCell, styles.colTitle]}>{p.title}</Text>
            <Text style={[styles.tableCell, styles.colDate]}>
              {p.completionDate}
            </Text>
            <Text style={[styles.tableCell, styles.colCategory]}>
              {formatCategory(p.category)}
            </Text>
            <Text style={[styles.tableCell, styles.colCost]}>
              {formatCurrencyPdf(p.totalCost)}
            </Text>
            <Text style={[styles.tableCell, styles.colBasis]}>
              {formatCurrencyPdf(p.costBasisAdjustment)}
            </Text>
            <Text style={[styles.tableCell, styles.colTreatment]}>
              {formatTaxTreatment(p.taxTreatment)}
            </Text>
            <View style={[styles.colStatus, { justifyContent: "center" }]}>
              <DocStatusText status={assessment.status} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ProjectDetailCard({
  project,
  propertyType,
}: {
  project: Project;
  propertyType: Manifest["property"];
}): React.ReactElement {
  const assessment = assessDocumentation(project, propertyType?.propertyType);

  return (
    <View style={styles.projectCard} wrap={false}>
      <View style={styles.projectCardHeader}>
        <Text style={styles.projectCardTitle}>{project.title}</Text>
        <Text style={styles.projectCardCost}>
          {formatCurrencyPdf(project.totalCost)}
        </Text>
      </View>
      <View style={styles.projectCardBody}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Completion Date</Text>
          <Text style={styles.fieldValue}>{project.completionDate}</Text>
          <Text style={styles.fieldLabel}>Tax Treatment</Text>
          <Text style={styles.fieldValue}>
            {formatTaxTreatment(project.taxTreatment)}
          </Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Cost Basis Adjustment</Text>
          <Text style={styles.fieldValue}>
            {formatCurrencyPdf(project.costBasisAdjustment)}
          </Text>
          <Text style={styles.fieldLabel}>Deductible Amount</Text>
          <Text style={styles.fieldValue}>
            {formatCurrencyPdf(project.deductibleAmount)}
          </Text>
        </View>
        {project.vendorName ? (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Vendor</Text>
            <Text style={styles.fieldValue}>{project.vendorName}</Text>
            <Text style={styles.fieldLabel}>Category</Text>
            <Text style={styles.fieldValue}>
              {formatCategory(project.category)}
            </Text>
          </View>
        ) : null}
        {project.permitNumber ? (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Permit #</Text>
            <Text style={styles.fieldValue}>{project.permitNumber}</Text>
          </View>
        ) : null}
        {project.paymentMethod ? (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Payment Method</Text>
            <Text style={styles.fieldValue}>
              {project.paymentMethod.replace(/_/g, " ")}
            </Text>
          </View>
        ) : null}

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Documentation</Text>
          <DocStatusText status={assessment.status} />
        </View>

        {project.irsJustification ? (
          <View style={styles.justificationBox}>
            <Text style={styles.justificationLabel}>IRS Justification</Text>
            <Text style={styles.justificationText}>
              {project.irsJustification}
            </Text>
          </View>
        ) : null}

        {project.attachments.length > 0 ? (
          <View style={styles.attachmentList}>
            <Text
              style={[styles.fieldLabel, { marginBottom: 3, marginTop: 8 }]}
            >
              Attachments ({project.attachments.length})
            </Text>
            {project.attachments.map((att) => (
              <Text key={att.fileId} style={styles.attachmentItem}>
                • {att.filename}
              </Text>
            ))}
          </View>
        ) : null}

        {assessment.missing.length > 0 ? (
          <View style={{ marginTop: 6 }}>
            <Text style={[styles.fieldLabel, { color: RED }]}>
              Missing required fields:{" "}
              <Text style={{ color: RED }}>
                {assessment.missing.join(", ")}
              </Text>
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// --- Main PDF Document ---

export interface CapitalImprovementsPdfProps {
  manifest: Manifest;
  projects: Project[];
  scope: ExportScope;
  year?: string;
  exportDate?: string;
}

export function CapitalImprovementsPdf({
  manifest,
  projects,
  scope,
  year,
  exportDate,
}: CapitalImprovementsPdfProps): React.ReactElement {
  const property = manifest.property;
  const dateStr = exportDate ?? new Date().toLocaleDateString("en-US");

  const totalCostBasis = projects
    .filter((p) => p.taxTreatment === "capital_improvement")
    .reduce((sum, p) => sum + p.costBasisAdjustment, 0);
  const totalDeductible = projects.reduce(
    (sum, p) => sum + p.deductibleAmount,
    0,
  );
  const totalCost = projects.reduce((sum, p) => sum + p.totalCost, 0);

  const capitalProjects = projects.filter(
    (p) => p.taxTreatment === "capital_improvement",
  );
  const otherProjects = projects.filter(
    (p) => p.taxTreatment !== "capital_improvement",
  );

  const scopeLabel =
    scope === "year" && year ? `Tax Year ${year}` : "All Years";

  const propertyAddress = property
    ? [
        property.address,
        property.address2,
        `${property.city}, ${property.state} ${property.zip}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Property address not set";

  return (
    <Document
      title={`Capital Improvements — ${scopeLabel}`}
      author="Capital Improvements Tracker"
      subject="Capital Home Improvements — Cost Basis Record"
    >
      {/* ─── Cover / Summary Page ─── */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.coverHeader}>
          <Text style={styles.coverTitle}>Capital Home Improvements</Text>
          <Text style={styles.coverSubtitle}>{propertyAddress}</Text>
          <Text style={styles.coverMeta}>
            Exported {dateStr} · {scopeLabel} ·{" "}
            {projects.length} project
            {projects.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cost Basis Added</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(totalCostBasis)}
            </Text>
            <Text style={styles.summaryNote}>
              From {capitalProjects.length} capital improvement
              {capitalProjects.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Deductible</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(totalDeductible)}
            </Text>
            <Text style={styles.summaryNote}>Deductible / credit amounts</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Spend</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(totalCost)}
            </Text>
            <Text style={styles.summaryNote}>
              Across all {projects.length} project
              {projects.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Summary table */}
        <Text style={styles.sectionHeading}>Projects Overview</Text>
        <SummaryTable projects={projects} propertyType={property} />

        {/* Attachments note */}
        <Text
          style={[styles.coverMeta, { marginTop: 12 }]}
        >
          Note: Attachments (receipts, invoices, permits) live in your Google
          Drive folder "Capital Improvements (App Data)" and are not bundled in
          this export.
        </Text>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            NOT TAX ADVICE — This document is for recordkeeping purposes only.
            All tax treatment classifications and figures should be reviewed and
            confirmed by a qualified tax professional (CPA or enrolled agent)
            before filing. Cost-basis adjustments depend on your specific
            circumstances, IRS rules, and state law.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Capital Improvements Tracker</Text>
          <Text style={styles.footerText}>
            {propertyAddress} · {scopeLabel}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* ─── Capital Improvements Detail Page ─── */}
      {capitalProjects.length > 0 ? (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.sectionHeading}>
            Capital Improvements — Cost Basis Detail
          </Text>
          <Text style={[styles.coverMeta, { marginBottom: 12 }]}>
            These projects increase the cost basis of your property and reduce
            taxable gain upon sale.
          </Text>
          {capitalProjects.map((p) => (
            <ProjectDetailCard
              key={p.id}
              project={p}
              propertyType={property}
            />
          ))}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>Capital Improvements Tracker</Text>
            <Text style={styles.footerText}>
              {propertyAddress} · {scopeLabel}
            </Text>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </View>
        </Page>
      ) : null}

      {/* ─── Other Projects Detail Page ─── */}
      {otherProjects.length > 0 ? (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.sectionHeading}>
            Other Projects (Repairs, Deductibles, Credits)
          </Text>
          <Text style={[styles.coverMeta, { marginBottom: 12 }]}>
            These projects do not increase cost basis but may have other tax
            implications. Confirm treatment with your tax professional.
          </Text>
          {otherProjects.map((p) => (
            <ProjectDetailCard
              key={p.id}
              project={p}
              propertyType={property}
            />
          ))}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>Capital Improvements Tracker</Text>
            <Text style={styles.footerText}>
              {propertyAddress} · {scopeLabel}
            </Text>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </View>
        </Page>
      ) : null}
    </Document>
  );
}
