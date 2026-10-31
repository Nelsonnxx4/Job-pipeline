// remoteok.js
// Public API, no key required. https://remoteok.com/api
// Keep request frequency reasonable (a few times a day) per their ask.

import { safeGet, makeJob } from "./base.js";

const API_URL = "https://remoteok.com/api";

export async function fetchRemoteOK() {
  const jobs = [];
  const seen = new Set();
  // The unfiltered feed keeps the existing broad coverage. The tag requests
  // explicitly surface internship listings that might otherwise be buried.
  for (const params of [{}, { tag: "intern" }, { tag: "internship" }]) {
    const res = await safeGet(API_URL, params);
    if (!res) continue;
    const data = await res.json();
    // First item is a legal/metadata notice, not a job. Skip it.
    for (const item of data.slice(1)) {
      if (!item || !item.position || seen.has(item.url)) continue;
      seen.add(item.url);
      jobs.push(makeJob({
        title: item.position || "",
        company: item.company || "",
        location: item.location || "Worldwide",
        employmentType: item.tags?.includes("intern") ? "Internship" : "",
        postedAt: item.date || (item.epoch ? new Date(item.epoch * 1000).toISOString() : ""),
			isPaid: Boolean(item.salary_min || item.salary_max || item.salary),
        link: item.url || "",
        description: item.description || "",
        source: "remoteok",
      }));
    }
  }
  return jobs;
}
