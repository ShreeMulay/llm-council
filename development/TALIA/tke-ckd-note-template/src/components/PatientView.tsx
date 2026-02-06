import { useCallback } from "react"
import { useEncounterStore } from "@/stores/encounter"
import { HealthGauge } from "./HealthGauge"
import { PreVisitQuestionnaire } from "./PreVisitQuestionnaire"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Heart } from "lucide-react"

export function PatientView() {
  const store = useEncounterStore()
  const open = store.patientViewOpen

  const egfr = typeof store.currentData["kidney_function.egfr_current"] === "number"
    ? store.currentData["kidney_function.egfr_current"] as number
    : 0
  const uacr = typeof store.currentData["kidney_function.uacr_current"] === "number"
    ? store.currentData["kidney_function.uacr_current"] as number
    : 0
  const potassium = typeof store.currentData["electrolytes.potassium"] === "number"
    ? store.currentData["electrolytes.potassium"] as number
    : 0
  const hemoglobin = typeof store.currentData["anemia.hemoglobin"] === "number"
    ? store.currentData["anemia.hemoglobin"] as number
    : 0
  const systolic = typeof store.currentData["bp_fluid.systolic_bp"] === "number"
    ? store.currentData["bp_fluid.systolic_bp"] as number
    : 0

  // Current medications list (simplified from store data)
  const currentMeds: string[] = []
  const raasStatus = store.currentData["raas.raas_status"]
  const raasDose = store.currentData["raas.raas_drug_dose"]
  if (raasStatus && String(raasStatus).startsWith("on")) {
    currentMeds.push(String(raasDose || "Blood pressure medicine"))
  }
  if (store.currentData["sglt2i.sglt2i_status"] === "on") {
    currentMeds.push("Kidney protector (SGLT2 inhibitor)")
  }
  if (store.currentData["mra.mra_status"] === "on") {
    currentMeds.push("Mineral balance medicine (MRA)")
  }

  const handleQuestionnaireComplete = useCallback((_data: unknown) => {
    // In production, this would save to the encounter's pre-visit data
    store.setPatientViewOpen(false)
  }, [store])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) store.setPatientViewOpen(false) }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-red-500" />
            Your Kidney Health
          </DialogTitle>
          <DialogDescription>
            Here is a simple look at how your kidneys are doing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Greeting */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              Hello, <strong>{store.patientName.split(" ")[0]}</strong>! Here is an easy-to-read summary of your kidney health.
              The colored circles show if things are looking <span className="text-green-600 font-semibold">good</span>,
              need some <span className="text-yellow-600 font-semibold">watching</span>,
              or need <span className="text-red-600 font-semibold">attention</span>.
            </p>
          </div>

          {/* Health Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <HealthGauge
              value={egfr}
              label="Kidney Function"
              description="This number shows how well your kidneys filter your blood. Higher is better."
              unit="mL/min"
              higherIsBetter={true}
              zones={{
                min: 0,
                max: 120,
                greenLow: 60,
                greenHigh: 120,
                yellowLow: 30,
                yellowHigh: 59,
              }}
            />
            <HealthGauge
              value={uacr}
              label="Protein in Urine"
              description="This shows if protein is leaking into your urine. Lower is better."
              unit="mg/g"
              higherIsBetter={false}
              zones={{
                min: 0,
                max: 1000,
                greenLow: 0,
                greenHigh: 30,
                yellowLow: 31,
                yellowHigh: 300,
              }}
            />
            <HealthGauge
              value={potassium}
              label="Potassium Level"
              description="Potassium keeps your heart beating steadily. Too high or too low can be dangerous."
              unit="mEq/L"
              higherIsBetter={false}
              zones={{
                min: 2.5,
                max: 7.5,
                greenLow: 3.5,
                greenHigh: 5.0,
                yellowLow: 3.0,
                yellowHigh: 5.5,
              }}
            />
            <HealthGauge
              value={systolic}
              label="Blood Pressure (Top)"
              description="This is the pressure when your heart pumps. Lower is usually better."
              unit="mmHg"
              higherIsBetter={false}
              zones={{
                min: 80,
                max: 200,
                greenLow: 90,
                greenHigh: 130,
                yellowLow: 131,
                yellowHigh: 150,
              }}
            />
            <HealthGauge
              value={hemoglobin}
              label="Blood Count"
              description="This shows if you have enough red blood cells. Low numbers can make you feel tired."
              unit="g/dL"
              higherIsBetter={true}
              zones={{
                min: 5,
                max: 18,
                greenLow: 11,
                greenHigh: 17,
                yellowLow: 9,
                yellowHigh: 10.9,
              }}
            />
          </div>

          {/* Pre-Visit Questionnaire */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">
              Before Your Visit
            </h3>
            <PreVisitQuestionnaire
              currentMeds={currentMeds.length > 0 ? currentMeds : ["No medications on file"]}
              onComplete={handleQuestionnaireComplete}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
