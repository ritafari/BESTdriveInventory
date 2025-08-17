# 📂 Google Drive Inventory Script  

Este proyecto es un script en **Google Apps Script** que genera un inventario completo de los archivos y carpetas dentro de un folder específico de **Google Drive** (incluyendo Unidades compartidas).  
El resultado se exporta automáticamente a una **Google Sheet** y se puede enviar un reporte por correo electrónico.  

---

## 🚀 Funcionalidades

- Recorre un folder de Google Drive (y sus subcarpetas).  
- Lista **carpetas y archivos** con metadatos importantes:  
  - Nivel de profundidad  
  - Ruta relativa  
  - Tipo (carpeta, documento, hoja, PDF, etc.)  
  - Nombre  
  - ID  
  - URL  
  - Fecha de creación  
  - Fecha de última modificación  
- Guarda toda la información en una Google Sheet.  
- Envía un correo con un resumen del inventario.  
- Soporta **Unidades compartidas** mediante el uso del ID de la carpeta.  

---

## ⚙️ Configuración

Antes de ejecutar el script, asegurate de editar la sección de configuración:  

```js
// CONFIGURATION ====================================================
const TARGET_FOLDER_ID = "0AOwK4tpNSFtuUk9PVA"; // Cambiar por el ID de tu carpeta
var GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/<TU_ID_DE_SHEET>/edit";
var GOOGLE_SHEET_RESULTS_TAB_NAME_DRIVES = "Sheet1";
const EMAIL_RECIPIENT_ADDRESS = "tu-correo@ejemplo.com";
const MAX_RUN_TIME_MINUTES = 30; // Tiempo máximo de ejecución
const FOLDERS_BETWEEN_SAVES = 10; // Guardar progreso cada X carpetas
ˋˋˋ

# 🚀 Ejecucion
1.	Abrí Google Apps Script y creá un nuevo proyecto.
2.	Pegá el código completo en el editor.
3.	Activá la Google Drive API:
	•	En el menú de Apps Script → Servicios avanzados de Google → activar Drive API.
	•	En Google Cloud Console → habilitar Google Drive API.
4.	Editá las variables de configuración (TARGET_FOLDER_ID, GOOGLE_SHEET_URL, EMAIL_RECIPIENT_ADDRESS).
5.	Guardá el proyecto y ejecutá la función principal:
    ˋˋˋjs
    runDriveInventory();
    ˋ¡ˋ¡ˋ

