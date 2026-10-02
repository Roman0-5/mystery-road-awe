// Domain model. Shapes mirror public/data/*.json.

// The workflow values are a closed set. The JSON is not consistent about their casing
// ("Reviewed", "Unknown"), so loadEvidence() in data.ts normalises them to lowercase.
export type EvidenceStatus = "unreviewed" | "reviewed" | "flagged";
export type EvidenceRelevance = "unknown" | "relevant" | "irrelevant";

export interface Evidence {
  id: string; // "E01"
  type: string; // open set, lowercase after normalisation, e.g. "test-report"
  title: string;
  timestamp: string; // ISO 8601 UTC, always a string, never a Date
  summary: string;
  content: string;
  personIds: string[]; // Person.id, never display names
  locationIds: string[]; // Location.id
  tags: string[];
  status: EvidenceStatus;
  relevance: EvidenceRelevance;
}

export interface Person {
  id: string; // slug, e.g. "patch-vector"
  name: string;
  role: string;
  speciality: string;
  responsibilities: string[];
  statement: string;
  background: string;
  avatar: string; // path relative to the site root
}

export interface Location {
  id: string; // "L01"
  name: string;
  description: string;
  contains: string[];
}

export type TimelineEventType =
  | "report"
  | "decision"
  | "release"
  | "access"
  | "communication"
  | "software-change"
  | "observation"
  | "maintenance"
  | "infrastructure"
  | "system"
  | "incident";

export type Certainty = "confirmed" | "reported" | "contradictory";

export interface TimelineEvent {
  id: string; // "T01"
  time: string; // ISO 8601 UTC (note: evidence uses "timestamp", timeline uses "time")
  title: string;
  description: string;
  type: TimelineEventType;
  certainty: Certainty;
  personIds: string[];
  locationIds: string[];
  evidenceIds: string[];
}

export interface CaseData {
  caseId: string;
  title: string;
  subtitle: string;
  status: string;
  opened: string; // "YYYY-MM-DD"
  summary: string;
  location: string;
  leadInvestigator: string;
  notes: string;
}

export type PeopleTab = "people" | "locations";
