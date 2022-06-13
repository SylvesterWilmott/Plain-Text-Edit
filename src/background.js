"use strict";

import * as storage from "./js/storage.js";
import * as messaging from "./js/messaging.js";

let menu = [
  {
    id: "sort",
    title: chrome.i18n.getMessage("menu_sortby"),
    contexts: ["action"],
    type: "normal",
  },
  {
    id: "options__sort_title",
    title: chrome.i18n.getMessage("menu_sort_title"),
    contexts: ["action"],
    parentId: "sort",
    type: "radio",
  },
  {
    id: "options__sort_modified",
    title: chrome.i18n.getMessage("menu_sort_modified"),
    contexts: ["action"],
    parentId: "sort",
    type: "radio",
  },
  {
    id: "options__sort_created",
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
    id: "options__lineLength_narrow",
    title: chrome.i18n.getMessage("menu_lineLength_narrow"),
    contexts: ["action"],
    parentId: "lineLength",
    type: "radio",
  },
  {
    id: "options__lineLength_wide",
    title: chrome.i18n.getMessage("menu_lineLength_wide"),
    contexts: ["action"],
    parentId: "lineLength",
    type: "radio",
  },
  {
    id: "options__spellCheck",
    title: chrome.i18n.getMessage("menu_spellCheck"),
    contexts: ["action"],
    type: "checkbox",
  },
  {
    id: "options__autoList",
    title: chrome.i18n.getMessage("menu_list"),
    contexts: ["action"],
    type: "checkbox",
  },
  {
    id: "options__autoClosure",
    title: chrome.i18n.getMessage("menu_autoClosure"),
    contexts: ["action"],
    type: "checkbox",
  },
  {
    id: "download_page",
    title: chrome.i18n.getMessage("menu_download"),
    contexts: ["editable"],
    documentUrlPatterns: ["chrome-extension://*/*/*.html?context=true*"],
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
  const optionRegex = /^options__/gm;

  if (menuId.match(optionRegex)) {
    let options = await storage.load("options", {
      spellCheck: true,
      autoList: false,
      autoClosure: false,
      sort: "modified",
      lineLength: "narrow",
    });

    switch (menuId) {
      case "options__spellCheck":
        options.spellCheck = info.checked;
        break;
      case "options__sort_title":
        options.sort = "title";
        break;
      case "options__sort_modified":
        options.sort = "modified";
        break;
      case "options__sort_created":
        options.sort = "created";
        break;
      case "options__lineLength_narrow":
        options.lineLength = "narrow";
        break;
      case "options__lineLength_wide":
        options.lineLength = "wide";
        break;
      case "options__autoClosure":
        options.autoClosure = info.checked;
        break;
      case "options__autoList":
        options.autoList = info.checked;
        break;
    }

    await storage.save("options", options);
  } else {
    switch (menuId) {
      case "download_page":
        messaging.send("download");
        break;
    }
  }
}

async function updateCheckboxControls() {
  const options = await storage.load("options", {
    spellCheck: true,
    autoList: true,
    autoClosure: false,
  });

  await restoreCheckmark("options__spellCheck", options.spellCheck);
  await restoreCheckmark("options__autoList", options.autoList);
  await restoreCheckmark("options__autoClosure", options.autoClosure);
}

async function updateRadioControls() {
  const options = await storage.load("options", {
    sort: "modified",
    lineLength: "narrow",
  });

  switch (options.sort) {
    case "title":
      await restoreCheckmark("options__sort_title", true);
      break;
    case "modified":
      await restoreCheckmark("options__sort_modified", true);
      break;
    case "created":
      await restoreCheckmark("options__sort_created", true);
      break;
  }

  switch (options.lineLength) {
    case "narrow":
      await restoreCheckmark("options__lineLength_narrow", true);
      break;
    case "wide":
      await restoreCheckmark("options__lineLength_wide", true);
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
