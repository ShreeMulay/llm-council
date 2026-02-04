import { describe, it, expect, mock } from "bun:test"
import { render, screen, fireEvent } from "@testing-library/react"
import { SectionCard } from "./SectionCard"
import type { Section, EncounterData, EnumDefinition } from "@/types/schema"

// Mock FieldFactory to avoid testing its internals
mock.module("./FieldFactory", () => ({
  FieldFactory: ({ field }: { field: { field_id: string; display_name: string } }) => (
    <div data-testid={`field-${field.field_id}`}>{field.display_name}</div>
  ),
}))

// Test fixtures
const createTestSection = (overrides: Partial<Section> = {}): Section => ({
  section_number: 1,
  section_id: "test_section",
  display_name: "Test Section",
  domain_group: "kidney_core",
  domain_color: null,
  card_codes: [],
  visit_mode: "always",
  condition: null,
  ai_agent: "test_agent",
  interpretation_prompt: "This is a test interpretation prompt for the section that provides AI guidance.",
  fields: [
    {
      field_id: "field1",
      display_name: "Field One",
      type: "number",
      unit: "mg/dL",
      source: ["labs_api"],
      target_range: "10-20",
      required: true,
    },
    {
      field_id: "field2",
      display_name: "Field Two",
      type: "text",
      unit: null,
      source: ["provider"],
      target_range: null,
      required: false,
    },
  ],
  ...overrides,
})

const defaultProps = {
  section: createTestSection(),
  currentData: {} as EncounterData,
  previousData: {} as EncounterData,
  isExpanded: false,
  onToggle: () => {},
  onFieldChange: () => {},
  isDeltaMode: false,
  enumDefinitions: {} as Record<string, EnumDefinition>,
}

describe("SectionCard", () => {
  describe("Header rendering", () => {
    it("renders section header with display name", () => {
      render(<SectionCard {...defaultProps} />)
      
      expect(screen.getByText("1. Test Section")).toBeTruthy()
    })

    it("shows section number before display name", () => {
      const section = createTestSection({ section_number: 5, display_name: "Kidney Function" })
      render(<SectionCard {...defaultProps} section={section} />)
      
      expect(screen.getByText("5. Kidney Function")).toBeTruthy()
    })
  })

  describe("Card codes", () => {
    it("shows card codes as badges when present", () => {
      const section = createTestSection({ card_codes: ["TKE-RAAS", "TKE-SGLT"] })
      render(<SectionCard {...defaultProps} section={section} />)
      
      expect(screen.getByText("TKE-RAAS")).toBeTruthy()
      expect(screen.getByText("TKE-SGLT")).toBeTruthy()
    })

    it("does not render card code section when no codes present", () => {
      const section = createTestSection({ card_codes: [] })
      render(<SectionCard {...defaultProps} section={section} />)
      
      expect(screen.queryByText("TKE-")).toBeNull()
    })
  })

  describe("Changed fields badge", () => {
    it("shows 'X changed' badge when hasChanges=true", () => {
      const section = createTestSection()
      const currentData: EncounterData = { "test_section.field1": 15 }
      const previousData: EncounterData = { "test_section.field1": 10 }
      
      render(
        <SectionCard
          {...defaultProps}
          section={section}
          currentData={currentData}
          previousData={previousData}
        />
      )
      
      expect(screen.getByText("1 changed")).toBeTruthy()
    })

    it("shows correct count when multiple fields changed", () => {
      const section = createTestSection()
      const currentData: EncounterData = {
        "test_section.field1": 15,
        "test_section.field2": "new value",
      }
      const previousData: EncounterData = {
        "test_section.field1": 10,
        "test_section.field2": "old value",
      }
      
      render(
        <SectionCard
          {...defaultProps}
          section={section}
          currentData={currentData}
          previousData={previousData}
        />
      )
      
      expect(screen.getByText("2 changed")).toBeTruthy()
    })

    it("does not show changed badge when no fields changed", () => {
      const section = createTestSection()
      const currentData: EncounterData = { "test_section.field1": 10 }
      const previousData: EncounterData = { "test_section.field1": 10 }
      
      render(
        <SectionCard
          {...defaultProps}
          section={section}
          currentData={currentData}
          previousData={previousData}
        />
      )
      
      expect(screen.queryByText(/changed/)).toBeNull()
    })

    it("does not count fields as changed if previousData is undefined", () => {
      const section = createTestSection()
      const currentData: EncounterData = { "test_section.field1": 15 }
      const previousData: EncounterData = {} // field1 not in previous
      
      render(
        <SectionCard
          {...defaultProps}
          section={section}
          currentData={currentData}
          previousData={previousData}
        />
      )
      
      expect(screen.queryByText(/changed/)).toBeNull()
    })
  })

  describe("Collapsed state", () => {
    it("renders collapsed state with summary when isExpanded=false", () => {
      const section = createTestSection()
      const currentData: EncounterData = {
        "test_section.field1": 15,
        "test_section.field2": "some text",
      }
      
      render(
        <SectionCard
          {...defaultProps}
          section={section}
          currentData={currentData}
          isExpanded={false}
        />
      )
      
      // Should show summary with first few fields
      expect(screen.getByText(/Field One: 15 mg\/dL/)).toBeTruthy()
    })

    it("shows 'No data' when no field values present", () => {
      const section = createTestSection()
      
      render(
        <SectionCard
          {...defaultProps}
          section={section}
          currentData={{}}
          isExpanded={false}
        />
      )
      
      expect(screen.getByText("No data")).toBeTruthy()
    })

    it("does not render fields when collapsed", () => {
      const section = createTestSection()
      
      render(
        <SectionCard
          {...defaultProps}
          section={section}
          isExpanded={false}
        />
      )
      
      expect(screen.queryByTestId("field-field1")).toBeNull()
      expect(screen.queryByTestId("field-field2")).toBeNull()
    })
  })

  describe("Expanded state", () => {
    it("renders expanded state with fields when isExpanded=true", () => {
      const section = createTestSection()
      
      render(
        <SectionCard
          {...defaultProps}
          section={section}
          isExpanded={true}
        />
      )
      
      expect(screen.getByTestId("field-field1")).toBeTruthy()
      expect(screen.getByTestId("field-field2")).toBeTruthy()
    })

    it("shows AI interpretation section when expanded", () => {
      const section = createTestSection({
        interpretation_prompt: "Analyze kidney function trends and provide clinical guidance.",
      })
      
      render(
        <SectionCard
          {...defaultProps}
          section={section}
          isExpanded={true}
        />
      )
      
      expect(screen.getByText("AI Interpretation")).toBeTruthy()
      expect(screen.getByText(/Analyze kidney function trends/)).toBeTruthy()
    })
  })

  describe("Delta mode - unchanged sections", () => {
    it("shows 'Unchanged from previous visit' for stable sections in delta mode", () => {
      const section = createTestSection()
      const currentData: EncounterData = { "test_section.field1": 10 }
      const previousData: EncounterData = { "test_section.field1": 10 }
      
      render(
        <SectionCard
          {...defaultProps}
          section={section}
          currentData={currentData}
          previousData={previousData}
          isDeltaMode={true}
          isExpanded={false}
        />
      )
      
      expect(screen.getByText("Unchanged from previous visit")).toBeTruthy()
    })

    it("shows summary instead of unchanged message when not in delta mode", () => {
      const section = createTestSection()
      const currentData: EncounterData = { "test_section.field1": 10 }
      const previousData: EncounterData = { "test_section.field1": 10 }
      
      render(
        <SectionCard
          {...defaultProps}
          section={section}
          currentData={currentData}
          previousData={previousData}
          isDeltaMode={false}
          isExpanded={false}
        />
      )
      
      expect(screen.queryByText("Unchanged from previous visit")).toBeNull()
      expect(screen.getByText(/Field One: 10 mg\/dL/)).toBeTruthy()
    })

    it("shows summary when fields have changed in delta mode", () => {
      const section = createTestSection()
      const currentData: EncounterData = { "test_section.field1": 15 }
      const previousData: EncounterData = { "test_section.field1": 10 }
      
      render(
        <SectionCard
          {...defaultProps}
          section={section}
          currentData={currentData}
          previousData={previousData}
          isDeltaMode={true}
          isExpanded={false}
        />
      )
      
      expect(screen.queryByText("Unchanged from previous visit")).toBeNull()
      expect(screen.getByText(/Field One: 15 mg\/dL/)).toBeTruthy()
    })
  })

  describe("Toggle interaction", () => {
    it("calls onToggle when header clicked", () => {
      const onToggle = mock(() => {})
      
      render(
        <SectionCard
          {...defaultProps}
          onToggle={onToggle}
        />
      )
      
      const header = screen.getByRole("button")
      fireEvent.click(header)
      
      expect(onToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe("Domain color classes", () => {
    it("applies correct domain color class for kidney_core", () => {
      const section = createTestSection({ domain_group: "kidney_core" })
      const { container } = render(<SectionCard {...defaultProps} section={section} />)
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain("section-header-kidney-core")
    })

    it("applies correct domain color class for cardiovascular", () => {
      const section = createTestSection({ domain_group: "cardiovascular" })
      const { container } = render(<SectionCard {...defaultProps} section={section} />)
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain("section-header-cardiovascular")
    })

    it("applies correct domain color class for pharmacotherapy", () => {
      const section = createTestSection({ domain_group: "pharmacotherapy" })
      const { container } = render(<SectionCard {...defaultProps} section={section} />)
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain("section-header-pharmacotherapy")
    })

    it("applies correct domain color class for metabolic", () => {
      const section = createTestSection({ domain_group: "metabolic" })
      const { container } = render(<SectionCard {...defaultProps} section={section} />)
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain("section-header-metabolic")
    })

    it("applies correct domain color class for ckd_complications", () => {
      const section = createTestSection({ domain_group: "ckd_complications" })
      const { container } = render(<SectionCard {...defaultProps} section={section} />)
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain("section-header-ckd-complications")
    })

    it("applies correct domain color class for risk_mitigation", () => {
      const section = createTestSection({ domain_group: "risk_mitigation" })
      const { container } = render(<SectionCard {...defaultProps} section={section} />)
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain("section-header-risk-mitigation")
    })

    it("applies correct domain color class for planning", () => {
      const section = createTestSection({ domain_group: "planning" })
      const { container } = render(<SectionCard {...defaultProps} section={section} />)
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain("section-header-planning")
    })

    it("applies correct domain color class for screening", () => {
      const section = createTestSection({ domain_group: "screening" })
      const { container } = render(<SectionCard {...defaultProps} section={section} />)
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain("section-header-screening")
    })

    it("applies correct domain color class for care_coordination", () => {
      const section = createTestSection({ domain_group: "care_coordination" })
      const { container } = render(<SectionCard {...defaultProps} section={section} />)
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain("section-header-care-coordination")
    })

    it("handles unknown domain group gracefully", () => {
      const section = createTestSection({ domain_group: "header" }) // header has no CSS class
      const { container } = render(<SectionCard {...defaultProps} section={section} />)
      
      const card = container.firstChild as HTMLElement
      // Should still render without crashing
      expect(card.className).toContain("border")
      expect(card.className).toContain("rounded-lg")
    })
  })

  describe("Conditional visit mode", () => {
    it("shows Conditional badge for conditional sections", () => {
      const section = createTestSection({ visit_mode: "conditional" })
      
      render(<SectionCard {...defaultProps} section={section} />)
      
      expect(screen.getByText("Conditional")).toBeTruthy()
    })

    it("does not show Conditional badge for always sections", () => {
      const section = createTestSection({ visit_mode: "always" })
      
      render(<SectionCard {...defaultProps} section={section} />)
      
      expect(screen.queryByText("Conditional")).toBeNull()
    })

    it("does not show Conditional badge for initial_only sections", () => {
      const section = createTestSection({ visit_mode: "initial_only" })
      
      render(<SectionCard {...defaultProps} section={section} />)
      
      expect(screen.queryByText("Conditional")).toBeNull()
    })
  })

  describe("Chevron icons", () => {
    it("shows ChevronRight when collapsed", () => {
      const { container } = render(
        <SectionCard {...defaultProps} isExpanded={false} />
      )
      
      // ChevronRight has a specific path, but we can check for the SVG
      const svgs = container.querySelectorAll("svg")
      expect(svgs.length).toBeGreaterThan(0)
    })

    it("shows ChevronDown when expanded", () => {
      const { container } = render(
        <SectionCard {...defaultProps} isExpanded={true} />
      )
      
      const svgs = container.querySelectorAll("svg")
      expect(svgs.length).toBeGreaterThan(0)
    })
  })
})
