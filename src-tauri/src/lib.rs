use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[tauri::command]
fn init_library(root_path: String) -> Result<(), String> {
    let cat_path = PathBuf::from(&root_path).join("categories.json");
    if !cat_path.exists() {
        let default = serde_json::json!([{
          "id": "default",
          "name": "默认"
        }]);
        fs::write(&cat_path, default.to_string()).map_err(|e| e.to_string())?;
    }

    let cats = load_category_list(&root_path)?;
    for cat in &cats {
        let folder = PathBuf::from(&root_path).join(&cat.name);
        fs::create_dir_all(folder.join("covers")).map_err(|e| e.to_string())?;
        fs::create_dir_all(folder.join("notes")).map_err(|e| e.to_string())?;
        let index_path = folder.join("index.json");
        if !index_path.exists() {
            fs::write(&index_path, "[]").map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn load_category_list(root_path: &str) -> Result<Vec<CategoryInfo>, String> {
    let path = PathBuf::from(root_path).join("categories.json");
    let data = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

fn save_category_list(root_path: &str, cats: &[CategoryInfo]) -> Result<(), String> {
    let path = PathBuf::from(root_path).join("categories.json");
    let data = serde_json::to_string_pretty(cats).map_err(|e| e.to_string())?;
    fs::write(&path, &data).map_err(|e| e.to_string())
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct CategoryInfo {
    id: String,
    name: String,
}

#[tauri::command]
fn load_categories(root_path: String) -> Result<String, String> {
    let cats = load_category_list(&root_path)?;
    serde_json::to_string(&cats).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_categories(root_path: String, categories: String) -> Result<(), String> {
    let cats: Vec<CategoryInfo> = serde_json::from_str(&categories).map_err(|e| e.to_string())?;
    save_category_list(&root_path, &cats)
}

#[tauri::command]
fn add_category(root_path: String, name: String) -> Result<String, String> {
    let mut cats = load_category_list(&root_path)?;
    let id = Uuid::new_v4().to_string();
    cats.push(CategoryInfo {
        id: id.clone(),
        name: name.clone(),
    });
    save_category_list(&root_path, &cats)?;
    let folder = PathBuf::from(&root_path).join(&name);
    fs::create_dir_all(folder.join("covers")).map_err(|e| e.to_string())?;
    fs::create_dir_all(folder.join("notes")).map_err(|e| e.to_string())?;
    let index_path = folder.join("index.json");
    fs::write(&index_path, "[]").map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
fn rename_category(root_path: String, old_name: String, new_name: String) -> Result<(), String> {
    let mut cats = load_category_list(&root_path)?;
    if let Some(cat) = cats.iter_mut().find(|c| c.name == old_name) {
        cat.name = new_name.clone();
    }
    save_category_list(&root_path, &cats)?;
    let old_path = PathBuf::from(&root_path).join(&old_name);
    let new_path = PathBuf::from(&root_path).join(&new_name);
    if old_path.exists() {
        fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn delete_category(root_path: String, name: String) -> Result<(), String> {
    let mut cats = load_category_list(&root_path)?;
    if cats.len() <= 1 {
        return Err("至少保留一个分类".into());
    }
    cats.retain(|c| c.name != name);
    save_category_list(&root_path, &cats)?;
    let folder = PathBuf::from(&root_path).join(&name);
    if folder.exists() {
        fs::remove_dir_all(&folder).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn load_entries(category: String, root_path: String) -> Result<String, String> {
    let index_path = PathBuf::from(&root_path).join(&category).join("index.json");
    fs::read_to_string(&index_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_entries(category: String, root_path: String, entries: String) -> Result<(), String> {
    let index_path = PathBuf::from(&root_path).join(&category).join("index.json");
    fs::write(&index_path, &entries).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    { std::process::Command::new("explorer").arg(&path).spawn().map_err(|e| e.to_string())?; }
    #[cfg(target_os = "macos")]
    { std::process::Command::new("open").arg(&path).spawn().map_err(|e| e.to_string())?; }
    #[cfg(target_os = "linux")]
    { std::process::Command::new("xdg-open").arg(&path).spawn().map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
fn copy_cover(source_path: String, category: String, root_path: String, target_name: Option<String>) -> Result<String, String> {
    let ext = std::path::Path::new(&source_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg");
    let new_filename = match target_name {
        Some(name) => format!("{}.{}", name, ext),
        None => format!("{}.{}", Uuid::new_v4(), ext),
    };
    let dest_path = PathBuf::from(&root_path)
        .join(&category)
        .join("covers")
        .join(&new_filename);
    fs::copy(&source_path, &dest_path).map_err(|e| e.to_string())?;
    Ok(new_filename)
}

#[tauri::command]
fn delete_cover(category: String, root_path: String, file_name: String) -> Result<(), String> {
    if file_name.is_empty() {
        return Ok(());
    }
    let path = PathBuf::from(&root_path)
        .join(&category)
        .join("covers")
        .join(&file_name);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn save_note(category: String, root_path: String, file_name: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(&root_path)
        .join(&category)
        .join("notes")
        .join(&file_name);
    fs::write(&path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_note(category: String, root_path: String, file_name: String) -> Result<String, String> {
    let path = PathBuf::from(&root_path)
        .join(&category)
        .join("notes")
        .join(&file_name);
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_note(category: String, root_path: String, file_name: String) -> Result<(), String> {
    let path = PathBuf::from(&root_path)
        .join(&category)
        .join("notes")
        .join(&file_name);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn check_notes(category: String, root_path: String, file_names: Vec<String>) -> Result<String, String> {
    let notes_dir = PathBuf::from(&root_path).join(&category).join("notes");
    let mut result = Vec::new();
    for name in file_names {
        let path = notes_dir.join(&name);
        if let Ok(content) = fs::read_to_string(&path) {
            if !content.trim().is_empty() {
                result.push(name);
            }
        }
    }
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_cover(category: String, root_path: String, old_name: String, new_name: String) -> Result<String, String> {
    if old_name.is_empty() || old_name == new_name {
        return Ok(new_name);
    }
    let old_path = PathBuf::from(&root_path).join(&category).join("covers").join(&old_name);
    let new_path = PathBuf::from(&root_path).join(&category).join("covers").join(&new_name);
    if old_path.exists() && !new_path.exists() {
        fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    }
    Ok(new_name)
}

#[tauri::command]
fn rename_note(category: String, root_path: String, old_name: String, new_name: String) -> Result<String, String> {
    if old_name.is_empty() || old_name == new_name {
        return Ok(new_name);
    }
    let old_path = PathBuf::from(&root_path).join(&category).join("notes").join(&old_name);
    let new_path = PathBuf::from(&root_path).join(&category).join("notes").join(&new_name);
    if old_path.exists() && !new_path.exists() {
        fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    }
    Ok(new_name)
}

#[tauri::command]
fn load_config() -> Result<String, String> {
    let exe_dir = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("Cannot get exe directory")?
        .to_path_buf();
    let config_path = exe_dir.join("config.json");
    if !config_path.exists() {
        return Ok(String::from("{}"));
    }
    fs::read_to_string(&config_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_config(config: String) -> Result<(), String> {
    let exe_dir = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("Cannot get exe directory")?
        .to_path_buf();
    let config_path = exe_dir.join("config.json");
    fs::write(&config_path, &config).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            init_library,
            open_folder,
            load_categories,
            save_categories,
            add_category,
            rename_category,
            delete_category,
            load_entries,
            save_entries,
            check_notes,
            copy_cover,
            delete_cover,
            rename_cover,
            save_note,
            load_note,
            delete_note,
            rename_note,
            load_config,
            save_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
