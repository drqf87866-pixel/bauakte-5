// Tags, die für Bauprojekte relevant sind
const CONSTRUCTION_KEYWORDS = [
  'Rohbau', 'Mauerwerk', 'Beton', 'Stahl', 'Gerüst', 'Schalung', 'Bewehrung',
  'Dach', 'Dachziegel', 'Dachstuhl', 'Fassade', 'Dämmung', 'Fenster', 'Tür',
  'Heizung', 'Heizkörper', 'Fußbodenheizung', 'Sanitär', 'Rohr', 'Leitung',
  'Elektro', 'Kabel', 'Schalter', 'Steckdose', 'Sicherungskasten',
  'Trockenbau', 'Gipskarton', 'Putz', 'Estrich', 'Fliese', 'Bodenbelag',
  'Innenausbau', 'Treppe', 'Küche', 'Bad', 'Außenanlage', 'Pflaster',
  'Garten', 'Zaun', 'Einfahrt', 'Abnahme', 'Übergabe', 'Baustelle',
  'Werkzeug', 'Maschine', 'Baumaterial', 'Fundament', 'Keller',
] as const;

export type AiTagResult = {
  tags: string[];
  description: string;
};

export type AiErrorType = 'rate_limited' | 'capacity' | 'model_unavailable' | 'unknown';

export class AiAnalysisError extends Error {
  constructor(
    message: string,
    public errorType: AiErrorType
  ) {
    super(message);
    this.name = 'AiAnalysisError';
  }
}

/**
 * Classifies an error from the AI service into specific categories.
 * Helps the UI show appropriate messages and decide retry behavior.
 */
export function classifyAiError(err: unknown): AiErrorType {
  const msg = String(err).toLowerCase();
  const errObj = err as Record<string, unknown> | null;
  const status = typeof errObj?.status === 'number' ? errObj.status : undefined;

  if (status === 429 || msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'rate_limited';
  }
  if (status === 3040 || msg.includes('3040') || msg.includes('out of capacity') || msg.includes('no more data centers')) {
    return 'capacity';
  }
  if (status === 5035 || msg.includes('5035') || msg.includes('requires workers paid') || msg.includes('model not available')) {
    return 'model_unavailable';
  }
  return 'unknown';
}

/**
 * Runs an async function with exponential backoff retry.
 * Only retries on transient errors (rate limits, capacity issues).
 */
export async function runWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const errorType = classifyAiError(err);
      const isRetryable = errorType === 'rate_limited' || errorType === 'capacity';
      if (!isRetryable || attempt === maxRetries) {
        throw new AiAnalysisError(
          String(err).slice(0, 300),
          errorType
        );
      }
      // Exponential backoff: 1s, 2s, 4s...
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

type AnalyzeImageEnv = {
  AI: Ai;
  IMAGES: ImagesBinding;
};

// Bilder größer als 20 MB (Input-Limit des Images-Bindings) werden nicht analysiert.
export const MAX_AI_IMAGE_BYTES = 20 * 1024 * 1024;
const AI_IMAGE_MAX_DIMENSION = 1024;
const AI_IMAGE_QUALITY = 80;

/**
 * Analysiert ein Bild via Cloudflare Workers AI (Llama 3.2 Vision)
 * und generiert automatisch Tags und eine Beschreibung.
 * Nur für Bilder – Videos und Dokumente werden übersprungen.
 *
 * Vor der Analyse wird das Bild über das Images-Binding auf maximal 1024px
 * verkleinert (läuft im Images-Service, nicht im Worker-CPU-Budget).
 * Das hält das CPU-Limit (Free-Plan: 10 ms) ein und beschleunigt die KI-Antwort.
 *
 * Wirft bei fehlgeschlagener Bild-Aufbereitung oder fehlgeschlagenem AI-Aufruf
 * (Fehlermeldung fürs UI in `tag_error`).
 * Gibt `null` zurück, wenn die Antwort nicht als JSON parsbar ist.
 */
export async function analyzeImage(
  env: AnalyzeImageEnv,
  imageStream: ReadableStream<Uint8Array>,
  mimeType: string
): Promise<AiTagResult | null> {
  // Nur Bilder verarbeiten
  if (!mimeType.startsWith('image/')) {
    return null;
  }

  // Bild für die KI verkleinern und als JPEG ausgeben
  const buffer = await downscaleForAnalysis(env.IMAGES, imageStream);

  // Bild als Base64 für das AI-Modell kodieren
  const base64 = arrayBufferToBase64(buffer);
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  const response = await env.AI.run(
    '@cf/meta/llama-3.2-11b-vision-instruct',
    {
      image: dataUrl as string & NonNullable<unknown>,
      prompt: `Du analysierst ein Baustellenfoto für eine Baufortschritts-Dokumentation.
Antworte NUR mit einem JSON-Objekt in diesem Format, ohne zusätzlichen Text:
{
  "tags": ["tag1", "tag2", "tag3"],
  "description": "Kurze deutsche Beschreibung (max 20 Wörter)"
}

Gib 3-8 relevante deutsche Tags aus der folgenden Liste (oder sinnvolle eigene) und eine kurze Beschreibung dessen, was auf dem Foto zu sehen ist.
Mögliche Tags: ${CONSTRUCTION_KEYWORDS.join(', ')}

Beachte: Das Foto zeigt Bauarbeiten oder Baufortschritt.`,
    }
  );

  // Antwort parsen – sie kann als { response: string } oder direkt als Text kommen
  const rawText = typeof response === 'object' && response !== null && 'response' in response
    ? (response as { response: string }).response
    : String(response);

  return parseAiResponse(rawText);
}

async function downscaleForAnalysis(
  images: ImagesBinding,
  imageStream: ReadableStream<Uint8Array>
): Promise<ArrayBuffer> {
  try {
    const result = await images
      .input(imageStream)
      .transform({
        width: AI_IMAGE_MAX_DIMENSION,
        height: AI_IMAGE_MAX_DIMENSION,
        fit: 'scale-down',
      })
      .output({ format: 'image/jpeg', quality: AI_IMAGE_QUALITY });
    return await result.response().arrayBuffer();
  } catch {
    throw new Error('Bild konnte nicht für die KI-Analyse aufbereitet werden (Format wird evtl. nicht unterstützt).');
  }
}

function parseAiResponse(raw: string): AiTagResult | null {
  try {
    // JSON aus der Antwort extrahieren (falls noch Text drumherum ist)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [],
      description: typeof parsed.description === 'string' ? parsed.description : '',
    };
  } catch {
    return null;
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  // Native Buffer-Kodierung statt manueller JS-Schleife: deutlich weniger
  // CPU-Zeit, wichtig für das Free-Plan-Limit (10 ms/Request) direkt vor
  // dem env.AI.run()-Aufruf. Verfügbar dank "nodejs_compat" (wrangler.jsonc).
  return Buffer.from(buffer).toString('base64');
}

/**
 * Formatiert Tags als kommaseparierten String für die DB.
 * Normalisiert (trim + lowercase), vereinheitlicht Singular/Plural
 * und entfernt Duplikate. Reihenfolge bleibt stabil (erste Nennung gewinnt).
 */
export function formatTags(tags: string[]): string {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const normalized = normalizeTag(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result.join(', ');
}

/**
 * Vereinheitlicht einen einzelnen Tag: trim, lowercase, deutsche Plural->Singular,
 * Mehrfach-Whitespace -> eins. Leerer String für reinen Whitespace/Empty Input.
 */
export function normalizeTag(input: string): string {
  if (!input) return '';
  let t = input.trim().toLowerCase();
  if (!t) return '';
  t = t.replace(/\s+/g, ' ');

  // Häufige deutsche Plural -> Singular
  const singularMap: Record<string, string> = {
    'ziegel': 'ziegel', 'dachziegel': 'dachziegel',
    'kabel': 'kabel', 'rohre': 'rohr', 'leitungen': 'leitung',
    'schalter': 'schalter', 'steckdosen': 'steckdose',
    'heizkörper': 'heizkörper', 'heizungen': 'heizung',
    'fenster': 'fenster', 'türen': 'tür', 'tuere': 'tür',
    'fliesen': 'fliese', 'wände': 'wand', 'waende': 'wand',
    'böden': 'boden', 'boeden': 'boden',
    'werkzeuge': 'werkzeug', 'maschinen': 'maschine',
    'pflastersteine': 'pflaster', 'einfahrten': 'einfahrt',
    'zäune': 'zaun', 'zaeune': 'zaun',
    'gärten': 'garten', 'gaerten': 'garten',
  };
  if (singularMap[t] !== undefined) t = singularMap[t];
  else if (t.endsWith('e') && t.length > 3) {
    // sanfter Fallback: -e abschneiden bei plausiblen Wörtern
    // (z.B. "maschine" -> bleibt, "rohre" -> "rohr" wäre hier schon gemappt)
  }
  return t;
}
