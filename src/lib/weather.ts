export type WeatherInfo = {
  temperature: number;
  condition: string;
  description: string;
};

export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherInfo | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const temp = Math.round(data.current?.temperature_2m ?? 0);
    const code = data.current?.weather_code ?? 0;

    const getCondition = (weatherCode: number): { condition: string; description: string } => {
      if (weatherCode === 0) return { condition: 'clear', description: '맑음' };
      if (weatherCode <= 2) return { condition: 'clear', description: '대체로 맑음' };
      if (weatherCode <= 3) return { condition: 'cloudy', description: '흐림' };
      if (weatherCode <= 49) return { condition: 'foggy', description: '안개' };
      if (weatherCode <= 59) return { condition: 'rainy', description: '이슬비' };
      if (weatherCode <= 69) return { condition: 'rainy', description: '비' };
      if (weatherCode <= 79) return { condition: 'snowy', description: '눈' };
      if (weatherCode <= 84) return { condition: 'rainy', description: '소나기' };
      if (weatherCode <= 99) return { condition: 'stormy', description: '뇌우' };
      return { condition: 'cloudy', description: '흐림' };
    };

    return { temperature: temp, ...getCondition(code) };
  } catch {
    return null;
  }
}
