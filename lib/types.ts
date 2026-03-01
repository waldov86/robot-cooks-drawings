export type Orientation = 'portrait' | 'landscape';

export const PRESET_VALUES = ['coloring_book', 'story_sketch', 'activity_dots'] as const;
export type Preset = typeof PRESET_VALUES[number];
export function isPreset(x: unknown): x is Preset {
  return PRESET_VALUES.includes(x as Preset);
}

export interface GenerateRequest {
  prompt: string;
  preset: Preset;
  orientation: Orientation;
  margin_mm: number;
  line_weight_mm: number;
}

export type GenerateArtifact =
  | { kind: 'svg';   svg: string }
  | { kind: 'image'; imageBase64: string; mimeType: 'image/png' };

export interface GenerateResponse {
  artifact: GenerateArtifact;
}

export interface SaveRequest {
  title: string;
  prompt: string;
  svg?: string;          // activity_dots preset
  imageBase64?: string;  // coloring_book, story_sketch presets
  orientation: Orientation;
  margin_mm: number;
  line_weight_mm: number;
}

export interface SaveResponse {
  id: string;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
  tags?: string[];
  orientation?: Orientation;
}

export interface DrawingResult {
  id: string;
  title: string;
  prompt: string;
  orientation: Orientation;
  margin_mm: number;
  line_weight_mm: number;
  svg_path: string;
  pdf_path: string;
  thumb_path: string | null;
  created_at: string;
  updated_at: string;
  similarity?: number;
  metadata?: DrawingMetadata;
}

export interface DrawingMetadata {
  drawing_id: string;
  depiction_summary: string;
  tags: string[];
  objects: ObjectDescription[];
  style: StyleDescription;
  page: PageDescription;
  raw_model_output: unknown;
}

export interface ObjectDescription {
  name: string;
  description: string;
  position?: string;
}

export interface StyleDescription {
  stroke_style: string;
  fill_style: string;
  complexity: string;
  aesthetic: string;
}

export interface PageDescription {
  orientation: string;
  layout: string;
  composition: string;
}

export interface SearchResponse {
  results: DrawingResult[];
  total: number;
}

export interface SignedUrlRequest {
  path: string;
  bucket: string;
  expires_in?: number;
}

export interface SignedUrlResponse {
  url: string;
}
