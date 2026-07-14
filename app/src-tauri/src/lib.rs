// Node Canvas V2 desktop shell. Deliberately thin: the app is the web
// canvas; the shell provides the window. File persistence (.nodecanvas)
// and the global capture shortcut land in their own chunks.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running node canvas");
}
