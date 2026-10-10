export const workPackageOptions = [
  "PROGRAM",
  "LOCATION_CATERING",
  "COMMUNICATION",
  "PARTNERS_SPONSORS",
  "TECHNOLOGY_MATERIAL",
  "PARTICIPANT_MANAGEMENT",
  "LEGACY_SPEAKERS_PARTNERS",
] as const;

const labels: Record<string, string> = {
  PROGRAM: "Programm / Speaker",
  LOCATION_CATERING: "Location & Catering",
  COMMUNICATION: "Kommunikation",
  PARTNERS_SPONSORS: "Partner & Sponsoren",
  TECHNOLOGY_MATERIAL: "Technik & Material",
  PARTICIPANT_MANAGEMENT: "Teilnehmermanagement",
  LEGACY_SPEAKERS_PARTNERS: "Speaker & Partner – Zuordnung prüfen",
};

export function getWorkPackageLabel(value: string | null | undefined) {
  return value ? (labels[value] ?? value) : "Nicht zugeordnet";
}
