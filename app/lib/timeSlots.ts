
export function getTimeSlotsForDate(dateStr: string, schedule: Record<string, { open: string; close: string; closed: boolean }>, interval: number): string[] {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const date = new Date(dateStr + 'T00:00:00');
    const dayName = days[date.getDay()];

    const daySchedule = schedule[dayName];
    if (!daySchedule || daySchedule.closed) return [];

    const slots: string[] = [];
    const [openH, openM] = daySchedule.open.split(':').map(Number);
    const [closeH, closeM] = daySchedule.close.split(':').map(Number);

    let current = new Date(2000, 0, 1, openH, openM);
    const end = new Date(2000, 0, 1, closeH, closeM);

    while (current < end) {
        const h = String(current.getHours()).padStart(2, '0');
        const m = String(current.getMinutes()).padStart(2, '0');
        slots.push(`${h}:${m}`);
        current.setMinutes(current.getMinutes() + interval);
    }

    return slots;
}
