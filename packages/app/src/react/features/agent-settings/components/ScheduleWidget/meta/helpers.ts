import cronstrue from 'cronstrue';

export function extractTimeZoneOffset(timeZoneStr) {
  const matches = timeZoneStr.match(/GMT([+-]\d{2}:\d{2})/);
  if (!matches) {
    throw new Error('Invalid time zone string format.');
  }
  const [hours, minutes] = matches[1].split(':').map((num) => parseInt(num, 10));
  return hours * 60 + Math.sign(hours) * minutes; // Convert to total minutes
}

export const calculateDelay = (targetTimeIso: string): number => {
  const targetTime = new Date(targetTimeIso).getTime(); // Convert target time from ISO string to timestamp
  const currentTime = Date.now(); // Get current time as a timestamp
  const delay = targetTime - currentTime; // Calculate delay

  return delay > 0 ? delay : 0; // Return the delay if it's in the future, otherwise return 0
};
export function timeAgo(date: Date): string {
  const dateNum = date.getTime();
  const now = new Date().getTime();
  const secondsAgo = Math.round((now - dateNum) / 1000);
  const minutesAgo = Math.round(secondsAgo / 60);
  const hoursAgo = Math.round(minutesAgo / 60);
  const daysAgo = Math.round(hoursAgo / 24);
  const monthsAgo = Math.round(daysAgo / 30);
  const yearsAgo = Math.round(daysAgo / 365);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (secondsAgo < 60) {
    return rtf.format(-secondsAgo, 'second');
  } else if (minutesAgo < 60) {
    return rtf.format(-minutesAgo, 'minute');
  } else if (hoursAgo < 24) {
    return rtf.format(-hoursAgo, 'hour');
  } else if (daysAgo < 30) {
    return rtf.format(-daysAgo, 'day');
  } else if (monthsAgo < 12) {
    return rtf.format(-monthsAgo, 'month');
  } else {
    return rtf.format(-yearsAgo, 'year');
  }
}

export function timeAfter(date: Date): string {
  const dateNum = date.getTime();
  const now = new Date().getTime();
  const secondsAfter = Math.round((dateNum - now) / 1000);
  const minutesAfter = Math.round(secondsAfter / 60);
  const hoursAfter = Math.round(minutesAfter / 60);
  const daysAfter = Math.round(hoursAfter / 24);
  const monthsAfter = Math.round(daysAfter / 30);
  const yearsAfter = Math.round(daysAfter / 365);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (secondsAfter < 60) {
    return rtf.format(secondsAfter, 'second');
  } else if (minutesAfter < 60) {
    return rtf.format(minutesAfter, 'minute');
  } else if (hoursAfter < 24) {
    return rtf.format(hoursAfter, 'hour');
  } else if (daysAfter < 30) {
    return rtf.format(daysAfter, 'day');
  } else if (monthsAfter < 12) {
    return rtf.format(monthsAfter, 'month');
  } else {
    return rtf.format(yearsAfter, 'year');
  }
}

export function getCronReadableStr(cronExpression: string, inLocalTime?: boolean): string {
  return cronstrue.toString(cronExpression, {
    // note: tzOffset is in hours, so we need to convert minutes to hours. also it is sign sensitive
    tzOffset: inLocalTime ? -new Date().getTimezoneOffset() / 60 : 0,
  });
}
