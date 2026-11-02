// base.js
// Shared job shape and a safe fetch wrapper every source fetcher uses.

export function makeJob(fields) {
  const job = {
    title: "",
    company: "",
    location: "",
    employmentType: "",
    postedAt: "",
		isPaid: false,
    link: "",
    description: "",
    source: "",
    ...fields,
  };
  // Keep memory small on the VPS: very long descriptions are cut at 12,000
  // characters, which still covers the text the filters and scorer read.
  job.description = String(job.description || "").slice(0, 12000);
  return job;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; job-pipeline-bot/1.0; personal use)",
};

export async function safeGet(url, params = {}) {
  try {
    const qs = new URLSearchParams(params).toString();
    const fullUrl = qs ? `${url}?${qs}` : url;
    const res = await fetch(fullUrl, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`[fetchers] ${url} returned status ${res.status}`);
      return null;
    }
    return res;
  } catch (err) {
    console.warn(`[fetchers] request to ${url} failed: ${err.message}`);
    return null;
  }
}

// Shared JSON POST helper for public job APIs such as MCP servers. It keeps
// fetcher failures isolated so one unavailable source never stops a run.
export async function safePostJson(url, body, headers = {}) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...headers,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`[fetchers] ${url} returned status ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[fetchers] request to ${url} failed: ${err.message}`);
    return null;
  }
}
