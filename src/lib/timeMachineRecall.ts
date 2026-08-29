export type TimeMachinePeriod = '1y' | '6m' | '3m' | '1m';

export type TimeMachinePeriodConfig = {
  key: TimeMachinePeriod;
  months: number;
  label: string;
};

export const TIME_MACHINE_PERIODS_OLDEST_FIRST: TimeMachinePeriodConfig[] = [
  { key: '1y', months: 12, label: '1년' },
  { key: '6m', months: 6, label: '6개월' },
  { key: '3m', months: 3, label: '3개월' },
  { key: '1m', months: 1, label: '1개월' },
];

export type TimeMachineDateWindow = TimeMachinePeriodConfig & {
  start: string;
  end: string;
};

export type TimeMachineRecall = {
  period: TimeMachinePeriod;
  periodLabel: string;
  historyId: number;
  albumId: number;
  albumName: string;
  artist: string | null;
  coverImageUrl: string | null;
  capturedAt: string | null;
  weatherCondition: string | null;
  temperature: number | null;
  gearLabel: string | null;
};

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildTimeMachineWindows(referenceDate = new Date()): TimeMachineDateWindow[] {
  return TIME_MACHINE_PERIODS_OLDEST_FIRST.map((period) => {
    const target = new Date(referenceDate);
    target.setMonth(target.getMonth() - period.months);
    const start = new Date(target);
    start.setDate(start.getDate() - 3);
    const end = new Date(target);
    end.setDate(end.getDate() + 3);
    return {
      ...period,
      start: formatLocalDate(start),
      end: formatLocalDate(end),
    };
  });
}

export function isDateInWindow(date: string, window: Pick<TimeMachineDateWindow, 'start' | 'end'>): boolean {
  const day = date.slice(0, 10);
  return day >= window.start && day <= window.end;
}

export function pickRandomItem<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? null;
}

function timeOfDayLabel(capturedAt: string): string | null {
  const date = new Date(capturedAt);
  if (!Number.isFinite(date.getTime())) return null;
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return '오전';
  if (hour >= 12 && hour < 17) return '오후';
  if (hour >= 17 && hour < 21) return '저녁';
  if (hour >= 21) return '밤';
  return '새벽';
}

function weatherPhrase(condition: string): string {
  if (condition.includes('비') || condition.includes('소나기') || condition.includes('이슬')) return '비 오던';
  if (condition.includes('눈')) return '눈 내리던';
  if (condition.includes('흐림') || condition.includes('안개')) return '흐리던';
  if (condition.includes('뇌')) return '천둥치던';
  return `${condition}이던`;
}

function buildContextPhrase(recall: Pick<TimeMachineRecall, 'capturedAt' | 'weatherCondition' | 'temperature'>): string | null {
  const time = recall.capturedAt ? timeOfDayLabel(recall.capturedAt) : null;
  const weather = recall.weatherCondition?.trim();
  const temp =
    recall.temperature != null && Number.isFinite(recall.temperature) ? `${recall.temperature}°C` : null;

  if (weather && time) {
    const tempSuffix = temp ? ` ${temp}` : '';
    return `${weatherPhrase(weather)} ${time}${tempSuffix}에`;
  }
  if (weather) {
    const tempSuffix = temp ? ` ${temp}` : '';
    return `${weatherPhrase(weather)}${tempSuffix}에`;
  }
  if (time) {
    const tempSuffix = temp ? ` ${temp}` : '';
    return `${time}${tempSuffix}에`;
  }
  if (temp) return `${temp}에`;
  return null;
}

export function buildTimeMachineRecallMessage(recall: TimeMachineRecall): string {
  const head = `${recall.periodLabel} 전 오늘`;
  const context = buildContextPhrase(recall);
  const gear = recall.gearLabel ? `${recall.gearLabel}으로 ` : '';

  if (context && gear) return `${head}, ${context} ${gear}들었던 앨범`;
  if (context) return `${head}, ${context} 들었던 앨범`;
  if (gear) return `${head}, ${gear}들었던 앨범`;
  return `${head} 들었던 앨범`;
}
