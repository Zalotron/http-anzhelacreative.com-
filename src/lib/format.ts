const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function formatMonth(value: string | null): string {
  if (!value) return 'Actualidad';
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  return `${MONTHS_ES[month - 1]} ${year}`;
}

export function formatRange(start: string, end: string | null): string {
  return `${formatMonth(start)} — ${formatMonth(end)}`;
}

export function durationLabel(start: string, end: string | null): string {
  const [sy, sm] = start.split('-').map(Number);
  const endDate = end ? end.split('-').map(Number) : null;
  const ey = endDate ? endDate[0] : new Date().getFullYear();
  const em = endDate ? endDate[1] : new Date().getMonth() + 1;
  const totalMonths = (ey - sy) * 12 + (em - sm) + 1;
  if (totalMonths < 1) return '';
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  if (parts.length === 0) return '< 1 mes';
  return parts.join(' y ');
}

export function pad(n: number, width = 2): string {
  return n.toString().padStart(width, '0');
}
