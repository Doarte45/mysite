export interface StyleEntry {
  readonly slug: string;
  readonly name: string;
  readonly blurb: string;
}

/** The five candidate visual directions, plus the current design at the root. */
export const styles: readonly StyleEntry[] = [
  { slug: "", name: "Topology (current)", blurb: "The live design" },
  { slug: "terminal", name: "01 · Terminal", blurb: "Phosphor TTY session" },
  { slug: "soc", name: "02 · SOC Console", blurb: "Ops dashboard tiles" },
  { slug: "pcap", name: "03 · Packet Capture", blurb: "Wireshark-style frames" },
  { slug: "blueprint", name: "04 · Blueprint", blurb: "Network schematic" },
  { slug: "dossier", name: "05 · Dossier", blurb: "Classified case file" },
];

export function styleHref(slug: string): string {
  const base = import.meta.env.BASE_URL;
  const path = slug ? `${base}/styles/${slug}/` : `${base}/`;
  return path.replace(/\/+/g, "/");
}
