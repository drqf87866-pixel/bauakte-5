// D1 Database type helper
export interface Env {
  DB: D1Database;
  R2: R2Bucket;

  GEMINI_API_KEY: string;
  IMAGES: ImagesBinding;
}

// User
export interface User {
  id: string;
  email: string;
  name: string;
  hashed_password: string;
  created_at: string;
}

// Session
export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

// Project
export interface Project {
  id: string;
  name: string;
  address: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// Phase
export interface Phase {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  status: 'in_progress' | 'completed';
  notes: string;
  completed_at: string | null;
  created_at: string;
}

// AI auto-tagging status
export type TagStatus = 'pending' | 'done' | 'failed' | 'none';

// Upload
export interface Upload {
  id: string;
  phase_id: string;
  user_id: string;
  filename: string;
  type: 'image' | 'video' | 'doc';
  r2_key: string;
  mime_type: string;
  file_size: number;
  notes: string;
  tags: string;        // gemerged (manual_tags ∪ ai_tags), backward-kompatibel
  manual_tags: string; // vom Nutzer eingegebene/bearbeitete Tags
  ai_tags: string;     // von KI generierte Tags
  ai_description: string;
  tag_status: TagStatus;
  tag_error: string;
  created_at: string;
}

// ShareLink
export interface ShareLink {
  id: string;
  project_id: string;
  token: string;
  created_by: string;
  is_active: number;
  created_at: string;
}

// Constants
export const PHASE_NAMES = [
  'Rohbau',
  'Dach & Fassade',
  'Fenster & Türen',
  'Heizung & Sanitär',
  'Elektro',
  'Innenausbau',
  'Außenanlagen',
  'Abnahmen & Übergabe',
] as const;


