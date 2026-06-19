type ScheduledItem = {
  startTime: Date;
  endTime: Date;
  programItem: string;
};

export function compareRunOfShowItems(
  first: ScheduledItem,
  second: ScheduledItem,
) {
  const startDifference =
    first.startTime.getTime() - second.startTime.getTime();

  if (startDifference !== 0) {
    return startDifference;
  }

  const endDifference = first.endTime.getTime() - second.endTime.getTime();

  return endDifference !== 0
    ? endDifference
    : first.programItem.localeCompare(second.programItem, "de");
}

export function sortRunOfShowItems<T extends ScheduledItem>(items: T[]) {
  return [...items].sort(compareRunOfShowItems);
}

export function getRunOfShowDurationMinutes(
  item: Pick<ScheduledItem, "startTime" | "endTime">,
) {
  return Math.max(
    0,
    Math.round(
      (item.endTime.getTime() - item.startTime.getTime()) / (60 * 1000),
    ),
  );
}
