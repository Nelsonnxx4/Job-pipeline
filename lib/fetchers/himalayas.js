// himalayas.js
// Public jobs API, no key required. Targeted searches make internships and
// Nigeria/worldwide-eligible remote roles discoverable instead of relying on
// the generic feed's small first page.

import { safeGet, makeJob } from "./base.js";

const API_URL = "https://himalayas.app/jobs/api/search";
const WEB_SEARCHES = ["web developer", "frontend developer", "full stack developer"];

function toIsoDate(value) {
  if (!value) return "";
  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 1_000_000_000) {
    return new Date(numericValue * 1000).toISOString();
  }
  return value;
}

export async function fetchHimalayas() {
  const jobs = [];
  const seen = new Set();
  const searches = [
    ...WEB_SEARCHES.flatMap((q) => [
      { q, country: "Nigeria", sort: "recent" },
      { q, worldwide: "true", sort: "recent" },
    ]),
    ...[
      "web developer",
      "frontend developer",
      "full stack developer",
      "software engineering",
    ].flatMap((q) => [
      { q, country: "Nigeria", employment_type: "Intern", sort: "recent" },
      { q, worldwide: "true", employment_type: "Intern", sort: "recent" },
    ]),
  ];

  for (const params of searches) {
    const res = await safeGet(API_URL, params);
    if (!res) continue;
    const data = await res.json();
    for (const item of data.jobs || []) {
      const link = item.applicationLink || item.guid || "";
      if (!link || seen.has(link)) continue;
      seen.add(link);
      const locations = (item.locationRestrictions || [])
        .map((location) => location.name || location)
        .filter(Boolean);
      jobs.push(makeJob({
        title: item.title || "",
        company: item.companyName || "",
        location: locations.length ? locations.join(", ") : "Worldwide",
        employmentType: item.employmentType || "",
        postedAt: toIsoDate(item.pubDate || item.publicationDate || item.publishedAt || item.createdAt),
        isPaid: Boolean(item.minSalary || item.maxSalary),
        link,
        description: item.description || item.excerpt || "",
        source: "himalayas",
      }));
    }
  }
  return jobs;
}
