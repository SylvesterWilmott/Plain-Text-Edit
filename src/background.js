"use strict";

import * as storage from "./js/storage.js";

let menu = [
  {
    id: "sort",
    title: chrome.i18n.getMessage("menu_sortby"),
    contexts: ["action"],
    type: "normal",
  },
  {
    id: "sort_title",
    title: chrome.i18n.getMessage("menu_sort_title"),
    contexts: ["action"],
    parentId: "sort",
    type: "radio",
  },
  {
    id: "sort_modified",
    title: chrome.i18n.getMessage("menu_sort_modified"),
    contexts: ["action"],
    parentId: "sort",
    type: "radio",
  },
  {
    id: "sort_created",
    title: chrome.i18n.getMessage("menu_sort_created"),
    contexts: ["action"],
    parentId: "sort",
    type: "radio",
  },
  {
    id: "separator",
    contexts: ["action"],
    type: "separator",
  },
  {
    id: "lineLength",
    title: chrome.i18n.getMessage("menu_lineLength"),
    contexts: ["action"],
    type: "normal",
  },
  {
    id: "lineLength_narrow",
    title: chrome.i18n.getMessage("menu_lineLength_narrow"),
    contexts: ["action"],
    parentId: "lineLength",
    type: "radio",
  },
  {
    id: "lineLength_wide",
    title: chrome.i18n.getMessage("menu_lineLength_wide"),
    contexts: ["action"],
    parentId: "lineLength",
    type: "radio",
  },
  {
    id: "spellCheck",
    title: chrome.i18n.getMessage("menu_spellCheck"),
    contexts: ["action"],
    type: "checkbox",
  },
];

chrome.runtime.onInstalled.addListener(init);
chrome.contextMenus.onClicked.addListener(onMenuClick);

async function init() {
  for (const item of menu) {
    await createMenuItem(item);
  }

  updateCheckboxControls();
  updateRadioControls();
}

function createMenuItem(item) {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.create(item, function () {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError.message);
      }
      resolve();
    });
  });
}

async function onMenuClick(info) {
  const menuId = info.menuItemId;

  let options = await storage.load("options", {
    spellCheck: true,
    sort: "modified",
    lineLength: "narrow",
  });

  switch (menuId) {
    case "spellCheck":
      options.spellCheck = info.checked;
      break;
    case "sort_title":
      options.sort = "title";
      break;
    case "sort_modified":
      options.sort = "modified";
      break;
    case "sort_created":
      options.sort = "created";
      break;
    case "lineLength_narrow":
      options.lineLength = "narrow";
      break;
    case "lineLength_wide":
      options.lineLength = "wide";
      break;
  }

  await storage.save("options", options);
}

async function updateCheckboxControls() {
  const options = await storage.load("options", {
    spellCheck: true,
  });

  await restoreCheckmark("spellCheck", options.spellCheck);
}

async function updateRadioControls() {
  const options = await storage.load("options", {
    sort: "modified",
    lineLength: "narrow",
  });

  switch (options.sort) {
    case "title":
      await restoreCheckmark("sort_title", true);
      break;
    case "modified":
      await restoreCheckmark("sort_modified", true);
      break;
    case "created":
      await restoreCheckmark("sort_created", true);
      break;
  }

  switch (options.lineLength) {
    case "narrow":
      await restoreCheckmark("lineLength_narrow", true);
      break;
    case "wide":
      await restoreCheckmark("lineLength_wide", true);
      break;
  }
}

function restoreCheckmark(id, bool) {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.update(
      id,
      {
        checked: bool,
      },
      function () {
        if (chrome.runtime.lastError) {
          console.log(chrome.runtime.lastError.message);
        }
        resolve();
      }
    );
  });
}
