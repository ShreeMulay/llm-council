# Ambient AI Scribe Evaluation for Nephrology

| Feature | Abridge | Nuance DAX Copilot | Nabla Copilot |
| :--- | :--- | :--- | :--- |
| **Primary Use Case** | Broad outpatient | Broad outpatient (Epic integration) | Fast, lightweight outpatient |
| **Nephrology Accuracy** | High (Good with complex medication regimens) | Very High (Mature models) | Moderate (Requires more manual review for complex cases) |
| **EHR Integration** | Deep Epic & Cerner integration | Unmatched Epic integration | Chrome extension works with almost any web EHR (DaVita CKD EHR) |
| **Deployment Speed** | Months (if deep integration) | Months (if Epic) | **Days (Chrome Extension)** |
| **Cost (Estimated)** | ~$150-$200/provider/mo | ~$150/provider/mo | ~$119/provider/mo |
| **Pros for TKE** | Excellent clinical nuance capture. | The industry standard. Highly accurate. | **Fastest to deploy on DaVita EHR.** No complex IT setup. Cheapest option to prove ROI immediately. |
| **Cons for TKE** | May be overkill/too slow to deploy if not using Epic. | Heavyweight. Overkill if not on Epic. | May miss nuances of Quadruple Therapy without prompting. |
| **Recommendation** | ❌ Too slow to deploy right now. | ❌ Too heavy for DaVita EHR. | ✅ **Winner for Phase 1.** Deploy the Chrome extension tomorrow. Test it for 30 days. |

## Why Nabla for Phase 1 (The Bridge)?
TKE is on DaVita's CKD EHR (web-based). You do not have the time or IT resources to negotiate a 6-month deep integration with Abridge or DAX right now. You need relief for your APPs *this week*. 

Nabla operates as a simple Chrome extension that "listens" via the computer microphone and pastes the structured note directly into the DaVita web portal. 

### Implementation Plan (Next 14 Days)
1. **Pilot:** Select your most tech-savvy APP. Buy one license of Nabla Copilot ($119/mo).
2. **Train:** Instruct the APP to verbalize the 12 domains during the patient exam (e.g., *"Mrs. Smith, I see your blood pressure is 118/75 today, which is exactly at our goal of under 120. Your A1C is 6.8..."*). This forces the AI to hear and document the data.
3. **Review:** Have the APP compare the AI note against the manual report card for 1 week.
4. **Scale:** If it saves >3 minutes per encounter, buy licenses for all 5 APPs. You just bought back 1.5 hours per day per provider.