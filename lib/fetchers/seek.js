// seek.js
// SEEK's public, unauthenticated search API (same one the site's own frontend calls).
// Covers Australia and New Zealand, both on the eligible country list.

import { safeGet, makeJob } from "./base.js";

const API_URL = "https://www.seek.com.au/api/jobsearch/v5/search";

export async function fetchSeek(keywords = [
  "web developer",
  "web development internship",
  "frontend internship",
  "full stack internship",
]) {
  const jobs = [];
  const seen = new Set();
  for (const keyword of keywords) {
    const res = await safeGet(API_URL, {
      keywords: keyword,
      page: 1,
      classification: "6281", // Information & Communication Technology
    });
    if (!res) continue;

    const data = await res.json();
    for (const item of data.data || []) {
      const link = `https://www.seek.com.au/job/${item.id || ""}`;
      if (!item.id || seen.has(link)) continue;
      seen.add(link);
      jobs.push(makeJob({
        title: item.title || "",
        company: item.advertiser?.description || "",
        location: item.locations?.[0]?.label || "Australia",
        employmentType: item.workTypes?.[0] || "",
        postedAt: item.listingDate || item.createdAt || "",
			isPaid: Boolean(item.salary || item.salaryRange),
        link,
        description: item.teaser || "",
        source: "seek",
      }));
    }
  }
  return jobs;
}
