use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn backup_db(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("world_engine.db");
    
    if !db_path.exists() {
        return Ok("No database to backup".into());
    }
    
    // Human-readable name so the backup folder makes sense at a glance
    // (older backups keep their unix-timestamp names; both still list)
    let stamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S");
    let backup_name = format!("world_engine_{}.db.bak", stamp);
    let backup_path = app_dir.join(&backup_name);
    
    std::fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;
    
    Ok(backup_name)
}

#[derive(serde::Serialize)]
struct BackupInfo {
    name: String,
    size_kb: u64,
    modified_secs: u64,
}

#[tauri::command]
fn list_backups(app_handle: tauri::AppHandle) -> Result<Vec<BackupInfo>, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let mut backups = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&app_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.ends_with(".db.bak") {
                if let Ok(meta) = entry.metadata() {
                    let modified_secs = meta
                        .modified()
                        .ok()
                        .and_then(|m| m.duration_since(UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0);
                    backups.push(BackupInfo {
                        name,
                        size_kb: meta.len() / 1024,
                        modified_secs,
                    });
                }
            }
        }
    }
    backups.sort_by(|a, b| b.modified_secs.cmp(&a.modified_secs));
    Ok(backups)
}

#[tauri::command]
fn open_backup_folder(app_handle: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    tauri_plugin_opener::open_path(app_dir, None::<&str>).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            backup_db,
            list_backups,
            open_backup_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
