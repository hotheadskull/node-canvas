// Node Canvas V2 desktop shell. Deliberately thin: the app is the web
// canvas; the shell provides the window plus three OS seams (Chunk 18):
// native open/save dialogs, project-file IO, and the global capture
// shortcut (registered from JS at boot).

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running node canvas");
}
