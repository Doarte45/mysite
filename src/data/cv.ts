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

export interface Project {
  readonly name: string;
  readonly year: string;
  readonly description: string;
  readonly stack: readonly string[];
  readonly url?: string;
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
