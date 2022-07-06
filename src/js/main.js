"use strict";

import * as storage from "./storage.js";
import * as regex from "./regex.js";
import * as downloads from "./downloads.js";

let editor;
let favicon;
let options = {}; // User preferences
let docId; // The current ID of the loaded doc

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("load", removeOverlay);

async function init() {
  getDOMElements();
  await loadUserPreferences();
  await loadInitialDisplayState();
  addListeners();
  updateFavicon();
  editor.focus();
}

function getDOMElements() {
  editor = document.getElementById("editor");
  favicon = document.getElementById("favicon");
  docId = getDocId();
}

async function loadUserPreferences() {
  let preferences = await getOptions();

  if (preferences) {
    applyUserPreferences(preferences);
  }
}

async function loadInitialDisplayState() {
  let data = await getData();

  if (data.id) {
    updateDisplayState(data);
  } else {
    updateWindowTitle();
  }
}

function getDocId() {
  let url = window.location.search;
  let params = new URLSearchParams(url);
  let id = params.get("id");

  if (id && id !== "undefined") {
    return id;
  }
}

async function updateFavicon() {
  let textLength = editor.value.length;

  if (textLength === 0) {
    setFavicon("../images/ui/note_length_0.png");
  } else if (textLength < 100) {
    setFavicon("../images/ui/note_length_1.png");
  } else if (textLength < 800) {
    setFavicon("../images/ui/note_length_2.png");
  } else if (textLength < 1200) {
    setFavicon("../images/ui/note_length_3.png");
  } else {
    setFavicon("../images/ui/note_length_4.png");
  }
}

function setFavicon(path) {
  favicon.setAttribute("href", path);
}

async function getOptions() {
  return await storage.load("options", {
    spellCheck: true,
    autoList: true,
    autoClosure: false,
    lineLength: "narrow",
  });
}

async function getData() {
  return await storage.load(docId, {});
}

function updateDisplayState(data) {
  updateEditorValue(data.text);
  updateWindowTitle(data.title);
  updateCaretPosition(data.caret);
}

function applyUserPreferences(preferences) {
  updateSpellCheck(preferences.spellCheck);
  addClass(editor, preferences.lineLength);
  options = preferences;
}

function updateEditorValue(value) {
  editor.value = value;
}

function updateWindowTitle(value) {
  if (value && value.length > 0) {
    document.title = value;
  } else {
    document.title = chrome.i18n.getMessage("new_document_title");
  }
}

function updateCaretPosition(value) {
  editor.selectionEnd = value;
  editor.focus();
}

function updateSpellCheck(bool) {
  editor.spellcheck = bool;
}

function getCurrentLine() {
  return editor.value.slice(
    editor.value.lastIndexOf("\n", editor.selectionStart - 1) + 1,
    ((end = editor.value.indexOf("\n", editor.selectionStart)) =>
      end > -1 ? end : undefined)()
  );
}

function getCurrentWord() {
  let start = editor.selectionStart - 1;
  let end = editor.selectionEnd;
  let word;

  while (
    !editor.value.charAt(start).match(regex.WHITESPACE_REGEX) &&
    start >= 0
  ) {
    start--;
  }

  while (
    !editor.value.charAt(end).match(regex.WHITESPACE_REGEX) &&
    end < editor.value.length
  ) {
    end++;
  }

  word = editor.value.substring(start, end).trim();

  return {
    start: start,
    end: end,
    word: word,
  };
}

function removeOverlay() {
  document.body.classList.remove("loading"); // Remove overlay
}

function insertNode(...nodes) {
  for (let node of nodes) {
    document.execCommand("insertText", false, node);
  }
}

function deleteNode(times) {
  let repeated = 0;

  let repeatDelete = setInterval(runDelete, 0);

  function runDelete() {
    if (times > repeated) {
      repeated++;
      document.execCommand("delete");
      runDelete();
    } else {
      clearInterval(repeatDelete);
    }
  }
}

function addClass(element, ...classes) {
  for (let c of classes) {
    element.classList.add(c);
  }
}

function resetEditorCss() {
  editor.className = "editor";
}

let saveData = debounce(async function (e) {
  let docData = await storage.load(docId, {});

  let text = editor.value;
  let title = text.trim().split("\n")[0].substring(0, 75).trimEnd();
  let date = new Date().toString();
  let caretPos = editor.selectionEnd;

  if (Object.keys(docData).length > 0) {
    docData.modified = date;
    docData.text = text;
    docData.caret = caretPos;

    if (title !== docData.title) {
      docData.title = title;
      updateWindowTitle(title);
    }
  } else {
    docData.type = "doc";
    docData.id = docId;
    docData.title = title;
    docData.modified = date;
    docData.created = date;
    docData.text = text;
    docData.caret = caretPos;
    updateWindowTitle(title);
  }

  await storage.save(docId, docData);
}, 500);

async function downloadFile() {
  let text = editor.value;

  let filename = text.trim().split("\n")[0].substring(0, 50).trimEnd();
  if (/\s/.test(filename) && filename.length === 50) {
    let lastSpace = filename.lastIndexOf(" ");
    filename = filename.substring(0, lastSpace).trimEnd();
  }

  try {
    await downloads.downloadFile(text, filename + ".txt");
  } catch {
    console.log("Download failed");
  }
}

function handleAutoList(e) {
  let line = getCurrentLine();

  let match;
  let type;

  if (line) {
    if (line.match(regex.CL_REGEX)) {
      match = [...line.matchAll(regex.CL_REGEX)][0];
      type = "cl";
    } else if (line.match(regex.UL_REGEX)) {
      match = [...line.matchAll(regex.UL_REGEX)][0];
      type = "ul";
    } else if (line.match(regex.OL_REGEX)) {
      match = [...line.matchAll(regex.OL_REGEX)][0];
      type = "ol";
    }
  }

  if (!match) {
    return;
  } else {
    e.preventDefault();
  }

  let prefix = match[1];
  let c = match[2];
  let content = match[3];

  if (type && type === "cl") {
    c = c.replace(/x/, " ");
  }

  if (content) {
    if (type === "ol") {
      insertNode(
        "\n",
        c.replace(/[0-9]+/, (parseInt(c) + 1).toString()) + "." + " "
      );
    } else {
      insertNode("\n", c + " ");
    }
  } else {
    deleteNode(prefix.length);
  }
}

function handleAutoClosure(e) {
  const OPEN_CLOSE_PAIRS = [
    { open: "(", close: ")", type: "bracket" },
    { open: "{", close: "}", type: "bracket" },
    { open: "[", close: "]", type: "bracket" },
    { open: "[", close: "]", type: "bracket" },
    { open: "«", close: "»", type: "bracket" },
    { open: "‹", close: "›", type: "bracket" },
    { open: "'", close: "'", type: "quote" },
    { open: "`", close: "`", type: "quote" },
    { open: '"', close: '"', type: "quote" },
  ];

  let foundOpen = OPEN_CLOSE_PAIRS.find((x) => x.open === e.key);
  let foundClose = OPEN_CLOSE_PAIRS.find((x) => x.close === e.key);
  let selection = window.getSelection().toString();
  let nextChar = editor.value.charAt(editor.selectionEnd);

  if (foundOpen) {
    let word = getCurrentWord().word;
    if (
      word &&
      word.match(regex.WORD_REGEX) &&
      foundOpen.type === "quote" &&
      nextChar !== foundOpen.close &&
      !selection
    ) {
      return;
    } else {
      e.preventDefault();
      if (selection) {
        insertNode(foundOpen.open, selection, foundOpen.close);
        moveCaret(-1);
      } else if (foundClose && nextChar === foundOpen.close) {
        moveCaret(1);
      } else {
        insertNode(foundOpen.open, foundOpen.close);
        moveCaret(-1);
      }
    }
  } else if (foundClose) {
    let line = getCurrentLine();
    let regex = new RegExp("\\" + foundClose.open, "g");

    if (line.match(regex) && nextChar === foundClose.close) {
      e.preventDefault();
      moveCaret(1);
    }
  }
}

function moveCaret(n) {
  if (n < 0) {
    editor.selectionEnd = editor.selectionEnd + n;
  } else {
    editor.selectionStart = editor.selectionEnd + n;
  }
}

function isValidUrl(str) {
  let url;

  try {
    url = new URL(str);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

function addListeners() {
  if (docId) {
    editor.addEventListener("input", onEditorInput, false);
    chrome.storage.onChanged.addListener(onStorageChanged);
  }

  editor.addEventListener("keydown", onEditorKeydown, false);
  document.addEventListener("keydown", onDocumentKeydown, false);
  window.addEventListener("beforeprint", onBeforePrint, false);
  chrome.runtime.onMessage.addListener(onContextMenuClicked);
}

// Event handlers

async function onEditorInput() {
  await saveData();
  updateFavicon();
}

function onEditorKeydown(e) {
  let key = e.key;

  switch (key) {
    case "Tab":
      e.preventDefault();
      insertNode("\t");
      break;
    case "Enter":
      if (options.autoList) {
        handleAutoList(e);
      }
      break;
    case "(":
    case "{":
    case "[":
    case "'":
    case '"':
    case "`":
    case ")":
    case "}":
    case "]":
      if (options.autoClosure) {
        handleAutoClosure(e);
      }
      break;
  }
}

async function onStorageChanged(changes, namespace) {
  if (changes[docId] && !document.hasFocus()) {
    let data = await getData();

    if (data.text) {
      updateDisplayState(data);
      updateFavicon();
    }
  }

  if (changes.options) {
    resetEditorCss();
    loadUserPreferences();
  }
}

function onDocumentKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    downloadFile();
  }
}

function onContextMenuClicked(message, sender, sendResponse) {
  if (document.hasFocus()) {
    switch (message.msg) {
      case "download":
        downloadFile();
        break;
    }
  }
  sendResponse();
}

function onBeforePrint() {
  let sel = document.getSelection().toString().trim();

  if (sel.length === 0) {
    editor.classList.add("printing");

    let div = document.createElement("div");
    div.classList.add("print-helper");
    div.innerText = editor.value;
    document.body.appendChild(div);

    window.addEventListener("afterprint", onAfterPrint, false);

    function onAfterPrint() {
      editor.classList.remove("printing");
      div.remove();
      window.removeEventListener("afterprint", onAfterPrint, false);
    }
  }
}

function debounce(callback, wait) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback.apply(this, args), wait);
  };
}
