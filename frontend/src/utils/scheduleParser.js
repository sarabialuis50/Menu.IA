export function parseBusinessSchedule(horarios, isOpenOverride = true) {
    // If manual override says closed, it's closed.
    if (!isOpenOverride) {
        return { isClosed: true, nextOpenTime: null, overridesClosed: true, parsedSchedule: null };
    }

    // If no horarios defined, assume open
    if (!horarios) return { isClosed: false, nextOpenTime: null, parsedSchedule: null };

    let schedule = horarios;
    if (typeof horarios === 'string') {
        if (horarios.trim().startsWith('{')) {
            try {
                schedule = JSON.parse(horarios);
            } catch (e) {
                return { isClosed: false, nextOpenTime: null, parsedSchedule: null }; // Invalid JSON
            }
        } else {
            // Just a string, we can't parse easily without days, assume open
            return { isClosed: false, nextOpenTime: null, parsedSchedule: null };
        }
    }

    if (typeof schedule !== 'object' || schedule === null) {
        return { isClosed: false, nextOpenTime: null, parsedSchedule: null };
    }

    const now = new Date();
    // For standard JS Date, 0 is Sunday, 1 is Monday ... 6 is Saturday
    const today = now.getDay();

    // Determine today's schedule string
    let todayScheduleStr = '';
    if (today >= 1 && today <= 5) { // Lunes a Viernes
        todayScheduleStr = schedule.semana || schedule.week || '';
    } else if (today === 6) { // Sabados
        todayScheduleStr = schedule.sabado || schedule.saturday || schedule.semana || '';
    } else if (today === 0) { // Domingos y festivos
        todayScheduleStr = schedule.domingos || schedule.sunday || schedule.fines || schedule.weekend || schedule.semana || '';
    }

    if (!todayScheduleStr) {
        return { isClosed: false, nextOpenTime: null, parsedSchedule: schedule }; // Default to open if not defined
    }

    if (todayScheduleStr.toLowerCase().includes('cerrado') || todayScheduleStr.toLowerCase().includes('festivo solo')) {
        return { isClosed: true, nextOpenTime: null, parsedSchedule: schedule, todayScheduleStr };
    }

    // Parse time range: e.g., "12:00 PM - 17:00 PM", "11:00 AM - 11:00 PM"
    // We'll split by '-' or 'a' or 'to'
    const timeParts = todayScheduleStr.toLowerCase().split(/\s*-\s*|\s+a\s+|\s+to\s+/);
    if (timeParts.length !== 2) {
        return { isClosed: false, nextOpenTime: null, parsedSchedule: schedule }; // Cannot parse, default to open
    }

    const parseTimeStr = (timeStr, baseDate) => {
        try {
            let t = timeStr.trim().replace(/\./g, ''); // replace p.m. with pm
            let isPM = t.includes('pm') || t.includes('p');
            let isAM = t.includes('am') || t.includes('a');
            t = t.replace(/[a-z]/g, '').trim(); // Remove letters

            let [hoursStr, minutesStr] = t.split(':');
            let hours = parseInt(hoursStr, 10);
            let minutes = parseInt(minutesStr || '0', 10);

            if (isNaN(hours) || isNaN(minutes)) return null;

            // Handle AM/PM logic
            if (isPM && hours < 12) hours += 12;
            if (isAM && hours === 12) hours = 0; // 12 AM is 00:00

            const d = new Date(baseDate);
            d.setHours(hours, minutes, 0, 0);
            return d;
        } catch {
            return null;
        }
    };

    const openTime = parseTimeStr(timeParts[0], now);
    const closeTime = parseTimeStr(timeParts[1], now);

    if (!openTime || !closeTime) {
        return { isClosed: false, nextOpenTime: null, parsedSchedule: schedule };
    }

    // If closeTime is before or equal openTime, assume the store runs past midnight (e.g. 10PM - 2AM)
    if (closeTime <= openTime) {
        closeTime.setDate(closeTime.getDate() + 1);
    }

    // If we are currently BEFORE openTime today but wait, if it's currently 1 AM and the store closes at 2 AM
    // from yesterday's schedule, we might be inside the window!
    // To handle this strictly, we would have to evaluate yesterday's schedule.
    // For simplicity, we just check if now is between openTime and closeTime assuming we crossed midnight.
    let isOpen = now >= openTime && now <= closeTime;

    // Quick fix for the "now is 1AM, yesterday closed at 2AM" issue.
    // If we are before open time today, shift both open and close 24 hours back and see if we are in that window.
    if (now < openTime) {
        const yesterdayOpen = new Date(openTime.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayClose = new Date(closeTime.getTime() - 24 * 60 * 60 * 1000);
        if (now >= yesterdayOpen && now <= yesterdayClose) {
            isOpen = true; // Still open from yesterday
        }
    }

    let nextOpenTime = null;
    if (!isOpen) {
        if (now < openTime) {
            nextOpenTime = openTime; // Will open later today
        } else {
            // Will open tomorrow
            nextOpenTime = new Date(openTime);
            nextOpenTime.setDate(nextOpenTime.getDate() + 1);
        }
    }

    return {
        isClosed: !isOpen,
        nextOpenTime,
        parsedSchedule: schedule,
        todayScheduleStr
    };
}
