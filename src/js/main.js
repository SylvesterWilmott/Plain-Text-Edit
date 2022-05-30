"use strict";

import * as storage from "./storage.js";
import * as regex from "./regex.js";

let editor; // Input element
let docId; // The current ID of the loaded doc

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("load", removeOverlay);

async function init() {
  editor = document.getElementById("editor");
  docId = getDocId();

  let options = await getOptions();
  let data = await getData();

  if (options) {
    updateSpellCheck(options.spellCheck);
    addClass(editor, options.lineLength);
  }

  if (data.id) {
    updateDisplay(data);
  } else {
    updateWindowTitle();
  }

  addListeners();
  updateFavicon();
  editor.focus();
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

  if (textLength < 100) {
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
  let title = text.trim().split("\n")[0].substring(0, 75);
  let date = new Date().toString();
  let caretPos = editor.selectionEnd;

  if (docData.length) {
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

function addListeners() {
  if (docId) {
    editor.addEventListener("input", onEditorInput, false);
    chrome.storage.onChanged.addListener(onStorageChanged);
  }

  editor.addEventListener("keydown", onEditorKeydown, false);
}

// Event handlers

async function onEditorInput() {
  await saveData();
  updateFavicon();
}

function onEditorKeydown(e) {
  if (e.key === "Tab") {
    e.preventDefault();
    insertNode("\t");
  } else if (e.key === "Enter") {
    const line = getCurrentLine();

    if (line && line.match(regex.ulRegex)) {
      e.preventDefault();

      let match = [...line.matchAll(regex.ulRegex)][0];
      let prefix = match[1];
      let c = match[2];
      let content = match[3];

      if (content) {
        insertNode("\n", c + " ");
      } else {
        deleteNode(prefix.length);
      }
    } else if (line && line.match(regex.olRegex)) {
      e.preventDefault();

      let match = [...line.matchAll(regex.olRegex)][0];
      let prefix = match[1];
      let n = match[2];
      let content = match[3];

      if (content) {
        insertNode("\n", (parseInt(n) + 1).toString() + ". ");
      } else {
        deleteNode(prefix.length);
      }
    }
  }
}

async function onStorageChanged(changes, namespace) {
  if (changes[docId] && !document.hasFocus()) {
    let data = await getData();

    if (data.text) {
      updateDisplay(data);
    }
  }

  if (changes.options) {
    let options = await getOptions();

    if (options) {
      resetEditorCss();
      updateSpellCheck(options.spellCheck);
      addClass(editor, options.lineLength);
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
