const GEMINI_3_5_FLASH_LITE = 'gemini-3.5-flash-lite';
const GPT_5_4_MINI = 'gpt-5.4-mini';
const CLAUDE_SONNET_5 = 'claude-sonnet-5';

export const AI_MODELS = {
  gemini: GEMINI_3_5_FLASH_LITE,
  openaiArtistBio: GPT_5_4_MINI,
  openaiMatchScore: GPT_5_4_MINI,
  anthropicHeadfi: CLAUDE_SONNET_5,
  anthropicLyricsTranslate: CLAUDE_SONNET_5,
} as const;

export function resolveGeminiModel(): string {
  return AI_MODELS.gemini;
}

export function resolveOpenAIArtistBioModel(): string {
  return process.env.OPENAI_ARTIST_BIO_MODEL?.trim() || AI_MODELS.openaiArtistBio;
}

export function resolveOpenAIMatchScoreModel(): string {
  return process.env.OPENAI_MATCH_SCORE_MODEL?.trim() || AI_MODELS.openaiMatchScore;
}

export function resolveAnthropicHeadfiModel(): string {
  return process.env.ANTHROPIC_HEADFI_MODEL?.trim() || AI_MODELS.anthropicHeadfi;
}

export function resolveAnthropicLyricsTranslateModel(): string {
  return (
    process.env.ANTHROPIC_LYRICS_TRANSLATE_MODEL?.trim() ||
    process.env.ANTHROPIC_HEADFI_MODEL?.trim() ||
    AI_MODELS.anthropicLyricsTranslate
  );
}
