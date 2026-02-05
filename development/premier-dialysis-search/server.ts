/**
 * Premier Dialysis Policy Search — Cloud Run Server
 *
 * Bun.serve() based server that:
 * 1. Serves the static frontend (public/)
 * 2. Proxies search requests to Vertex AI Search API
 *    (so the frontend never needs GCP credentials)
 * 3. Generates signed URLs for document viewing
 * 4. Stores feedback in Firestore
 */

import { Storage } from "@google-cloud/storage";
import { Firestore } from "@google-cloud/firestore";

const PORT = parseInt(process.env.PORT || "8080");
const PROJECT_ID = process.env.GCP_PROJECT_ID || "premier-dialysis-search";
const ENGINE_ID = process.env.SEARCH_ENGINE_ID || "pd-search-engine";
const LOCATION = "global";
const BUCKET_NAME = process.env.GCS_BUCKET || "premier-dialysis-pp-docs";

// Initialize GCS and Firestore clients
const storage = new Storage({ projectId: PROJECT_ID });
const firestore = new Firestore({ projectId: PROJECT_ID });

const SEARCH_BASE = `https://discoveryengine.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

// Get GCP access token from metadata server (Cloud Run) or gcloud CLI (local)
async function getAccessToken(): Promise<string> {
  // On Cloud Run, use the metadata server
  try {
    const res = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" } }
    );
    if (res.ok) {
      const data = await res.json() as { access_token: string };
      return data.access_token;
    }
  } catch {
    // Not on Cloud Run, fall through
  }

  // Local dev: use gcloud CLI
  const proc = Bun.spawn(["gcloud", "auth", "print-access-token"], {
    stdout: "pipe",
  });
  return (await new Response(proc.stdout).text()).trim();
}

// Cache token for 50 minutes (they expire in 60)
let cachedToken: { token: string; expiry: number } | null = null;
async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiry) {
    return cachedToken.token;
  }
  const token = await getAccessToken();
  cachedToken = { token, expiry: Date.now() + 50 * 60 * 1000 };
  return token;
}

// Handle search API proxy
async function handleSearch(req: Request): Promise<Response> {
  const body = await req.json() as { query?: string };
  const query = body.query;

  if (!query || typeof query !== "string") {
    return Response.json({ error: "Missing 'query' field" }, { status: 400 });
  }

  const token = await getToken();

  // Call Vertex AI Search API
  const searchResponse = await fetch(`${SEARCH_BASE}:search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Goog-User-Project": PROJECT_ID,
    },
    body: JSON.stringify({
      query,
      pageSize: 10,
      contentSearchSpec: {
        summarySpec: {
          summaryResultCount: 5,
          includeCitations: true,
          modelSpec: {
            version: "stable",
          },
        },
        extractiveContentSpec: {
          maxExtractiveSegmentCount: 3,
        },
        snippetSpec: {
          returnSnippet: true,
        },
      },
      queryExpansionSpec: {
        condition: "AUTO",
      },
      spellCorrectionSpec: {
        mode: "AUTO",
      },
    }),
  });

  if (!searchResponse.ok) {
    const err = await searchResponse.text();
    console.error(`Search API error: ${searchResponse.status} ${err}`);
    return Response.json(
      { error: "Search failed", details: err },
      { status: searchResponse.status }
    );
  }

  const data = await searchResponse.json() as {
    summary?: { summaryText?: string };
    results?: Array<{
      document?: {
        name?: string;
        derivedStructData?: {
          title?: string;
          link?: string;
          snippets?: Array<{ snippet?: string }>;
          extractive_segments?: Array<{ content?: string; pageNumber?: string }>;
        };
      };
    }>;
    totalSize?: number;
    correctedQuery?: string;
  };

  // Extract and simplify the response for the frontend
  const summary = data.summary?.summaryText || "";
  const results = (data.results || []).map(
    (r: {
      document?: {
        name?: string;
        derivedStructData?: {
          title?: string;
          link?: string;
          snippets?: Array<{ snippet?: string }>;
          extractive_segments?: Array<{ content?: string; pageNumber?: string }>;
        };
      };
    }) => ({
      title: r.document?.derivedStructData?.title || "Untitled",
      link: r.document?.derivedStructData?.link || "",
      snippets:
        r.document?.derivedStructData?.snippets?.map(
          (s: { snippet?: string }) => s.snippet
        ) || [],
      segments:
        r.document?.derivedStructData?.extractive_segments?.map(
          (s: { content?: string; pageNumber?: string }) => ({
            content: s.content,
            pageNumber: s.pageNumber,
          })
        ) || [],
    })
  );

  return Response.json({
    summary,
    results,
    totalSize: data.totalSize || 0,
    correctedQuery: data.correctedQuery || null,
  });
}

// Handle document URL generation (signed URLs for GCS)
async function handleDocument(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const fileUri = url.searchParams.get("file");
  const title = url.searchParams.get("title") || "Document";

  if (!fileUri) {
    return Response.json({ error: "Missing 'file' parameter" }, { status: 400 });
  }

  try {
    // Parse GCS URI: gs://bucket/path/file.pdf -> path/file.pdf
    let filePath = fileUri;
    if (fileUri.startsWith("gs://")) {
      const parts = fileUri.replace("gs://", "").split("/");
      parts.shift(); // Remove bucket name
      filePath = parts.join("/");
    }

    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(filePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    // Generate signed URL valid for 1 hour
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    // Note: GCS metadata.updated reflects file upload time, not policy revision date
    // The actual revision date is embedded in the document content itself
    // So we don't show a misleading "updated" date in the UI

    // Generate Google Docs viewer URL
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`;

    return Response.json({
      title,
      filePath,
      signedUrl,
      googleViewerUrl,
      downloadUrl: signedUrl,
    });
  } catch (err) {
    console.error("Document URL generation error:", err);
    return Response.json(
      { error: "Failed to generate document URL", details: String(err) },
      { status: 500 }
    );
  }
}

// Handle feedback submission (store in Firestore)
async function handleFeedback(req: Request): Promise<Response> {
  try {
    const body = await req.json() as {
      query?: string;
      answerSnippet?: string;
      vote?: "up" | "down";
      comment?: string;
      sources?: string[];
    };

    const { query, answerSnippet, vote, comment, sources } = body;

    if (!query || !vote) {
      return Response.json(
        { error: "Missing required fields: query, vote" },
        { status: 400 }
      );
    }

    if (vote !== "up" && vote !== "down") {
      return Response.json(
        { error: "Vote must be 'up' or 'down'" },
        { status: 400 }
      );
    }

    // Store in Firestore
    const feedbackRef = firestore.collection("feedback");
    const docRef = await feedbackRef.add({
      query,
      answerSnippet: answerSnippet || "",
      vote,
      comment: comment || "",
      sources: sources || [],
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get("user-agent") || "unknown",
    });

    return Response.json({
      success: true,
      id: docRef.id,
      message: "Thank you for your feedback!",
    });
  } catch (err) {
    console.error("Feedback submission error:", err);
    return Response.json(
      { error: "Failed to submit feedback", details: String(err) },
      { status: 500 }
    );
  }
}

// Handle answer API (conversational with follow-ups)
async function handleAnswer(req: Request): Promise<Response> {
  const body = await req.json() as { query?: string; sessionId?: string };
  const query = body.query;
  const sessionId = body.sessionId || undefined;

  if (!query || typeof query !== "string") {
    return Response.json({ error: "Missing 'query' field" }, { status: 400 });
  }

  const token = await getToken();

  const requestBody: Record<string, unknown> = {
    query: { text: query },
    answerGenerationSpec: {
      includeCitations: true,
      ignoreAdversarialQuery: true,
      ignoreNonAnswerSeekingQuery: false,
      modelSpec: {
        modelVersion: "stable",
      },
    },
    searchSpec: {
      searchParams: {
        maxReturnResults: 10,
      },
    },
  };

  if (sessionId) {
    requestBody.session = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/sessions/${sessionId}`;
  }

  const answerResponse = await fetch(`${SEARCH_BASE}:answer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Goog-User-Project": PROJECT_ID,
    },
    body: JSON.stringify(requestBody),
  });

  if (!answerResponse.ok) {
    const err = await answerResponse.text();
    console.error(`Answer API error: ${answerResponse.status} ${err}`);
    return Response.json(
      { error: "Answer generation failed", details: err },
      { status: answerResponse.status }
    );
  }

  const data = await answerResponse.json() as {
    answer?: {
      answerText?: string;
      citations?: unknown[];
      references?: unknown[];
      state?: string;
    };
    session?: { name?: string };
  };

  return Response.json({
    answer: data.answer?.answerText || "",
    citations: data.answer?.citations || [],
    references: data.answer?.references || [],
    sessionId: data.session?.name?.split("/").pop() || null,
    state: data.answer?.state || "UNKNOWN",
  });
}

// Handle follow-up questions generation (context-aware)
async function handleFollowups(req: Request): Promise<Response> {
  try {
    const body = await req.json() as { query?: string; answer?: string };
    const { query, answer } = body;

    if (!query || !answer) {
      return Response.json(
        { error: "Missing required fields: query, answer" },
        { status: 400 }
      );
    }

    // Generate contextual follow-ups based on the query and answer content
    const followups = generateContextualFollowups(query, answer);
    return Response.json({ followups, source: "contextual" });
  } catch (err) {
    console.error("Follow-up generation error:", err);
    return Response.json({ followups: [], source: "error" });
  }
}

// Generate contextual follow-up questions based on query and answer
function generateContextualFollowups(query: string, answer: string): string[] {
  const combined = (query + " " + answer).toLowerCase();
  
  // Topic-specific follow-ups - check most specific first
  const topicFollowups: Array<{ keywords: string[]; questions: string[] }> = [
    // Peritonitis specific
    {
      keywords: ["peritonitis", "peritoneal infection"],
      questions: [
        "What antibiotics are used for peritonitis treatment?",
        "When should a patient call about peritonitis symptoms?",
        "How do I document a peritonitis episode?",
      ],
    },
    // PD/Peritoneal Dialysis
    {
      keywords: ["peritoneal dialysis", "pd ", " pd ", "capd", "apd", "dwell"],
      questions: [
        "What is the proper exit site care procedure?",
        "How do I handle a PD catheter malfunction?",
        "What are the signs of PD-related complications?",
      ],
    },
    // Infection control
    {
      keywords: ["infection", "bloodborne", "exposure", "contamination"],
      questions: [
        "What PPE is required for this procedure?",
        "How do I report an exposure incident?",
        "What are the hand hygiene requirements?",
      ],
    },
    // Emergency/adverse reactions
    {
      keywords: ["emergency", "adverse", "reaction", "crisis", "code"],
      questions: [
        "Who should be notified during an emergency?",
        "What documentation is required after the event?",
        "What supplies should be readily available?",
      ],
    },
    // Medications
    {
      keywords: ["medication", "antibiotic", "drug", "dose", "vancomycin", "cefepime", "heparin"],
      questions: [
        "What is the medication administration schedule?",
        "How should this medication be stored?",
        "What are the signs of an adverse drug reaction?",
      ],
    },
    // Patient education/training
    {
      keywords: ["training", "education", "competency", "teach", "instruct"],
      questions: [
        "How is patient competency verified?",
        "What topics must be covered in training?",
        "How often should retraining occur?",
      ],
    },
    // Documentation
    {
      keywords: ["document", "chart", "record", "log", "emr"],
      questions: [
        "What must be documented for each treatment?",
        "How long are records retained?",
        "Who can access patient records?",
      ],
    },
    // Staffing
    {
      keywords: ["staff", "nurse", "employee", "ratio", "certification"],
      questions: [
        "What certifications are required?",
        "What is the required staffing ratio?",
        "How is competency evaluated?",
      ],
    },
    // Patient rights
    {
      keywords: ["rights", "grievance", "complaint", "consent"],
      questions: [
        "How does a patient file a grievance?",
        "What consent is required?",
        "How is patient privacy protected?",
      ],
    },
    // Admission/discharge
    {
      keywords: ["admission", "discharge", "transfer", "eligibility"],
      questions: [
        "What assessments are required?",
        "What are the eligibility criteria?",
        "What discharge planning is needed?",
      ],
    },
    // Equipment/supplies
    {
      keywords: ["equipment", "supply", "supplies", "machine", "cycler", "catheter"],
      questions: [
        "How should equipment be maintained?",
        "What is the process for supply ordering?",
        "How are equipment issues reported?",
      ],
    },
  ];

  // Find the best matching topic
  for (const topic of topicFollowups) {
    if (topic.keywords.some(kw => combined.includes(kw))) {
      return topic.questions;
    }
  }

  // If no specific topic matched, generate based on the query type
  if (combined.includes("what") || combined.includes("how")) {
    return [
      "Who is responsible for this procedure?",
      "How often should this be reviewed?",
      "What documentation is required?",
    ];
  }

  if (combined.includes("when") || combined.includes("schedule")) {
    return [
      "What triggers this action?",
      "Who should be notified?",
      "How is this tracked?",
    ];
  }

  // Final fallback - procedure-oriented questions
  return [
    "What are the step-by-step procedures?",
    "Who oversees compliance with this policy?",
    "What training is required for this?",
  ];
}

// Serve static files from public/
const publicDir = import.meta.dir + "/firebase/public";

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // API routes
    if (url.pathname === "/api/search" && req.method === "POST") {
      return handleSearch(req);
    }
    if (url.pathname === "/api/answer" && req.method === "POST") {
      return handleAnswer(req);
    }
    if (url.pathname === "/api/document" && req.method === "GET") {
      return handleDocument(req);
    }
    if (url.pathname === "/api/feedback" && req.method === "POST") {
      return handleFeedback(req);
    }
    if (url.pathname === "/api/followups" && req.method === "POST") {
      return handleFollowups(req);
    }
    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok", project: PROJECT_ID, engine: ENGINE_ID, bucket: BUCKET_NAME });
    }

    // Static files
    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(publicDir + filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    // SPA fallback
    return new Response(Bun.file(publicDir + "/index.html"));
  },
});

console.log(`Premier Dialysis Policy Search running on port ${PORT}`);
console.log(`Project: ${PROJECT_ID}`);
console.log(`Engine:  ${ENGINE_ID}`);
