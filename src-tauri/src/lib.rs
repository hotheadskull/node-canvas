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
    
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
        
    let backup_name = format!("world_engine_{}.db.bak", timestamp);
    let backup_path = app_dir.join(&backup_name);
    
    std::fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;
    
    Ok(backup_name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![greet, backup_db])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
