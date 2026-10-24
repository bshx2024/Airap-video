const STORAGE_KEY = 'imagegen_pending_generator_draft';
const DRAFT_TTL_MS = 30 * 60 * 1000;

export type GeneratorDraft = {
  prompt: string;
  image?: string;
  imageUrls?: string[];
  tab: 'text' | 'image';
  modelId?: string;
  aspectRatio?: string;
  resolution?: string;
  /** 工具页选项（scale / aspect_ratio / style） */
  toolOption?: string;
  generationRequested?: boolean;
  createdAt: number;
};

export function saveGeneratorDraft(draft: Omit<GeneratorDraft, 'createdAt'>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...draft,
        createdAt: Date.now(),
      } satisfies GeneratorDraft)
    );
  } catch {
    // ignore quota / private mode
  }
}

export function readGeneratorDraft(): GeneratorDraft | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as GeneratorDraft;
    if (Date.now() - (draft.createdAt || 0) >= DRAFT_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return draft;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearGeneratorDraft() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Read and clear. Used for one-shot fill (e.g. prompts page → generator). */
export function consumeGeneratorDraft(): GeneratorDraft | null {
  const draft = readGeneratorDraft();
  if (!draft) return null;
  clearGeneratorDraft();
  if (!draft.prompt && !(draft.imageUrls?.length || draft.image)) return null;
  return draft;
}
