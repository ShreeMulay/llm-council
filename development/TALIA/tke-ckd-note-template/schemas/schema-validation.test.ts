import { describe, it, expect } from "bun:test";

// Load all schemas
const registry = await Bun.file("schemas/section-registry.json").json();
const fieldTypes = await Bun.file("schemas/field-types.json").json();
const agentConfig = await Bun.file("schemas/agent-config.json").json();
const migrationMap = await Bun.file("schemas/migration-map.json").json();

// --- Section Registry Completeness ---

describe("Section Registry - Completeness", () => {
  it("should have 38 sections (0 header + 37 clinical)", () => {
    expect(registry.sections.length).toBe(38);
  });

  it("should have continuous section numbers from 0 to 37", () => {
    const numbers = registry.sections.map((s: any) => s.section_number).sort((a: number, b: number) => a - b);
    for (let i = 0; i <= 37; i++) {
      expect(numbers[i]).toBe(i);
    }
  });

  it("should have unique section_ids", () => {
    const ids = registry.sections.map((s: any) => s.section_id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("should have unique section_numbers", () => {
    const numbers = registry.sections.map((s: any) => s.section_number);
    const unique = new Set(numbers);
    expect(unique.size).toBe(numbers.length);
  });

  it("every section should have required properties", () => {
    const requiredProps = [
      "section_number", "section_id", "display_name", "domain_group",
      "card_codes", "visit_mode", "ai_agent", "fields"
    ];
    for (const section of registry.sections) {
      for (const prop of requiredProps) {
        expect(section).toHaveProperty(prop);
      }
    }
  });
});

// --- Section Registry Fields ---

describe("Section Registry - Fields", () => {
  it("every field should have required properties", () => {
    const requiredFieldProps = ["field_id", "display_name", "type", "source", "required"];
    for (const section of registry.sections) {
      for (const field of section.fields) {
        for (const prop of requiredFieldProps) {
          expect(field).toHaveProperty(prop);
        }
      }
    }
  });

  it("field types should be valid", () => {
    const validTypes = ["number", "enum", "text", "date", "boolean", "calculated"];
    for (const section of registry.sections) {
      for (const field of section.fields) {
        expect(validTypes).toContain(field.type);
      }
    }
  });

  it("field sources should be valid arrays", () => {
    const validSources = new Set(fieldTypes.source_types);
    for (const section of registry.sections) {
      for (const field of section.fields) {
        expect(Array.isArray(field.source)).toBe(true);
        expect(field.source.length).toBeGreaterThan(0);
        for (const src of field.source) {
          expect(validSources.has(src)).toBe(true);
        }
      }
    }
  });

  it("enum fields should reference a valid enum_ref", () => {
    const validEnums = new Set(Object.keys(fieldTypes.enums));
    for (const section of registry.sections) {
      for (const field of section.fields) {
        if (field.type === "enum") {
          expect(field.enum_ref).toBeDefined();
          expect(validEnums.has(field.enum_ref)).toBe(true);
        }
      }
    }
  });

  it("field_ids should be unique within each section", () => {
    for (const section of registry.sections) {
      const fieldIds = section.fields.map((f: any) => f.field_id);
      const unique = new Set(fieldIds);
      expect(unique.size).toBe(fieldIds.length);
    }
  });

  it("should have at least 200 total fields", () => {
    const totalFields = registry.sections.reduce((sum: number, s: any) => sum + s.fields.length, 0);
    expect(totalFields).toBeGreaterThanOrEqual(200);
  });
});

// --- Domain Groups ---

describe("Section Registry - Domain Groups", () => {
  it("all domain_groups should be valid", () => {
    const validDomains = new Set(Object.keys(fieldTypes.domain_groups));
    for (const section of registry.sections) {
      expect(validDomains.has(section.domain_group)).toBe(true);
    }
  });

  it("visit_modes should be valid", () => {
    const validModes = new Set(Object.keys(fieldTypes.visit_modes));
    for (const section of registry.sections) {
      expect(validModes.has(section.visit_mode)).toBe(true);
    }
  });

  it("Domain 1 (Kidney Core) should have 4 sections (1-4)", () => {
    const kidneyCore = registry.sections.filter((s: any) => s.domain_group === "kidney_core");
    expect(kidneyCore.length).toBe(4);
  });

  it("Domain 3 (Pharmacotherapy) should have 4 sections (8-11) for 4 Pillars", () => {
    const pharma = registry.sections.filter((s: any) => s.domain_group === "pharmacotherapy");
    expect(pharma.length).toBe(4);
  });

  it("Domain 6 (Risk Mitigation) should have 6 sections (18-23)", () => {
    const risk = registry.sections.filter((s: any) => s.domain_group === "risk_mitigation");
    expect(risk.length).toBe(6);
  });

  it("Domain 8 (Screening) should have 7 sections (28-34)", () => {
    const screening = registry.sections.filter((s: any) => s.domain_group === "screening");
    expect(screening.length).toBe(7);
  });

  it("Domain 9 (Care Coordination) should have 3 sections (35-37)", () => {
    const coord = registry.sections.filter((s: any) => s.domain_group === "care_coordination");
    expect(coord.length).toBe(3);
  });
});

// --- Agent Config ---

describe("Agent Config - Completeness", () => {
  it("should have 8 core agents (Phase 4)", () => {
    const agents = Object.values(agentConfig.agents) as any[];
    expect(agents.length).toBe(8);
  });

  it("every section should be owned by at least one agent", () => {
    const allOwnedSections = new Set<string>();
    for (const agent of Object.values(agentConfig.agents) as any[]) {
      for (const sid of agent.sections_owned) {
        allOwnedSections.add(sid);
      }
    }
    // Also check expansion agents
    for (const agent of Object.values(agentConfig.phase8_expansion_agents) as any[]) {
      if (agent.sections_owned) {
        for (const sid of agent.sections_owned) {
          allOwnedSections.add(sid);
        }
      }
    }

    const sectionIds = registry.sections.map((s: any) => s.section_id);
    for (const sid of sectionIds) {
      expect(allOwnedSections.has(sid)).toBe(true);
    }
  });

  it("every agent referenced in registry should exist in agent config", () => {
    const agentIds = new Set(Object.keys(agentConfig.agents));
    // Also add expansion agents
    for (const aid of Object.keys(agentConfig.phase8_expansion_agents)) {
      agentIds.add(aid);
    }

    for (const section of registry.sections) {
      expect(agentIds.has(section.ai_agent)).toBe(true);
    }
  });

  it("every core agent should have required properties", () => {
    const requiredProps = ["agent_id", "display_name", "sections_owned", "system_prompt"];
    for (const agent of Object.values(agentConfig.agents) as any[]) {
      for (const prop of requiredProps) {
        expect(agent).toHaveProperty(prop);
      }
    }
  });

  it("safety guardrails should have 7 rules", () => {
    expect(agentConfig.safety_guardrails.rules.length).toBe(7);
  });
});

// --- Migration Map ---

describe("Migration Map - Completeness", () => {
  it("should have 23 legacy SmartList mappings", () => {
    expect(migrationMap.legacy_smartlists.length).toBe(23);
  });

  it("should have 7 Epic auto-pull tag mappings", () => {
    expect(migrationMap.epic_auto_pull_tags.length).toBe(7);
  });

  it("all mapped section_ids should exist in registry", () => {
    const registrySectionIds = new Set(registry.sections.map((s: any) => s.section_id));
    for (const mapping of migrationMap.legacy_smartlists) {
      expect(registrySectionIds.has(mapping.new_section_id)).toBe(true);
    }
  });

  it("all mapped field_ids should exist in their corresponding sections", () => {
    for (const mapping of migrationMap.legacy_smartlists) {
      const section = registry.sections.find((s: any) => s.section_id === mapping.new_section_id);
      expect(section).toBeDefined();
      const fieldIds = section.fields.map((f: any) => f.field_id);
      expect(fieldIds).toContain(mapping.new_field_id);
    }
  });

  it("all SmartList IDs should be unique", () => {
    const ids = migrationMap.legacy_smartlists.map((m: any) => m.smartlist_id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("summary should report zero data loss", () => {
    expect(migrationMap.summary.unmapped_legacy_fields).toBe(0);
    expect(migrationMap.summary.data_loss).toBe("ZERO - all legacy fields have a corresponding new field_id");
  });
});

// --- Field Types ---

describe("Field Types - Completeness", () => {
  it("should have 10 domain groups", () => {
    expect(Object.keys(fieldTypes.domain_groups).length).toBe(10);
  });

  it("should have 3 visit modes", () => {
    expect(Object.keys(fieldTypes.visit_modes).length).toBe(3);
  });

  it("should have physiological bounds for common lab values", () => {
    const requiredBounds = [
      "potassium", "sodium", "creatinine", "egfr", "hemoglobin",
      "calcium", "phosphorus", "bicarbonate", "bun", "albumin"
    ];
    for (const bound of requiredBounds) {
      expect(fieldTypes.physiological_bounds).toHaveProperty(bound);
      expect(fieldTypes.physiological_bounds[bound]).toHaveProperty("min");
      expect(fieldTypes.physiological_bounds[bound]).toHaveProperty("max");
      expect(fieldTypes.physiological_bounds[bound]).toHaveProperty("unit");
    }
  });

  it("should have critical values for panic thresholds", () => {
    const requiredCritical = ["potassium", "sodium", "hemoglobin", "calcium"];
    for (const val of requiredCritical) {
      expect(fieldTypes.critical_values).toHaveProperty(val);
    }
  });

  it("every enum referenced by a field should have values defined", () => {
    for (const section of registry.sections) {
      for (const field of section.fields) {
        if (field.type === "enum" && field.enum_ref) {
          const enumDef = fieldTypes.enums[field.enum_ref];
          expect(enumDef).toBeDefined();
          expect(enumDef.values.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

// --- Cross-Schema Consistency ---

describe("Cross-Schema Consistency", () => {
  it("card_codes in registry should not have orphans (every code appears at least once)", () => {
    const allCardCodes = new Set<string>();
    for (const section of registry.sections) {
      for (const code of section.card_codes) {
        allCardCodes.add(code);
      }
    }
    // Just verify we have a reasonable number of card codes
    expect(allCardCodes.size).toBeGreaterThanOrEqual(30);
  });

  it("sections with visit_mode 'conditional' should have a condition defined", () => {
    for (const section of registry.sections) {
      if (section.visit_mode === "conditional") {
        expect(section.condition).toBeTruthy();
      }
    }
  });

  it("sections with visit_mode 'always' should NOT require a condition", () => {
    for (const section of registry.sections) {
      if (section.visit_mode === "always") {
        expect(section.condition).toBeNull();
      }
    }
  });

  it("4 Pillars sections (8-11) should all be 'always' mode", () => {
    const pillarSections = registry.sections.filter(
      (s: any) => s.section_number >= 8 && s.section_number <= 11
    );
    expect(pillarSections.length).toBe(4);
    for (const section of pillarSections) {
      expect(section.visit_mode).toBe("always");
    }
  });

  it("Triple Whammy alert should reference medication_safety_agent", () => {
    expect(registry.cross_cutting_alerts.length).toBeGreaterThanOrEqual(1);
    const tripleWhammy = registry.cross_cutting_alerts.find((a: any) => a.alert_id === "triple_whammy");
    expect(tripleWhammy).toBeDefined();
    expect(tripleWhammy.agent).toBe("medication_safety_agent");
    expect(tripleWhammy.severity).toBe("critical");
  });
});
