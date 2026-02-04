/**
 * Premier Dialysis Policy Search — Query Tester
 *
 * Tests search quality by running sample queries against the
 * Vertex AI Search API and checking for expected behaviors.
 *
 * Usage: bun run scripts/test-queries.ts
 *
 * Prerequisites:
 *   - GCP_PROJECT_ID env var set
 *   - SEARCH_ENGINE_ID env var set (your Search App ID)
 *   - Authenticated via: gcloud auth application-default login
 */

interface SearchResult {
  query: string;
  hasAnswer: boolean;
  answerText: string;
  citations: string[];
  hasCitations: boolean;
}

interface TestCase {
  query: string;
  expectAnswer: boolean;
  expectCitationContains?: string;
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    query: "What is the mission statement?",
    expectAnswer: true,
    expectCitationContains: "1-001",
    description: "Should find and cite Mission Statement document",
  },
  {
    query: "What are patient rights in Florida?",
    expectAnswer: true,
    expectCitationContains: "2-015",
    description: "Should cite FL-specific Patient Rights document",
  },
  {
    query: "What are the Medical Director responsibilities?",
    expectAnswer: true,
    expectCitationContains: "2-006",
    description: "Should cite Medical Director policy",
  },
  {
    query: "What is the admission and discharge policy?",
    expectAnswer: true,
    expectCitationContains: "2-012",
    description: "Should cite Admission/Discharge document",
  },
  {
    query: "What is the advance directives policy?",
    expectAnswer: true,
    expectCitationContains: "2-017",
    description: "Should cite Advance Directives document",
  },
  {
    query: "What are the staffing requirements?",
    expectAnswer: true,
    description: "Should find staffing-related policy",
  },
  {
    query: "What is the infection control protocol?",
    expectAnswer: true,
    description: "Should find infection control policy",
  },
  {
    query: "What is the weather today?",
    expectAnswer: false,
    description: "Out-of-scope — should NOT generate an answer",
  },
  {
    query: "Tell me about COVID vaccines",
    expectAnswer: false,
    description: "Out-of-scope — should NOT generate an answer (unless in docs)",
  },
  {
    query: "Patient rights in Tennessee",
    expectAnswer: true,
    expectCitationContains: "TN",
    description: "Should cite TN-specific variant",
  },
];

async function getAccessToken(): Promise<string> {
  const proc = Bun.spawn(["gcloud", "auth", "print-access-token"], {
    stdout: "pipe",
  });
  const text = await new Response(proc.stdout).text();
  return text.trim();
}

async function searchQuery(
  projectId: string,
  searchEngineId: string,
  query: string,
  accessToken: string
): Promise<SearchResult> {
  const url = `https://discoveryengine.googleapis.com/v1/projects/${projectId}/locations/global/collections/default_collection/engines/${searchEngineId}/servingConfigs/default_search:search`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      pageSize: 5,
      contentSearchSpec: {
        summarySpec: {
          summaryResultCount: 3,
          includeCitations: true,
        },
        extractiveContentSpec: {
          maxExtractiveSegmentCount: 3,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`  API Error for "${query}": ${response.status} ${error}`);
    return {
      query,
      hasAnswer: false,
      answerText: `ERROR: ${response.status}`,
      citations: [],
      hasCitations: false,
    };
  }

  const data = await response.json();

  const summary = data.summary?.summaryText || "";
  const citations =
    data.results?.map(
      (r: { document?: { derivedStructData?: { title?: string } } }) =>
        r.document?.derivedStructData?.title || "Unknown"
    ) || [];

  return {
    query,
    hasAnswer: summary.length > 0 && !summary.includes("I don't have"),
    answerText: summary.substring(0, 200),
    citations,
    hasCitations: citations.length > 0,
  };
}

async function main() {
  const projectId = process.env.GCP_PROJECT_ID;
  const searchEngineId = process.env.SEARCH_ENGINE_ID;

  if (!projectId || !searchEngineId) {
    console.error("ERROR: Set GCP_PROJECT_ID and SEARCH_ENGINE_ID env vars");
    console.error("");
    console.error("  export GCP_PROJECT_ID=premier-dialysis-search");
    console.error("  export SEARCH_ENGINE_ID=your-search-engine-id");
    process.exit(1);
  }

  console.log("============================================");
  console.log("Premier Dialysis — Search Quality Tests");
  console.log("============================================");
  console.log(`Project: ${projectId}`);
  console.log(`Engine:  ${searchEngineId}`);
  console.log(`Tests:   ${TEST_CASES.length}`);
  console.log("");

  const accessToken = await getAccessToken();

  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    console.log(`--- ${testCase.description} ---`);
    console.log(`  Query: "${testCase.query}"`);

    const result = await searchQuery(
      projectId,
      searchEngineId,
      testCase.query,
      accessToken
    );

    // Check answer expectation
    const answerOk = result.hasAnswer === testCase.expectAnswer;

    // Check citation expectation
    let citationOk = true;
    if (testCase.expectCitationContains) {
      citationOk = result.citations.some((c: string) =>
        c.includes(testCase.expectCitationContains!)
      );
    }

    const testPassed = answerOk && citationOk;

    if (testPassed) {
      console.log(`  PASS`);
      passed++;
    } else {
      console.log(`  FAIL`);
      if (!answerOk) {
        console.log(
          `    Expected answer: ${testCase.expectAnswer}, Got: ${result.hasAnswer}`
        );
      }
      if (!citationOk) {
        console.log(
          `    Expected citation containing: "${testCase.expectCitationContains}"`
        );
        console.log(`    Got citations: ${JSON.stringify(result.citations)}`);
      }
      failed++;
    }

    if (result.answerText) {
      console.log(`  Answer: ${result.answerText}...`);
    }
    console.log("");

    // Rate limit
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("============================================");
  console.log(`Results: ${passed} passed, ${failed} failed out of ${TEST_CASES.length}`);
  console.log("============================================");

  process.exit(failed > 0 ? 1 : 0);
}

main();
