/** Saves text as a file through a temporary link: no `downloads` permission needed. */
export function downloadText(filename: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** `reweave-library-2026-11-20.json`. */
export const libraryFilename = (brand: string, now: Date): string =>
  `${brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-library-${now.toISOString().slice(0, 10)}.json`;
