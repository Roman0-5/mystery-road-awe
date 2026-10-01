export interface Evidence {
  id: string;
  title: string;
  personIds?: string[];
  bookmarked?: boolean;
  status?: string;
  relevance?: string;
}

export interface Person {
  id: string;
  name: string;
}

export interface Location {
  id: string;
}

export interface TimelineEvent {
  id: string;
}

export type PeopleTab = "people" | "locations";