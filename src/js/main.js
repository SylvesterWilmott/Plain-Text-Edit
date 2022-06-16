"use strict";

import * as storage from "./storage.js";
import * as regex from "./regex.js";
import * as downloads from "./downloads.js";

let editor;
let autoList = true;
let autoClosure = false;
let docId; // The current ID of the loaded doc

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("load", removeOverlay);

async function init() {
  initRefs();
  await initOptions();
  await initDisplay();
  initListeners();
  updateFavicon();

  editor.focus();
}

function initRefs() {
  editor = document.getElementById("editor");
  docId = getDocId();
}

async function initOptions() {
  let options = await getOptions();

  if (options) {
    applyOptions(options);
  }
}

async function initDisplay() {
  let data = await getData();

  if (data.id) {
    updateDisplay(data);
  } else {
    updateWindowTitle();
  }
}

function getDocId() {
  const url = window.location.search;
  const params = new URLSearchParams(url);
  const id = params.get("id");

  if (id && id !== "undefined") {
    return id;
  }
}

async function updateFavicon() {
  const textLength = editor.value.length;

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
  let favicon = document.getElementById("favicon");
  favicon.setAttribute("href", path);
}

async function getOptions() {
  const options = await storage.load("options", {
    spellCheck: true,
    autoList: true,
    autoClosure: false,
    lineLength: "narrow",
  });

  return options;
}

async function getData() {
  const docData = await storage.load(docId, {});

  return docData;
}

function updateDisplay(data) {
  updateEditorValue(data.text);
  updateWindowTitle(data.title);
  updateCaretPosition(data.caret);
}

function applyOptions(options) {
  updateSpellCheck(options.spellCheck);
  addClass(editor, options.lineLength);
  autoList = options.autoList;
  autoClosure = options.autoClosure;
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
  let line = "";

  line = editor.value.slice(
    editor.value.lastIndexOf("\n", editor.selectionStart - 1) + 1,
    ((end = editor.value.indexOf("\n", editor.selectionStart)) =>
      end > -1 ? end : undefined)()
  );

  return line;
}

function removeOverlay() {
  document.body.classList.remove("loading"); // Remove overlay
}

function insertNode(...nodes) {
  for (const node of nodes) {
    document.execCommand("insertText", false, node);
  }
}

function deleteNode(times) {
  let repeated = 0;

  const repeatDelete = setInterval(runDelete, 0);

  function runDelete() {
    if (repeated < times) {
      repeated++;
      document.execCommand("delete");
      runDelete();
    } else {
      clearInterval(runDelete);
    }
  }
}

function addClass(element, ...classes) {
  for (const c of classes) {
    element.classList.add(c);
  }
}

function resetEditorCss() {
  editor.className = "editor";
}

const saveData = debounce(async function (e) {
  const docData = await storage.load(docId, {});

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
  const text = editor.value;

  let filename = text.trim().split("\n")[0].substring(0, 75).trimEnd();
  if (/\s/.test(filename)) {
    const lastSpace = filename.lastIndexOf(" ");
    filename = filename.substring(0, lastSpace).trimEnd();
  }

  try {
    await downloads.downloadFile(text, filename + ".txt");
  } catch {
    console.log("Download failed");
  }
}

function handleAutoList(e) {
  const line = getCurrentLine();

  let match;
  let type;

  if (line) {
    if (line.match(regex.clRegex)) {
      match = [...line.matchAll(regex.clRegex)][0];
      type = "cl";
    } else if (line.match(regex.ulRegex)) {
      match = [...line.matchAll(regex.ulRegex)][0];
      type = "ul";
    } else if (line.match(regex.olRegex)) {
      match = [...line.matchAll(regex.olRegex)][0];
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
  let pairs = [
    { open: "(", close: ")" },
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "[", close: "]" },
    { open: "«", close: "»" },
    { open: "‹", close: "›" },
    { open: "'", close: "'" },
    { open: "`", close: "`" },
    { open: '"', close: '"' },
  ];

  const foundOpen = pairs.find((x) => x.open === e.key);
  const foundClose = pairs.find((x) => x.close === e.key);
  const selection = window.getSelection().toString();
  const nextChar = editor.value.charAt(editor.selectionEnd);

  if (foundOpen) {
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
  } else if (foundClose) {
    const line = getCurrentLine();
    const regex = new RegExp("\\" + foundClose.open, "g");

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

function initListeners() {
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
      if (autoList) {
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
      if (autoClosure) {
        handleAutoClosure(e);
      }
      break;
  }
}

async function onStorageChanged(changes, namespace) {
  if (changes[docId] && !document.hasFocus()) {
    let data = await getData();

    if (data.text) {
      updateDisplay(data);
      updateFavicon();
    }
  }

  if (changes.options) {
    let options = await getOptions();

    if (options) {
      resetEditorCss();
      applyOptions(options);
    }
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
