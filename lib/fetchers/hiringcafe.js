// HiringCafe's public, read-only MCP job-search endpoint. Keep this source
// intentionally small: its documentation says heavy automated use is not
// supported, so each pipeline run performs only three targeted searches and
// retrieves details for a very small number of results from each search.

import { makeJob, safePostJson } from "./base.js";

const MCP_URL = "https://hiringcafe.com/api/chatgpt/mcp";
function resultLimit() {
  const requested = Number(process.env.HIRINGCAFE_RESULTS_PER_SEARCH || 3);
  if (!Number.isFinite(requested)) return 3;
  return Math.min(Math.max(Math.floor(requested), 1), 5);
}

const SEARCHES = [
  "Remote web developer, frontend developer, or full stack developer roles posted within the last 14 days. Exclude senior and management roles. Prefer roles open to applicants in Nigeria or worldwide.",
  "Paid remote internships for web development, frontend development, full stack development, or software engineering, posted within the last 14 days. Exclude senior roles and prefer roles open to applicants in Nigeria or worldwide.",
  "Web developer, frontend developer, or full stack developer jobs and paid internships in Abuja, Nigeria. Include onsite, hybrid, or remote roles posted within the last 14 days. Exclude senior and management roles.",
];

async function callTool(name, args) {
  const response = await safePostJson(MCP_URL, {
    jsonrpc: "2.0",
    id: `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    method: "tools/call",
    params: { name, arguments: args },
  });
  if (!response) return null;
  if (response.error) {
    console.warn(`[fetchers] HiringCafe ${name} failed: ${response.error.message || "unknown error"}`);
    return null;
  }
  return response.result?.structuredContent || null;
}

function isPaid(compensation) {
  return Boolean(
    compensation &&
      (Number(compensation.minimum) > 0 || Number(compensation.maximum) > 0),
  );
}

function detailToJob(detail) {
  const employmentType = Array.isArray(detail.employmentTypes)
    ? detail.employmentTypes.join(", ")
    : "";
  const location = [detail.workplaceType, detail.location]
    .filter(Boolean)
    .join(", ");
  const description = [
    detail.requirementsSummary,
    ...(detail.technologies || []),
    ...(detail.responsibilities || []),
    detail.description,
  ]
    .filter(Boolean)
    .join("\n");

  return makeJob({
    title: detail.title || "",
    company: detail.company || "",
    location,
    employmentType,
    postedAt: detail.datePosted || "",
    isPaid: isPaid(detail.compensation),
    link: detail.applyUrl || "",
    description,
    source: "hiringcafe",
  });
}

export async function fetchHiringCafe() {
  if (process.env.HIRINGCAFE_ENABLED === "false") return [];

  const jobs = [];
  const seen = new Set();

  for (const prompt of SEARCHES) {
    const search = await callTool("search_hiringcafe_jobs", {
      prompt,
      limit: resultLimit(),
    });

    for (const result of search?.jobs || []) {
      if (!result.id || seen.has(result.id)) continue;
      seen.add(result.id);

      const detail = await callTool("get_hiringcafe_job_details", {
        job_id: result.id,
      });
      if (detail?.job) jobs.push(detailToJob(detail.job));
    }
  }

  return jobs;
}
