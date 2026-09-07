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

/**
 * Analysiert ein Bild via Cloudflare Workers AI (Llama 3.2 Vision)
 * und generiert automatisch Tags und eine Beschreibung.
 * Nur für Bilder – Videos und Dokumente werden übersprungen.
 *
 * Wirft, wenn der AI-Aufruf fehlschlägt (Fehlermeldung fürs UI in `tag_error`).
 * Gibt `null` zurück, wenn die Antwort nicht als JSON parsbar ist.
 */
export async function analyzeImage(
  ai: Ai,
  imageBuffer: ArrayBuffer,
  mimeType: string
): Promise<AiTagResult | null> {
  // Nur Bilder verarbeiten
  if (!mimeType.startsWith('image/')) {
    return null;
  }

  // Bild als Base64 für das AI-Modell kodieren
  const base64 = arrayBufferToBase64(imageBuffer);
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await ai.run(
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
