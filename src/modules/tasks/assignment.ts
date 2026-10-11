export function getDistinctReviewerId(
  preferredId: string | null,
  responsibleUserId: string | null,
  candidates: Array<{ id: string }>,
) {
  if (!preferredId) return null;
  if (preferredId !== responsibleUserId) return preferredId;
  return candidates.find((user) => user.id !== responsibleUserId)?.id ?? null;
}
