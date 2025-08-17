// CONFIGURATION ====================================================
const TARGET_FOLDER_ID = "0AOwK4tpNSFtuUk9PVA"; // Change this to your exact folder URL
var GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/10BSIOSJAUR-9ru-JC5X_hEvhZ8lKS5EpUke_V1cX2x4/edit";
var GOOGLE_SHEET_RESULTS_TAB_NAME_DRIVES = "Sheet1";
const EMAIL_RECIPIENT_ADDRESS = 'your-email@your.domain';
const MAX_RUN_TIME_MINUTES = 30; // Maximum execution time
const FOLDERS_BETWEEN_SAVES = 10; // Save progress every X folders

// GLOBALS =========================================================
var processedFolders = 0;
var processedFiles = 0;
var startTime;

// HELPER FUNCTIONS ================================================
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

function findTargetFolder() {
 return DriveApp.getFolderById(TARGET_FOLDER_ID);
}

function initializeSheet() {
  const spreadsheet = SpreadsheetApp.openByUrl(GOOGLE_SHEET_URL);
  const sheet = spreadsheet.getSheetByName(GOOGLE_SHEET_RESULTS_TAB_NAME_DRIVES) || 
               spreadsheet.insertSheet(GOOGLE_SHEET_RESULTS_TAB_NAME_DRIVES);
  
  // Clear existing data and filters
  sheet.clear();
  const filter = sheet.getFilter();
  if (filter) filter.remove();
  
  // Set headers and formatting
  sheet.appendRow(["Level", "Path", "Type", "Name", "ID", "URL", "Created", "Updated"]);
  sheet.getRange("A1:H1")
    .setBackground("#eeeeee")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  
  return sheet;
}

// MAIN PROCESSING =================================================
function processFolder(folder, sheet, level, parentPath) {
  // Check execution time
  if (new Date() - startTime > MAX_RUN_TIME_MINUTES * 60 * 1000) {
    throw new Error(`Time limit exceeded (${MAX_RUN_TIME_MINUTES} minutes)`);
  }
  
  const indent = "  ".repeat(level);
  const folderPath = parentPath ? parentPath + "/" + folder.getName() : folder.getName();
  
  // Add folder entry
  sheet.appendRow([
    level,
    indent + folder.getName(),
    "FOLDER",
    folder.getName(),
    folder.getId(),
    folder.getUrl(),
    folder.getDateCreated(),
    folder.getLastUpdated()
  ]);
  processedFolders++;
  
  // Process files in this folder
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    sheet.appendRow([
      level + 1,
      "  ".repeat(level + 1) + file.getName(),
      getSimplifiedType(file.getMimeType()),
      file.getName(),
      file.getId(),
      file.getUrl(),
      file.getDateCreated(),
      file.getLastUpdated()
    ]);
    processedFiles++;
  }
  
  // Process subfolders
  const subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    const subFolder = subFolders.next();
    console.log(`Entering subfolder: ${subFolder.getName()} (Level ${level+1})`);
    processFolder(subFolder, sheet, level + 1, folderPath);
    
    // Periodically save progress
    if (processedFolders % FOLDERS_BETWEEN_SAVES === 0) {
      SpreadsheetApp.flush();
      console.log(`Progress: ${processedFolders} folders, ${processedFiles} files`);
    }
  }
}

function generateDriveTree() {
  startTime = new Date();
  processedFolders = 0;
  processedFiles = 0;
  
  try {
    const sheet = initializeSheet();
    const targetFolder = findTargetFolder();
    
    console.log(`Starting inventory of: ${targetFolder.getName()}`);
    processFolder(targetFolder, sheet, 0, "");
    
    // Final formatting
    sheet.autoResizeColumns(1, 8);
    if (sheet.getLastRow() > 1) {
      sheet.getRange(1, 1, sheet.getLastRow(), 8).createFilter();
    }
    sheet.setFrozenRows(1);
    
    return {
      status: "COMPLETE",
      folders: processedFolders,
      files: processedFiles,
      duration: (new Date() - startTime) / 1000
    };
    
  } catch (e) {
    return {
      status: "PARTIAL",
      folders: processedFolders,
      files: processedFiles,
      error: e.toString(),
      duration: (new Date() - startTime) / 1000
    };
  }
}

// REPORTING ======================================================
function sendInventoryReport(results) {
  const subject = `BEST Lyon Inventory ${results.status}`;
  let body = `Inventory of ${TARGET_FOLDER_NAME} ${results.status.toLowerCase()}.\n\n`;
  body += `Folders processed: ${results.folders}\n`;
  body += `Files processed: ${results.files}\n`;
  body += `Duration: ${Math.round(results.duration/60)} minutes\n`;
  
  if (results.error) {
    body += `\nError: ${results.error}\n`;
  }
  
  body += `\nView results: ${GOOGLE_SHEET_URL}`;
  
  MailApp.sendEmail(EMAIL_RECIPIENT_ADDRESS, subject, body);
}

// ENTRY POINT ====================================================
function runDriveInventory() {
  console.log("Starting BEST Lyon inventory...");
  const results = generateDriveTree();
  
  // Send comprehensive report
  sendInventoryReport(results);
  
  // Console output for debugging
  console.log(`
    Inventory ${results.status}
    Folders: ${results.folders}
    Files: ${results.files}
    ${results.error ? 'Error: ' + results.error : ''}
  `);
  
  return results;
}

 