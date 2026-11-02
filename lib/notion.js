// Optional Notion application tracker. A record is created only after an
// application is sent or marked applied, then the same record is updated as
// its outcome changes. Missing Notion configuration is deliberately a no-op.

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2026-03-11";

const PROPERTY_ALIASES = {
  title: ["job", "role", "role title", "position", "name"],
  position: ["position", "job", "role", "role title"],
  link: ["job link", "job url", "link", "application link", "url"],
  company: ["company"],
  status: ["status", "stage"],
  outcome: ["outcome", "response"],
  responseDate: ["response date"],
  appliedAt: ["applied on", "application date", "applied date", "apply date"],
  location: ["location", "country/remote"],
  employmentType: ["employment type", "type"],
  matchScore: ["match score", "score"],
  source: ["source"],
};

let cachedSchema = null;

function config() {
  const token = process.env.NOTION_API_KEY;
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
  return token && dataSourceId ? { token, dataSourceId } : null;
}

function normaliseName(value) {
  return String(value || "").trim().toLowerCase();
}

function clippedText(value, max = 2000) {
  return String(value || "").trim().slice(0, max);
}

function outcomeFor(status) {
  if (status === "Interview") return "Interview";
  if (status === "Rejected") return "Rejected";
  if (status === "No Response") return "No response";
  return "In progress";
}

async function notionRequest(path, options = {}) {
  const settings = config();
  if (!settings) return null;

  const response = await fetch(`${NOTION_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${settings.token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Notion returned status ${response.status}`);
  }
  return body;
}

function matchingProperty(schema, key, acceptedTypes, allowFirstMatch = false) {
  const aliases = PROPERTY_ALIASES[key] || [];
  const properties = Object.entries(schema.properties || {});
  const named = properties.find(
    ([name, property]) =>
      aliases.includes(normaliseName(name)) && acceptedTypes.includes(property.type),
  );
  return (
    named ||
    (allowFirstMatch
      ? properties.find(([, property]) => acceptedTypes.includes(property.type))
      : undefined)
  );
}

async function getSchema() {
  if (cachedSchema) return cachedSchema;
  const settings = config();
  if (!settings) return null;
  cachedSchema = await notionRequest(`/data_sources/${settings.dataSourceId}`);
  return cachedSchema;
}

function textProperty(type, content) {
  return { [type]: content ? [{ type: "text", text: { content } }] : [] };
}

function setProperty(properties, match, value) {
  if (!match || value === undefined || value === null || value === "") return;
  const [name, property] = match;
  if (property.type === "title" || property.type === "rich_text") {
    properties[name] = textProperty(property.type, clippedText(value));
  } else if (property.type === "url") {
    properties[name] = { url: value };
  } else if (property.type === "number") {
    properties[name] = { number: Number(value) };
  } else if (property.type === "date") {
    properties[name] = { date: { start: value } };
  } else if (property.type === "select" || property.type === "status") {
    properties[name] = { [property.type]: { name: value } };
  }
}

function propertiesFor(job, status, schema) {
  const properties = {};
  const titleProperty = matchingProperty(schema, "title", ["title"], true);
  const titleIsCompany = titleProperty &&
    PROPERTY_ALIASES.company.includes(normaliseName(titleProperty[0]));
  setProperty(
    properties,
    titleProperty,
    titleIsCompany ? job.company : job.title,
  );
  setProperty(
    properties,
    matchingProperty(schema, "position", ["rich_text", "select", "title"]),
    job.title,
  );
  setProperty(properties, matchingProperty(schema, "link", ["url"]), job.link);
  setProperty(properties, matchingProperty(schema, "company", ["rich_text", "title", "select"]), job.company);
  setProperty(properties, matchingProperty(schema, "status", ["select", "status"]), status);
  setProperty(
    properties,
    matchingProperty(schema, "outcome", ["select", "status"]),
    outcomeFor(status),
  );
  setProperty(
    properties,
    matchingProperty(schema, "appliedAt", ["date"]),
    job.appliedAt || new Date().toISOString().slice(0, 10),
  );
  if (["Interview", "Rejected", "No Response"].includes(status)) {
    setProperty(
      properties,
      matchingProperty(schema, "responseDate", ["date"]),
      job.responseAt || new Date().toISOString().slice(0, 10),
    );
  }
  setProperty(properties, matchingProperty(schema, "location", ["rich_text"]), job.location);
  setProperty(
    properties,
    matchingProperty(schema, "employmentType", ["rich_text", "select"]),
    job.employmentType,
  );
  setProperty(properties, matchingProperty(schema, "matchScore", ["number"]), job.matchScore);
  setProperty(properties, matchingProperty(schema, "source", ["rich_text", "select"]), job.source);
  return properties;
}

async function pageForLink(linkProperty, link) {
  const settings = config();
  if (!settings || !linkProperty || !link) return null;
  const [name] = linkProperty;
  const result = await notionRequest(`/data_sources/${settings.dataSourceId}/query`, {
    method: "POST",
    body: JSON.stringify({
      filter: { property: name, url: { equals: link } },
      page_size: 1,
    }),
  });
  return result.results?.[0] || null;
}

// Upserts an application. Set createIfMissing=false for outcome-only updates
// so dismissing an un-applied job cannot create a misleading tracker record.
export async function syncNotionApplication(job, status, { createIfMissing = false } = {}) {
  if (!config()) return { skipped: true, reason: "Notion is not configured" };
  if (!job?.link || !job?.title) {
    return { skipped: true, reason: "The job needs a title and application link" };
  }

  try {
    const schema = await getSchema();
    const titleProperty = matchingProperty(schema, "title", ["title"], true);
    const linkProperty = matchingProperty(schema, "link", ["url"]);
    if (!titleProperty || !linkProperty) {
      throw new Error(
        "Your Notion data source needs a title property (for example, Position) and a URL property named Job URL, Job link, or Link.",
      );
    }

    const existing = await pageForLink(linkProperty, job.link);
    const properties = propertiesFor(job, status, schema);

    if (existing) {
      await notionRequest(`/pages/${existing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ properties }),
      });
      return { updated: true };
    }
    if (!createIfMissing) return { skipped: true, reason: "No matching Notion application" };

    const settings = config();
    await notionRequest("/pages", {
      method: "POST",
      body: JSON.stringify({
        parent: { type: "data_source_id", data_source_id: settings.dataSourceId },
        properties,
      }),
    });
    return { created: true };
  } catch (err) {
    console.warn(`[notion] Could not sync ${job.title}: ${err.message}`);
    return { failed: true, error: err.message };
  }
}

export function notionJobFromSheet(row) {
  return {
    title: row["Role Title"] || "",
    company: row.Company || "",
    link: row.Link || "",
    location: row["Country/Remote"] || "",
    employmentType: row["Employment Type"] || "",
    matchScore: Number(row["Match Score"] || 0),
    appliedAt: new Date().toISOString().slice(0, 10),
  };
}
