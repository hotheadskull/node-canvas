// ============================================================================
// PROJECT FILE IO -- the environment seam for .nodecanvas files.
//
// Two worlds, one interface:
// - Tauri (the desktop app): real paths, native open/save dialogs, and
//   pre-migration backups written NEXT TO the project file.
// - Browser (dev server, e2e, TRY-IT): open via a file input, "save" via a
//   download; localStorage remains the working copy.
//
// Detection is runtime ('__TAURI_INTERNALS__'), plugin modules load lazily,
// so the web bundle never depends on the shell being there.
// ============================================================================

export const PROJECT_EXTENSION = 'nodecanvas';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export type OpenedProjectFile = {
  raw: string;
  /** Real filesystem path in Tauri; null in the browser. */
  path: string | null;
  fileName: string;
};

/** Native open dialog (Tauri) or file-input picker (browser).
 * Resolves null when the user cancels. */
export async function pickProjectFile(): Promise<OpenedProjectFile | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const path = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Node Canvas project', extensions: [PROJECT_EXTENSION] }],
    });
    if (typeof path !== 'string') return null;
    const raw = await readTextFile(path);
    return { raw, path, fileName: baseName(path) };
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `.${PROJECT_EXTENSION},application/json`;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ raw: String(reader.result ?? ''), path: null, fileName: file.name });
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    // cancel never fires onchange; a focus listener catches the common case
    window.addEventListener(
      'focus',
      () => setTimeout(() => resolve(null), 500),
      { once: true },
    );
    input.click();
  });
}

/** Native save dialog. Tauri only -- browsers download instead. */
export async function pickSavePath(suggestedFileName: string): Promise<string | null> {
  const { save } = await import('@tauri-apps/plugin-dialog');
  const path = await save({
    defaultPath: suggestedFileName,
    filters: [{ name: 'Node Canvas project', extensions: [PROJECT_EXTENSION] }],
  });
  return typeof path === 'string' ? path : null;
}

/** Write file contents to a real path. Tauri only. Throws on failure (I9 --
 * the caller surfaces it in the banner). */
export async function writeProjectFile(path: string, contents: string): Promise<void> {
  const { writeTextFile } = await import('@tauri-apps/plugin-fs');
  await writeTextFile(path, contents);
}

/** Browser download -- the web world's "save a copy". */
export function downloadFile(fileName: string, contents: string, mime = 'application/json'): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Backup-before-migrate (schema rule): the ORIGINAL bytes of an older-version
 * file are preserved before the migrated document can overwrite anything.
 * Returns a human-readable description of where the backup lives.
 */
export async function writePreMigrationBackup(
  path: string | null,
  raw: string,
  fromVersion: number,
): Promise<string> {
  if (isTauri() && path !== null) {
    const backupPath = `${path}.backup-v${fromVersion}`;
    await writeProjectFile(backupPath, raw);
    return backupPath;
  }
  const key = `nodecanvas.v2.document.backup-v${fromVersion}`;
  localStorage.setItem(key, raw);
  return `browser storage ("${key}")`;
}

function baseName(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

/**
 * The store calls file IO through this record instead of the raw imports so
 * unit tests can swap members (the app's test-setup imports the store before
 * any vi.mock can register, so module-level mocking never reaches it).
 */
export const projectIO = {
  isTauri,
  pickProjectFile,
  pickSavePath,
  writeProjectFile,
  downloadFile,
  writePreMigrationBackup,
};
