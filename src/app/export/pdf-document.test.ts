import { describe, it, expect } from "vitest";
import { type Project } from "@/domain/schemas";
import {
  formatCurrencyPdf,
  formatTaxTreatment,
  formatCategory,
  formatDocStatus,
  getProjectYear,
  filterProjectsByScope,
  getAvailableYears,
} from "./pdf-document";

const baseProject: Project = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  title: "New Roof",
  completionDate: "2024-06-15",
  totalCost: 18000,
  taxTreatment: "capital_improvement",
  costBasisAdjustment: 18000,
  deductibleAmount: 0,
  irsJustification: "Full tear-off and replacement",
  confidence: 0.95,
  attachments: [],
  createdAt: "2024-06-15T10:00:00.000Z",
  updatedAt: "2024-06-15T10:00:00.000Z",
};

const makeProject = (overrides: Partial<Project>): Project => ({
  ...baseProject,
  ...overrides,
});

// ─── formatCurrencyPdf ─────────────────────────────────────────────────────

describe("formatCurrencyPdf", () => {
  it("formats a whole-dollar amount with cents", () => {
    // Arrange / Act
    const result = formatCurrencyPdf(18000);
    // Assert
    expect(result).toBe("$18,000.00");
  });

  it("formats zero as $0.00", () => {
    expect(formatCurrencyPdf(0)).toBe("$0.00");
  });

  it("formats a fractional amount correctly", () => {
    expect(formatCurrencyPdf(1234.56)).toBe("$1,234.56");
  });
});

// ─── formatTaxTreatment ────────────────────────────────────────────────────

describe("formatTaxTreatment", () => {
  it.each([
    ["capital_improvement", "Capital Improvement"],
    ["repair", "Repair / Maintenance"],
    ["deductible", "Deductible Expense"],
    ["credit", "Tax Credit"],
    ["unknown", "Unclassified"],
  ] as const)("maps %s → %s", (input, expected) => {
    expect(formatTaxTreatment(input)).toBe(expected);
  });

  it("passes through an unrecognized value unchanged", () => {
    expect(formatTaxTreatment("future_treatment")).toBe("future_treatment");
  });
});

// ─── formatCategory ────────────────────────────────────────────────────────

describe("formatCategory", () => {
  it("returns — for undefined", () => {
    expect(formatCategory(undefined)).toBe("—");
  });

  it("title-cases a single-word category", () => {
    expect(formatCategory("roof")).toBe("Roof");
  });

  it("title-cases and joins a multi-word category", () => {
    expect(formatCategory("windows_doors")).toBe("Windows Doors");
  });

  it("handles energy_efficiency correctly", () => {
    expect(formatCategory("energy_efficiency")).toBe("Energy Efficiency");
  });
});

// ─── formatDocStatus ───────────────────────────────────────────────────────

describe("formatDocStatus", () => {
  it.each([
    ["complete", "Complete"],
    ["partial", "Partial"],
    ["incomplete", "Incomplete"],
  ] as const)("maps %s → %s", (input, expected) => {
    expect(formatDocStatus(input)).toBe(expected);
  });
});

// ─── getProjectYear ────────────────────────────────────────────────────────

describe("getProjectYear", () => {
  it("extracts the four-digit year from completionDate", () => {
    expect(getProjectYear(baseProject)).toBe("2024");
  });

  it("works for a project in a different year", () => {
    const p = makeProject({ completionDate: "2021-01-01" });
    expect(getProjectYear(p)).toBe("2021");
  });
});

// ─── filterProjectsByScope ─────────────────────────────────────────────────

describe("filterProjectsByScope", () => {
  const projects: Project[] = [
    makeProject({
      id: "a",
      completionDate: "2022-03-10",
      title: "2022 project",
    }),
    makeProject({
      id: "b",
      completionDate: "2023-07-20",
      title: "2023 project",
    }),
    makeProject({
      id: "c",
      completionDate: "2024-11-05",
      title: "2024 project",
    }),
  ];

  it("returns all projects when scope is 'all'", () => {
    // Arrange / Act
    const result = filterProjectsByScope(projects, "all");
    // Assert
    expect(result).toHaveLength(3);
  });

  it("filters to a specific year when scope is 'year'", () => {
    // Arrange / Act
    const result = filterProjectsByScope(projects, "year", "2023");
    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("2023 project");
  });

  it("returns an empty array when no projects match the year", () => {
    const result = filterProjectsByScope(projects, "year", "2000");
    expect(result).toHaveLength(0);
  });

  it("returns all projects when scope is 'all' even if year is provided", () => {
    const result = filterProjectsByScope(projects, "all", "2022");
    expect(result).toHaveLength(3);
  });
});

// ─── getAvailableYears ─────────────────────────────────────────────────────

describe("getAvailableYears", () => {
  it("returns unique years sorted descending", () => {
    // Arrange
    const projects: Project[] = [
      makeProject({ id: "a", completionDate: "2022-01-01" }),
      makeProject({ id: "b", completionDate: "2024-06-15" }),
      makeProject({ id: "c", completionDate: "2022-08-20" }),
      makeProject({ id: "d", completionDate: "2023-03-10" }),
    ];
    // Act
    const years = getAvailableYears(projects);
    // Assert
    expect(years).toEqual(["2024", "2023", "2022"]);
  });

  it("returns an empty array for an empty project list", () => {
    expect(getAvailableYears([])).toEqual([]);
  });

  it("handles a single project", () => {
    expect(getAvailableYears([baseProject])).toEqual(["2024"]);
  });
});
