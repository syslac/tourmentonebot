const TOKEN = "YOUR_TELEGRAM_BOT_TOKEN_ID"; 
const SHEET_ID = "ID_FOR_A_GOOGLE_SHEET_TO_USE_AS_BACKEND"; 

// second layer of protection; this is here so you can control
// which Telegram users can actually chat with this bot, to
// prevent unexpected usage
const whitelisted_chats = [
  YOUR_TELEGRAM_CHAT_ID, // chat with the bot a first time to get this
];

function doPost(e) {
  // first layer of protection: this is here so your AppsScript 
  // deployment can be called by your Telegram bot only
  // (generate a password and include it in the webhook 
  // registration from the Telegram bot API)
  const SECRET_PASSWORD = "SUPER_SECRET_PASSWORD";
  
  // Check the secret header sent by Telegram
  const secretHeader = e.parameter.id;
  
  if (secretHeader !== SECRET_PASSWORD) {
    return HtmlService.createHtmlOutput("Unauthorized"); // Stop execution
  }

  const contents = JSON.parse(e.postData.contents);
  
  // Safety check: ignore anything that isn't a text message
  if (!contents.message || !contents.message.text) return;

  const chatId = contents.message.chat.id;
  const text = contents.message.text;
  const userName = contents.message.from.username;
  
  if (whitelisted_chats.includes(chatId))
  {
    let responseText = "";

    // The Command Switch
    switch (text.toLowerCase().split(' ')[0]) {
      case "/start":
        responseText = "Welcome " + userName + "! \n"
          + "You can keep a few lists organized by chatting with me; try using one of the following commands:\n"
          + "/groceries                  (get current grocery list) \n"
          + "/groceries add some stuff   (add new item to grocery list) \n"
          + "/groceries delete 1         (remove line 1 from list; order is the same as in the list command) \n"
          + "/groceries clear            (clear all the list) \n"
          + "or try using /todos or /ideas instead of /groceries";
        break;
        
      case "/status":
        const rowCount = SpreadsheetApp.openById(SHEET_ID).getActiveSheet().getLastRow();
        responseText = "Current logs in database: " + rowCount;
        break;

      case "/groceries":
      case "/todos":
      case "/ideas":
        var pieces = text.split(' ');
        var command = pieces[0].replace("/", "");
        var subcommand = (pieces.length > 1 ? pieces[1] : "list");
        var item = pieces.slice(2).join(" ");
        switch (subcommand) {
          case "add":
            saveToSheet(chatId, userName, item, command);
            responseText = "Added " + item + " to " + command + " list";
            break;
          case "list":
            var current_items = listFromSheet(command, chatId);
            responseText = "Currently listed " + command + ":\n\n" + current_items.join("\n");
            break;
          case "clear":
            clearSheet(command, chatId);
            responseText = "Cleared " + command + " list";
            break;
          case "delete":
            var deleted_item = deleteRowFromSheet(command, item, chatId);
            responseText = "Deleted " + deleted_item + " from " + command + " list";
            break;
          default:
          break;
        }
        break;

      default:
        // If it's not a command, we treat it as data to be saved
        saveToSheet(chatId, userName, text, "misc");
        responseText = "Logged under misc";
    }

    sendMessage(chatId, responseText);
  }
  else {
    sendMessage(chatId, "Your chat id " + chatId + "isn't whitelisted; please request access");
  }
}

function sendMessage(chatId, text) {
  const url = "https://api.telegram.org/bot" + TOKEN + "/sendMessage";
  UrlFetchApp.fetch(url, {
    "method": "post",
    "payload": { "chat_id": String(chatId), "text": text }
  });
}

function saveToSheet(chatId, user, msg, sheet_name) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheet_name);
  if (sheet == null) {
    SpreadsheetApp.openById(SHEET_ID).insertSheet(sheet_name);
    var new_sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheet_name);
    new_sheet.appendRow([new Date(), chatId, user, msg]);
  }
  else {
    sheet.appendRow([new Date(), chatId, user, msg]);  
  }
}

// get all results in a given list; it's meant for small
// lists that a user can keep small and keep in mind; 
// no pagination here
function listFromSheet(sheet_name, chat_id) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheet_name);
  if (sheet == null) {
    return [];
  }
  var logs = "";
  const rowCount = SpreadsheetApp.openById(SHEET_ID).getActiveSheet().getLastRow();
  var results = [];
  for (var i = 1; i <= rowCount; i++)
  {
    sheet.setCurrentCell(sheet.getRange("B" + i));
    if (sheet.getCurrentCell().getValue() != chat_id) {
      continue;
    }
    sheet.setCurrentCell(sheet.getRange("D" + i));
    results.push(sheet.getCurrentCell().getValue());
  }
  return results;
}

// this seems more complicated than it should be, it's just
// to enable multi user in same sheet, and clear affecting just
// one user's data
function clearSheet(sheet_name, chat_id) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheet_name);
  if (sheet == null) {
    return;
  }
  const rowCount = SpreadsheetApp.openById(SHEET_ID).getActiveSheet().getLastRow();
  for (var i = rowCount; i >= 1; i--)
  {
    sheet.setCurrentCell(sheet.getRange("B" + i));
    if (sheet.getCurrentCell().getValue() == chat_id) {
      sheet.deleteRow(i);
    }
  }
}

// delete uses row position as "key"; it's meant for simple
// lists that a user can keep small and keep in mind; delete by
// ordering here
function deleteRowFromSheet(sheet_name, line_nr, chat_id) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheet_name);
  if (sheet == null) {
    return;
  }
  const rowCount = SpreadsheetApp.openById(SHEET_ID).getActiveSheet().getLastRow();
  if (isNaN(line_nr) || line_nr < 0 || line_nr > rowCount) {
    return;
  }
  var current_row = 1;
  for (var i = 1; i <= rowCount; i++)
  {
    sheet.setCurrentCell(sheet.getRange("B" + i));
    if (sheet.getCurrentCell().getValue() == chat_id) { 
      if (current_row == line_nr) {
        sheet.setCurrentCell(sheet.getRange("D" + i));
        var ret = sheet.getCurrentCell().getValue();
        sheet.deleteRow(i);
        return ret;
      }
      else {
        current_row++;
      }
    }
  }
}

  


