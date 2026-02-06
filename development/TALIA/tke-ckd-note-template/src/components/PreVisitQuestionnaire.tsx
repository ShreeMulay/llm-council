import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, MessageSquare } from "lucide-react"

interface MedConfirmation {
  name: string
  confirmed: boolean | null // null = not answered
}

interface PreVisitData {
  medsConfirmed: MedConfirmation[]
  symptoms: string[]
  questionsForDoctor: string
  completed: boolean
}

interface PreVisitQuestionnaireProps {
  currentMeds: string[]
  onComplete: (data: PreVisitData) => void
}

const COMMON_SYMPTOMS = [
  "Feeling more tired than usual",
  "Swelling in feet or ankles",
  "Shortness of breath",
  "Nausea or poor appetite",
  "Itching",
  "Muscle cramps",
  "Trouble sleeping",
  "Dizziness when standing",
]

export function PreVisitQuestionnaire({
  currentMeds,
  onComplete,
}: PreVisitQuestionnaireProps) {
  const [step, setStep] = useState<"meds" | "symptoms" | "questions" | "done">("meds")
  const [meds, setMeds] = useState<MedConfirmation[]>(
    currentMeds.map((name) => ({ name, confirmed: null }))
  )
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set())
  const [questions, setQuestions] = useState("")

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => {
      const next = new Set(prev)
      if (next.has(symptom)) next.delete(symptom)
      else next.add(symptom)
      return next
    })
  }

  const confirmMed = (index: number, confirmed: boolean) => {
    setMeds((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], confirmed }
      return next
    })
  }

  const handleSubmit = () => {
    const data: PreVisitData = {
      medsConfirmed: meds,
      symptoms: Array.from(selectedSymptoms),
      questionsForDoctor: questions,
      completed: true,
    }
    onComplete(data)
    setStep("done")
  }

  if (step === "done") {
    return (
      <div className="text-center py-8">
        <Check className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-green-700">
          All Done!
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Thank you. Your doctor will review your answers before the visit.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex gap-1">
        {["meds", "symptoms", "questions"].map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              i <= ["meds", "symptoms", "questions"].indexOf(step)
                ? "bg-blue-500"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Medication Confirmation */}
      {step === "meds" && (
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">
            Your Medications
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Are you still taking these medications? Tap Yes or No for each.
          </p>
          <div className="space-y-2">
            {meds.map((med, i) => (
              <div
                key={med.name}
                className="flex items-center justify-between p-3 bg-white rounded-lg border"
              >
                <span className="text-sm font-medium text-gray-700">
                  {med.name}
                </span>
                <div className="flex gap-2">
                  <button
                    className={`px-3 py-1 text-xs rounded-full font-medium ${
                      med.confirmed === true
                        ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                        : "bg-gray-100 text-gray-500"
                    }`}
                    onClick={() => confirmMed(i, true)}
                  >
                    Yes
                  </button>
                  <button
                    className={`px-3 py-1 text-xs rounded-full font-medium ${
                      med.confirmed === false
                        ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                        : "bg-gray-100 text-gray-500"
                    }`}
                    onClick={() => confirmMed(i, false)}
                  >
                    No
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              onClick={() => setStep("symptoms")}
              disabled={meds.some((m) => m.confirmed === null)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Symptoms */}
      {step === "symptoms" && (
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">
            How Are You Feeling?
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Tap any symptoms you have had recently.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {COMMON_SYMPTOMS.map((symptom) => (
              <button
                key={symptom}
                className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                  selectedSymptoms.has(symptom)
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => toggleSymptom(symptom)}
              >
                {selectedSymptoms.has(symptom) ? "* " : ""}{symptom}
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setStep("meds")}>
              Back
            </Button>
            <Button size="sm" onClick={() => setStep("questions")}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Questions for Doctor */}
      {step === "questions" && (
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Questions for Your Doctor
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Write anything you want to ask or tell your doctor.
          </p>
          <textarea
            className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y min-h-[100px]"
            placeholder="Type your questions here..."
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
          />
          <div className="mt-4 flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setStep("symptoms")}>
              Back
            </Button>
            <Button size="sm" onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
