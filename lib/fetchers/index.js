// index.js
// Runs every source fetcher and returns one combined list. Each fetcher is
// isolated: if one source fails (API down, format changed), the others
// still run. Failures are logged, not thrown, so a daily run never dies
// partway through because of one broken source.

import { fetchRemotive } from "./remotive.js";
import { fetchWeWorkRemotely } from "./weworkremotely.js";
import { fetchHimalayas } from "./himalayas.js";
import { fetchRemoteOK } from "./remoteok.js";
import { fetchGreenhouse } from "./greenhouse.js";
import { fetchLever } from "./lever.js";
import { fetchAshby } from "./ashby.js";
import { fetchBambooHR } from "./bamboohr.js";
import { fetchSeek } from "./seek.js";
import { fetchLeep } from "./leep.js";
import { fetchHiringCafe } from "./hiringcafe.js";

const ALL_FETCHERS = {
  remotive: fetchRemotive,
  weworkremotely: fetchWeWorkRemotely,
  himalayas: fetchHimalayas,
  remoteok: fetchRemoteOK,
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
  bamboohr: fetchBambooHR,
  seek: fetchSeek,
  leep: fetchLeep,
  hiringcafe: fetchHiringCafe,
};

export async function fetchAllJobsWithStats() {
  let allJobs = [];
  const sources = {};
  for (const [name, fetchFn] of Object.entries(ALL_FETCHERS)) {
    try {
      const jobs = await fetchFn();
      console.log(`[fetchers] ${name}: ${jobs.length} jobs`);
      sources[name] = { count: jobs.length };
      allJobs = allJobs.concat(jobs);
    } catch (err) {
      console.warn(`[fetchers] ${name} FAILED: ${err.message}`);
      sources[name] = { count: 0, error: err.message };
    }
  }
  return { jobs: allJobs, sources };
}

// Keep the original array-returning helper for callers that do not need a
// per-source report.
export async function fetchAllJobs() {
  const { jobs } = await fetchAllJobsWithStats();
  return jobs;
}
