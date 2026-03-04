"""Tests for metadata enrichment: drug name extraction and domain detection."""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.ingestion.enrichers.metadata_enricher import (
    detect_all_domains,
    detect_domain,
    expand_drug_query,
    extract_drug_names,
)
from src.models import Domain


class TestDrugNameExtraction:
    """Test drug name extraction from text."""

    def test_extracts_generic_name(self):
        text = "Start dapagliflozin 10mg daily for CKD."
        drugs = extract_drug_names(text)
        assert any("dapagliflozin" in d for d in drugs)

    def test_extracts_brand_name(self):
        text = "Prescribe Farxiga 10mg daily."
        drugs = extract_drug_names(text)
        assert any("Farxiga" in d for d in drugs)

    def test_extracts_both_names(self):
        text = "The patient is on Kerendia (finerenone) 20mg daily."
        drugs = extract_drug_names(text)
        assert any("finerenone" in d for d in drugs)

    def test_extracts_multiple_drugs(self):
        text = "Continue lisinopril 20mg, start dapagliflozin 10mg, add finerenone 20mg."
        drugs = extract_drug_names(text)
        assert len(drugs) >= 3

    def test_no_drugs_in_text(self):
        text = "The patient reports feeling well with no complaints."
        drugs = extract_drug_names(text)
        assert len(drugs) == 0

    def test_transplant_drugs(self):
        text = "Post-transplant regimen: tacrolimus, mycophenolate, prednisone."
        drugs = extract_drug_names(text)
        assert any("tacrolimus" in d for d in drugs)
        assert any("mycophenolate" in d for d in drugs)

    def test_gn_drugs(self):
        text = "Initiate rituximab for membranous nephropathy."
        drugs = extract_drug_names(text)
        assert any("rituximab" in d for d in drugs)

    def test_potassium_binders(self):
        text = "Add patiromer for hyperkalemia management."
        drugs = extract_drug_names(text)
        assert any("patiromer" in d for d in drugs)


class TestDomainDetection:
    """Test clinical domain detection from text."""

    def test_detects_sglt2_domain(self):
        text = "SGLT2 inhibitors like dapagliflozin reduce proteinuria and slow CKD progression."
        domain = detect_domain(text)
        assert domain == Domain.SGLT2_INHIBITORS

    def test_detects_raas_domain(self):
        text = "ACE inhibitors and ARBs are first-line for proteinuria reduction in CKD."
        domain = detect_domain(text)
        # Could be either RAAS or proteinuria — both are valid
        assert domain in (Domain.RAAS_BLOCKADE, Domain.PROTEINURIA)

    def test_detects_transplant_domain(self):
        text = (
            "Tacrolimus trough levels should be 8-10 ng/mL in the first 3 months post-transplant."
        )
        domain = detect_domain(text)
        assert domain == Domain.TRANSPLANT_IMMUNOSUPPRESSION

    def test_detects_anemia_domain(self):
        text = "Target hemoglobin 10-11.5 g/dL with ESA therapy. Check ferritin and TSAT monthly."
        domain = detect_domain(text)
        assert domain == Domain.ANEMIA_CKD_MBD

    def test_general_fallback(self):
        text = "The weather is nice today."
        domain = detect_domain(text)
        assert domain == Domain.GENERAL

    def test_detects_multiple_domains(self):
        text = "SGLT2 inhibitors reduce proteinuria and improve cardiovascular outcomes in diabetic CKD."
        domains = detect_all_domains(text)
        assert len(domains) >= 2


class TestQueryExpansion:
    """Test drug name query expansion."""

    def test_expands_brand_to_generic(self):
        query = "What is the dosing for Farxiga?"
        expanded = expand_drug_query(query)
        assert "dapagliflozin" in expanded

    def test_expands_generic_to_brand(self):
        query = "What are the side effects of dapagliflozin?"
        expanded = expand_drug_query(query)
        assert "Farxiga" in expanded

    def test_no_expansion_needed(self):
        query = "What is the eGFR threshold for CKD stage 3?"
        expanded = expand_drug_query(query)
        assert expanded == query

    def test_multiple_drug_expansion(self):
        query = "Compare Farxiga and Kerendia for CKD"
        expanded = expand_drug_query(query)
        assert "dapagliflozin" in expanded
        assert "finerenone" in expanded
