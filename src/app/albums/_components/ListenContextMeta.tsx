import { formatListenContextMeta, type ListenContextFields } from '@/lib/listenContextDisplay';

type ListenContextMetaProps = ListenContextFields & {
  className?: string;
};

export function ListenContextMeta({
  captured_at,
  weather_condition,
  temperature,
  className = 'mt-0.5 text-xs tabular-nums opacity-55',
}: ListenContextMetaProps) {
  const text = formatListenContextMeta({ captured_at, weather_condition, temperature });
  if (!text) return null;
  return <p className={className}>{text}</p>;
}
