export function calculateNoShowRate(
  registrations: number | null,
  attendees: number | null,
) {
  if (
    registrations === null ||
    attendees === null ||
    !Number.isFinite(registrations) ||
    !Number.isFinite(attendees) ||
    registrations <= 0 ||
    attendees < 0
  ) {
    return null;
  }

  const rate = ((registrations - attendees) / registrations) * 100;

  return Math.round(Math.max(0, rate) * 10) / 10;
}

export function formatNoShowRate(rate: number | null) {
  if (rate === null) {
    return "Noch nicht berechenbar";
  }

  return `${rate.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}
