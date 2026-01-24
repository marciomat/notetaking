import type { Note, PlainNote, CalculatorNote } from "./schema";

/**
 * Filter notes by tags
 */
export function filterNotesByTags(
  notes: (PlainNote | CalculatorNote | null)[],
  selectedTags: string[]
): (PlainNote | CalculatorNote)[] {
  if (selectedTags.length === 0) {
    return notes.filter((n): n is PlainNote | CalculatorNote => n !== null);
  }

  return notes.filter((note): note is PlainNote | CalculatorNote => {
    if (!note) return false;
    if (!note.tags || note.tags.length === 0) return false;
    return selectedTags.some((tag) => {
      for (let i = 0; i < note.tags.length; i++) {
        if (note.tags[i] === tag) return true;
      }
      return false;
    });
  });
}

/**
 * Get tag counts from notes
 */
export function getTagCounts(
  notes: (PlainNote | CalculatorNote | null)[]
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const note of notes) {
    if (!note?.tags) continue;
    for (let i = 0; i < note.tags.length; i++) {
      const tag = note.tags[i];
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return counts;
}

/**
 * Sort tags by count (descending) then alphabetically
 */
export function sortTagsByCount(tags: string[], counts: Map<string, number>): string[] {
  return [...tags].sort((a, b) => {
    const countDiff = (counts.get(b) || 0) - (counts.get(a) || 0);
    if (countDiff !== 0) return countDiff;
    return a.localeCompare(b);
  });
}

/**
 * Parse tags from a string (comma or space separated)
 */
export function parseTags(input: string): string[] {
  return input
    .split(/[,\s]+/)
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);
}

/**
 * Format tags for display
 */
export function formatTags(tags: string[]): string {
  return tags.join(", ");
}
