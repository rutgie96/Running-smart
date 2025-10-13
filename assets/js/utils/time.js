export function startOfWeek(date) {
  const temp = new Date(date);
  const day = temp.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  temp.setDate(temp.getDate() + diff);
  temp.setHours(0, 0, 0, 0);
  return temp;
}

export function isSameWeek(dateA, dateB) {
  const startA = startOfWeek(dateA);
  const startB = startOfWeek(dateB);
  return startA.getTime() === startB.getTime();
}
