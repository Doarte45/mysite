export interface ContactLink {
  readonly label: string;
  readonly value: string;
  readonly href: string;
}

export interface Experience {
  readonly role: string;
  readonly company: string;
  readonly location: string;
  readonly period: string;
  readonly summary: string;
  readonly highlights: readonly string[];
}

export interface Metric {
  readonly value: string; // copied verbatim from the source, e.g. "~97%"
  readonly label: string; // e.g. "Effective fault resolution rate"
}

export interface Project {
  readonly name: string;
  readonly year: string;
  readonly description?: string;
  readonly highlights?: readonly string[];
  readonly stack: readonly string[];
  readonly url?: string;
  readonly featured?: boolean; // extracted by sync-cv; at most one project
  readonly metrics?: readonly Metric[]; // extracted by sync-cv; up to 4 headline numbers
}

export interface Education {
  readonly degree: string;
  readonly institution: string;
  readonly period: string;
  readonly detail?: string;
}

export interface Certification {
  readonly name: string;
  readonly issuer: string;
  readonly date: string;
  readonly detail?: string;
  readonly badgeId?: string; // Credly badge id; used to link to the verification page
  readonly badgeImage?: string; // Credly badge image URL; renders the badge graphic when present
}

export interface SkillGroup {
  readonly heading: string;
  readonly items: readonly string[];
}

export interface CV {
  readonly name: string;
  readonly role: string;
  readonly tagline: string;
  readonly location: string;
  // Site fields extracted by sync-cv (optional so older cv.json files still load).
  readonly targetRoles?: readonly string[];
  readonly relocation?: string;
  readonly availability?: string;
  readonly contact: readonly ContactLink[];
  readonly summary: string;
  readonly experience: readonly Experience[];
  readonly projects: readonly Project[];
  readonly skills: readonly SkillGroup[];
  readonly education: readonly Education[];
  readonly certifications: readonly Certification[];
}

import cvJson from './cv.json' with { type: 'json' };

export const cv: CV = cvJson as CV;
