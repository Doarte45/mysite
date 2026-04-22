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

export const cv: CV = {
  name: "Andrés Duarte Ornelas",
  role: "Cybersecurity Engineer",
  tagline:
    "Network defense, incident response, and offensive methodologies — building defense-in-depth from the wire up.",
  location: "Monterrey, MX",
  contact: [
    {
      label: "Email",
      value: "andresdornelas@gmail.com",
      href: "mailto:andresdornelas@gmail.com",
    },
    {
      label: "LinkedIn",
      value: "linkedin.com/in/andrés-d-950430240",
      href: "https://linkedin.com/in/andr%C3%A9s-d-950430240",
    },
    {
      label: "Location",
      value: "Monterrey, MX",
      href: "https://maps.google.com/?q=Monterrey,MX",
    },
  ],
  summary:
    "Cybersecurity engineer with hands-on experience designing segmented networks, performing vulnerability assessments, and building security policy frameworks. Currently pursuing dual master's degrees at UTSA and ITESM, building on a foundation in electronics engineering with a focus on SOC operations, network architecture, and red team techniques.",
  experience: [
    {
      role: "Cybersecurity Trainee",
      company: "Dipole Digital",
      location: "Monterrey & Hermosillo, MX (Hybrid)",
      period: "August 2024 — December 2024",
      summary:
        "Hands-on security work across risk evaluation, network architecture, and policy.",
      highlights: [
        "Evaluated risks in production environments and developed tailored mitigation solutions.",
        "Designed and implemented a segmented office network using VLANs with a DMZ for internet-facing services.",
        "Configured traffic rules to control inter-segment communication and harden the network perimeter.",
        "Performed web vulnerability scanning with Zed Attack Proxy (ZAP) to identify and remediate threats.",
        "Assisted in creating and rolling out the company-wide cybersecurity policy framework.",
        "Gained hands-on experience in security incident management and response.",
      ],
    },
    {
      role: "Cybersecurity Engineering Intern",
      company: "Dipole Digital",
      location: "Monterrey, MX (Remote)",
      period: "March 2024 — June 2024",
      summary:
        "Vulnerability assessments and system hardening across client environments.",
      highlights: [
        "Conducted comprehensive vulnerability assessments and implemented system hardening strategies.",
        "Documented security findings and provided actionable recommendations to enhance cybersecurity posture.",
      ],
    },
  ],
  projects: [
    {
      name: "Digital Forensic Investigation — “Posthumous Digital Note” Case",
      year: "2025",
      description:
        "Comprehensive digital forensic analysis of a suspicious-death case: analyzed disk images, RAM dumps, and Windows event logs to reconstruct a timeline and establish evidence of third-party involvement. Documented full chain of custody following ISO/IEC 27037 and NIST SP 800-86.",
      stack: ["Autopsy / Sleuth Kit", "Volatility", "Registry Explorer"],
    },
    {
      name: "Cloud-as-a-Service Commercial & Operative Design",
      year: "2023",
      description:
        "Designed a multi-cloud service architecture across AWS, Azure, and Google Cloud for the company Quanti, plus the commercial strategy and operational framework for delivery.",
      stack: ["AWS", "Azure", "Google Cloud"],
    },
  ],
  skills: [
    {
      heading: "Cybersecurity",
      items: [
        "Network security architecture",
        "Vulnerability assessment",
        "Incident response",
        "Security policy development",
        "VLAN segmentation",
        "DMZ configuration",
      ],
    },
    {
      heading: "Security Tools",
      items: [
        "Security Onion",
        "ELK Stack",
        "Zed Attack Proxy (ZAP)",
        "Cisco Packet Tracer",
        "Nessus (Basic)",
      ],
    },
    {
      heading: "Forensic Tools",
      items: ["Autopsy / Sleuth Kit", "Volatility"],
    },
    {
      heading: "Networking",
      items: ["Fortinet", "Cisco", "Mikrotik", "TP-Link"],
    },
    {
      heading: "Programming & Scripting",
      items: ["MATLAB (Intermediate)", "Python (Basic)", "C (Basic)"],
    },
    {
      heading: "Operating Systems",
      items: ["Linux (Intermediate)", "Windows"],
    },
    {
      heading: "Languages",
      items: ["Spanish (Native)", "English (Advanced)"],
    },
  ],
  education: [
    {
      degree: "M.S. in Information Technology, Cybersecurity Concentration",
      institution: "University of Texas at San Antonio (UTSA)",
      period: "Expected May 2026",
      detail:
        "Part of the UTSA-ITESM Dual Degree Program. Currently enrolled in Fall 2025 core courses.",
    },
    {
      degree: "Master's in Cybersecurity",
      institution: "Monterrey Institute of Technology (ITESM)",
      period: "Expected December 2026",
    },
    {
      degree:
        "B.Sc. in Electronics Engineering, Specialization in Cybersecurity",
      institution: "Monterrey Institute of Technology (ITESM)",
      period: "Graduated June 2024",
    },
  ],
  certifications: [
    {
      name: "Cisco CyberOps Associate",
      issuer: "Cisco Networking Academy",
      date: "November 2023",
      detail:
        "Security Operations: intrusion detection, analysis, and network monitoring. Completed 52 hands-on labs (30+ hours) across Security Onion, ELK Stack, and Cisco Packet Tracer.",
    },
  ],
};
