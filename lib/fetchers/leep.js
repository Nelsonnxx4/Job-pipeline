// LEEP is Nigeria's government job portal. Its public listing pages include
// job type, location and a relative posting date on each detail page.

import { safeGet, makeJob } from "./base.js";

const LIST_URL = "https://jobs.leep.gov.ng/jobs";
const BASE_URL = "https://jobs.leep.gov.ng";

function textFromHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function relativeDateToIso(text) {
  const match = text.match(/Job Posted:\s*(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/i);
  if (!match) return "";
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const date = new Date();
  const offsets = {
    minute: () => date.setMinutes(date.getMinutes() - value),
    hour: () => date.setHours(date.getHours() - value),
    day: () => date.setDate(date.getDate() - value),
    week: () => date.setDate(date.getDate() - value * 7),
    month: () => date.setMonth(date.getMonth() - value),
    year: () => date.setFullYear(date.getFullYear() - value),
  };
  offsets[unit]();
  return date.toISOString();
}

function valueAfter(text, label, nextLabel) {
  const match = text.match(new RegExp(`${label}\\s+([\\s\\S]*?)(?=\\s+${nextLabel}\\b)`, "i"));
  return match ? match[1].trim() : "";
}

function isAbujaLocation(location) {
  return /\b(abuja|fct|federal capital territory)\b/i.test(location);
}

export async function fetchLeep() {
  const res = await safeGet(LIST_URL);
  if (!res) return [];
  const html = await res.text();
  const paths = [...new Set(
    [...html.matchAll(/href=["']([^"']*\/job\/[^"'#?]+)["']/gi)]
      .map((match) => match[1])
      .slice(0, 25),
  )];
  const jobs = [];

  for (const path of paths) {
    const link = path.startsWith("http") ? path : `${BASE_URL}${path}`;
    const jobRes = await safeGet(link);
    if (!jobRes) continue;
    const detailHtml = await jobRes.text();
    const text = textFromHtml(detailHtml);
    const title = (detailHtml.match(/<title>\s*([^<|]+?)\s*-\s*LEEP Jobs/i) || [])[1]?.trim() || "";
    const employmentType = valueAfter(text, "Job Type", "Job Role");
    const location = valueAfter(text, "Location", "Job Overview");
    // Keep remote Nigerian roles and in-office roles based in Abuja/FCT.
    // Other local jobs remain outside this pipeline's search preference.
    if (!/remote/i.test(employmentType) && !isAbujaLocation(location)) continue;
    const postedAt = relativeDateToIso(text);
    if (!title || !postedAt) continue;

    jobs.push(makeJob({
      title,
      company: "LEEP",
      location: location || "Remote, Nigeria",
      employmentType,
      postedAt,
      isPaid: /Salary\s+(?!Competitive|Not Disclosed)/i.test(text),
      link,
      description: text,
      source: "leep",
    }));
  }
  return jobs;
}
