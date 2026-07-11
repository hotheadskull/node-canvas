// DEV-ONLY: a tiny in-memory stand-in for the Tauri IPC so the frontend can
// run in a plain browser (vite dev / tests / stress runs). Real builds never
// load this: main.tsx only imports it when import.meta.env.DEV is true AND
// the page is not running inside Tauri.
//
// It fakes just enough of tauri-plugin-sql for the app's Drizzle
// (sqlite-proxy) queries: INSERT/UPDATE/SELECT over per-table row arrays.
// It is NOT a SQL engine -- WHERE handling is limited to `= ?` on a single
// column, which covers every query the store issues.

type Row = Record<string, any>;

const tables: Record<string, Row[]> = {};

const tableOf = (sql: string): string | null => {
  const m = /(?:insert\s+into|update|from)\s+[`"]?(\w+)[`"]?/i.exec(sql);
  return m ? m[1] : null;
};

const stripCol = (c: string) =>
  c.trim().replace(/[`"]/g, '').split('.').pop() || '';

function execInsert(sql: string, params: any[]) {
  const table = tableOf(sql)!;
  const colsMatch = /\(([^)]+)\)\s*values/i.exec(sql);
  const cols = colsMatch ? colsMatch[1].split(',').map(stripCol) : [];
  const row: Row = {};
  cols.forEach((c, i) => { row[c] = params[i]; });
  (tables[table] ||= []).push(row);
  // plugin-sql's JS destructures [rowsAffected, lastInsertId]
  return [1, tables[table].length];
}

function execUpdate(sql: string, params: any[]) {
  const table = tableOf(sql)!;
  const setMatch = /set\s+(.*?)\s+where/i.exec(sql);
  const setCols = setMatch
    ? setMatch[1].split(',').map(s => stripCol(s.split('=')[0]))
    : [];
  const whereMatch = /where\s+[`"]?\w*[`"]?\.?[`"]?(\w+)[`"]?\s*=\s*\?/i.exec(sql);
  const whereCol = whereMatch ? whereMatch[1] : null;
  const whereVal = params[params.length - 1];
  let n = 0;
  for (const row of tables[table] || []) {
    if (!whereCol || row[whereCol] === whereVal) {
      setCols.forEach((c, i) => { row[c] = params[i]; });
      n++;
    }
  }
  return [n, 0];
}

function runSelect(sql: string, params: any[]): Row[] {
  const table = tableOf(sql);
  if (!table || !tables[table]) return [];
  let rows = [...tables[table]];
  // Single `col = ?` filter (all the store needs)
  const whereMatch = /where\s+[`"]?\w*[`"]?\.?[`"]?(\w+)[`"]?\s*=\s*\?/i.exec(sql);
  if (whereMatch) {
    rows = rows.filter(r => r[whereMatch[1]] === params[0]);
  }
  if (/deleted_at[^=]*is\s+null/i.test(sql)) {
    rows = rows.filter(r => r.deleted_at == null);
  }
  return rows;
}

// sqlite-proxy expects each row as an ARRAY ordered like the SELECT list.
function selectAsArrays(sql: string, params: any[]): any[][] {
  const rows = runSelect(sql, params);
  const listMatch = /select\s+(distinct\s+)?(.*?)\s+from/is.exec(sql);
  const list = listMatch ? listMatch[2].trim() : '*';
  if (list === '*' ) {
    return rows.map(r => Object.values(r));
  }
  const cols = list.split(',').map(stripCol);
  return rows.map(r => cols.map(c => r[c]));
}

export function installTauriMock() {
  const invoke = async (cmd: string, args: any = {}) => {
    switch (cmd) {
      case 'plugin:sql|load':
        return 'sqlite:mock.db';
      case 'plugin:sql|execute': {
        const sql: string = args.query || '';
        if (/^\s*insert/i.test(sql)) return execInsert(sql, args.values || []);
        if (/^\s*update/i.test(sql)) return execUpdate(sql, args.values || []);
        // CREATE/ALTER/DELETE/PRAGMA and friends: pretend success
        return [0, 0];
      }
      case 'plugin:sql|select': {
        const sql: string = args.query || '';
        return selectAsArrays(sql, args.values || []);
      }
      case 'backup_db':
        return 'mock-backup.db.bak';
      case 'list_backups':
        return [];
      case 'open_backup_folder':
        return null;
      case 'greet':
        return 'mock';
      default:
        console.warn(`[tauriMock] unhandled command: ${cmd}`, args);
        return null;
    }
  };

  (window as any).__TAURI_INTERNALS__ = {
    invoke,
    transformCallback: (cb: any) => cb,
    metadata: { currentWindow: { label: 'mock' }, currentWebview: { label: 'mock' } },
  };
  console.info('[tauriMock] running against in-memory database (dev only)');
}
