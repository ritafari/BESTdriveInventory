// CONFIGURACIÓN ====================================================
const TARGET_FOLDER_ID = "0AOwK4tpNSFtuUk9PVA"; // Cambia por el ID de tu carpeta principal
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/10BSIOSJAUR-9ru-JC5X_hEvhZ8lKS5EpUke_V1cX2x4/edit";
const EMAIL_RECIPIENT_ADDRESS = 'your-email@your.domain';
const MAX_RUN_TIME_MINUTES = 5; // Tiempo de ejecución más corto para evitar fallos
const BATCH_SIZE = 500; // Número de filas a procesar antes de guardar

// GLOBALES =========================================================
var startTime;
var allData = []; // Array para almacenar datos por lotes

// PROPIEDADES DE SCRIPT para guardar el estado
const PROPERTIES = PropertiesService.getScriptProperties();

// FUNCIONES DE AYUDA ===============================================
function getSimplifiedType(mimeType) {
  const types = {
    'application/vnd.google-apps.folder': 'FOLDER',
    'application/vnd.google-apps.document': 'DOC',
    'application/vnd.google-apps.spreadsheet': 'SHEET',
    'application/vnd.google-apps.presentation': 'SLIDES',
    'application/pdf': 'PDF',
    'application/vnd.google-apps.form': 'FORM',
    'application/vnd.google-apps.drawing': 'DRAWING'
  };
  return types[mimeType] || mimeType.split('/').pop().toUpperCase().substring(0, 10);
}

function getSheetByName(sheetName) {
  const spreadsheet = SpreadsheetApp.openByUrl(GOOGLE_SHEET_URL);
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  return sheet;
}

function initializeSheet(sheetName) {
  const sheet = getSheetByName(sheetName);
  sheet.clear();
  const filter = sheet.getFilter();
  if (filter) filter.remove();

  const headers = ["Level", "Path", "Type", "Name", "ID", "URL", "Created", "Updated"];
  sheet.appendRow(headers);
  sheet.getRange("A1:H1")
    .setBackground("#eeeeee")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
}

function writeDataToSheet(sheetName) {
  const sheet = getSheetByName(sheetName);
  if (allData.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, allData.length, allData[0].length).setValues(allData);
    allData = [];
    SpreadsheetApp.flush();
    console.log(`Progreso guardado en la hoja '${sheetName}'. Total de filas: ${sheet.getLastRow() - 1}`);
  }
}

// PROCESAMIENTO PRINCIPAL ==========================================
function processFolderAndFiles(folder, sheetName, level, parentPath) {
  if ((new Date() - startTime) / 1000 > (MAX_RUN_TIME_MINUTES * 60 - 30)) {
    writeDataToSheet(sheetName);
    PROPERTIES.setProperty('lastProcessedSheet', sheetName);
    PROPERTIES.setProperty('lastProcessedFolder', folder.getId());
    throw new Error(`Límite de tiempo excedido. Guardando progreso en '${sheetName}'.`);
  }

  const folderPath = (parentPath ? parentPath + "/" : "") + folder.getName();

  allData.push([
    level,
    "  ".repeat(level) + folder.getName(),
    "FOLDER",
    folder.getName(),
    folder.getId(),
    folder.getUrl(),
    folder.getDateCreated(),
    folder.getLastUpdated()
  ]);

  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    allData.push([
      level + 1,
      "  ".repeat(level + 1) + file.getName(),
      getSimplifiedType(file.getMimeType()),
      file.getName(),
      file.getId(),
      file.getUrl(),
      file.getDateCreated(),
      file.getLastUpdated()
    ]);
    if (allData.length >= BATCH_SIZE) {
      writeDataToSheet(sheetName);
    }
  }

  const subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    const subFolder = subFolders.next();
    processFolderAndFiles(subFolder, sheetName, level + 1, folderPath);
  }
}

function generateDriveTree() {
  let mainFolderId = PROPERTIES.getProperty('mainFolderId');
  let nextMainFolderIndex = parseInt(PROPERTIES.getProperty('nextMainFolderIndex') || '0');
  
  if (!mainFolderId) {
    console.log("Iniciando nuevo inventario de carpetas primarias.");
    const targetFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    const mainFolders = targetFolder.getFolders();
    
    // Guardar los IDs de las carpetas principales para reanudación
    let mainFolderIds = [];
    while (mainFolders.hasNext()) {
      mainFolderIds.push(mainFolders.next().getId());
    }
    PROPERTIES.setProperty('mainFolderIds', JSON.stringify(mainFolderIds));
    PROPERTIES.setProperty('nextMainFolderIndex', '0');
    
    mainFolderId = mainFolderIds[0];
  } else {
    console.log("Reanudando inventario.");
  }
  
  const allMainFolderIds = JSON.parse(PROPERTIES.getProperty('mainFolderIds'));
  
  for (let i = nextMainFolderIndex; i < allMainFolderIds.length; i++) {
    const folderId = allMainFolderIds[i];
    const folder = DriveApp.getFolderById(folderId);
    const sheetName = folder.getName().replace(/[/\\?*\[\]:]/g, '_').substring(0, 50);

    // Reinicia la hoja si no está en la reanudación de una hoja existente
    const lastProcessedSheet = PROPERTIES.getProperty('lastProcessedSheet');
    if (lastProcessedSheet !== sheetName) {
      initializeSheet(sheetName);
    }

    try {
      console.log(`Procesando carpeta '${sheetName}'...`);
      startTime = new Date();
      processFolderAndFiles(folder, sheetName, 0, "");
      writeDataToSheet(sheetName); // Escribir datos restantes
      
      const sheet = getSheetByName(sheetName);
      sheet.autoResizeColumns(1, 8);
      if (sheet.getLastRow() > 1) {
        sheet.getRange(1, 1, sheet.getLastRow(), 8).createFilter();
      }
      sheet.setFrozenRows(1);
      
      // Actualiza el índice de la siguiente carpeta principal a procesar
      PROPERTIES.setProperty('nextMainFolderIndex', (i + 1).toString());

    } catch (e) {
      console.error(`Error procesando '${sheetName}': ${e.message}`);
      return { status: "PARTIAL", message: e.message };
    }
  }

  // Limpiar propiedades al finalizar
  PROPERTIES.deleteProperty('mainFolderIds');
  PROPERTIES.deleteProperty('nextMainFolderIndex');
  PROPERTIES.deleteProperty('lastProcessedSheet');
  PROPERTIES.deleteProperty('lastProcessedFolder');

  return { status: "COMPLETE", message: "Inventario de todas las carpetas completado." };
}

// PUNTO DE ENTRADA ==================================================
function runDriveInventory() {
  const results = generateDriveTree();
  console.log(results.message);
  MailApp.sendEmail(EMAIL_RECIPIENT_ADDRESS, `Inventario de Drive - ${results.status}`, results.message + `\n\nVer resultados: ${GOOGLE_SHEET_URL}`);
}
