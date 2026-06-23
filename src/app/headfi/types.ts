/** FR 그래프 Gemini Vision 해석 (JSON으로 직렬화해 DB 저장) */
export type HeadfiFrInterpretation = {
  bass: string;
  mid: string;
  treble: string;
  summary: string;
};

/** DB/라이브러리 헤드파이 기기 (Supabase headfi 테이블) */
export interface Headfi {
  id: number;
  brand: string;
  model: string;
  category: string;
  type1: string | null;
  type2: string | null;
  impedance: number | null;
  db1: number | null;
  db2: number | null;
  volume: string | null;
  volume_type: string | null;
  purchase_date: string | null;
  price: number;
  status1: string | null;
  status2: string | null;
  cable: string | null;
  cable_price: number | null;
  unit: string | null;
  etc: string | null;
  matching: string | null;
  gain: string | null;
  temp: string | null;
  bright: string | null;
  bass_quantity?: number | null;
  bass_depth?: number | null;
  bass_speed?: number | null;
  dynamics_slam?: number | null;
  midrange_body?: number | null;
  tone_warmth?: number | null;
  vocal_position?: number | null;
  midrange_clarity?: number | null;
  treble_brightness?: number | null;
  treble_smoothness?: number | null;
  treble_airiness?: number | null;
  resolution?: number | null;
  separation?: number | null;
  soundstage?: number | null;
  imaging?: number | null;
  timbre?: number | null;
  ai_sound_analysis?: string | null;
  ai_recommended_album_ids?: number[] | null;
  ai_recommended_album_reason?: string | null;
  ai_recommended_genres?: string[] | null;
  ai_recommended_at?: string | null;
  /** 유선 헤드폰/이어폰 커뮤니티 기반 추천 장르(서술형, 최대 4개) */
  recommended_genres?: string[] | null;
  memo: string | null;
  image_url: string | null;
  /** 주파수 응답 그래프 이미지 URL (GEAR-007) */
  fr_graph_url?: string | null;
  /** FR 그래프 Gemini Vision 해석 JSON 문자열 (GEAR-008) */
  fr_interpretation?: string | null;
  /** DAC/AMP 전용 (GEAR-012) */
  amp_type?: string | null;
  /** Rk(Ω), DB 컬럼명 output_impedance */
  output_impedance?: number | null;
  chipset?: string | null;
  vrms_bal?: number | null;
  vrms_single?: number | null;
  created_at?: string;
  [key: string]: unknown;
}

/** 폼에서 액션으로 넘기는 데이터 (모든 필드 문자열) */
export interface HeadfiFormData {
  brand: string;
  model: string;
  category: string;
  type1: string;
  type2: string;
  impedance: string;
  db1: string;
  db2: string;
  volume: string;
  volume_type: string;
  purchase_date: string;
  price: string;
  status1: string;
  status2: string;
  cable: string;
  cable_price: string;
  unit: string;
  etc: string;
  matching: string;
  gain: string;
  temp: string;
  bright: string;
  bass_quantity: string;
  bass_depth: string;
  bass_speed: string;
  dynamics_slam: string;
  midrange_body: string;
  tone_warmth: string;
  vocal_position: string;
  midrange_clarity: string;
  treble_brightness: string;
  treble_smoothness: string;
  treble_airiness: string;
  resolution: string;
  separation: string;
  soundstage: string;
  imaging: string;
  timbre: string;
  memo: string;
  image_url: string;
  /** FR 그래프: Storage 공개 URL 또는 외부 이미지 URL (유선 헤드폰·이어폰만 폼에서 편집) */
  fr_graph_url: string;
  /** DAC/AMP 전용 (GEAR-012) */
  amp_type: string;
  output_impedance: string;
  chipset: string;
  vrms_bal: string;
  vrms_single: string;
}

/** 폼에 넘길 선택 기기 (DB 기기 수정 | 수동 등록) */
export type SelectedHeadfi = Headfi | { isManual: true };
