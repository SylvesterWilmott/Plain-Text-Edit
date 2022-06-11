"use strict";

import * as storage from "./storage.js";
import * as i18n from "./localize.js";

let list; // List of notes
let actions; // List of permanent actions
let listNavItems; // List of elements available for keyboard navigation
let navIndex = 0; // Index of currently selected element

let options = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  list = document.getElementById("list");
  actions = document.getElementById("actions");
  options = await getOptions();

  let data = await getData();

  updateList(data);

  addListeners();
  initNavigation();

  i18n.localize();
}

function getData() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, async function (items) {
      let data = [];

      for (const key in items) {
        if (items[key].type === "doc") {
          // Remove documents with no text
          if (!items[key].text || items[key].text === "") {
            await storage.clear(key);
          } else {
            data.push(items[key]);
          }
        }
      }

      resolve(data);
    });
  });
}

function addListeners() {
  list.addEventListener("click", onListClick, false);
  actions.addEventListener("click", onActionsClick, false);
}

async function getOptions() {
  let options = await storage.load("options", {
    sort: "modified",
  });

  return options;
}

function createNewUid() {
  return Math.random().toString(36).slice(-8);
}

async function updateList(arr) {
  if (arr.length === 0) {
    list.innerHTML = "";
    return;
  }

  let sorted = getSortedList(arr);

  list.innerHTML = "";

  for (const item of sorted) {
    let li = document.createElement("li");
    let icon = document.createElement("div");
    let button = document.createElement("span");

    li.innerText = item.title;
    li.setAttribute("data-id", item.id);
    li.classList.add("item");

    icon.classList.add("icon");

    if (item.text) {
      let textLength = item.text.length;

      if (textLength < 100) {
        icon.classList.add("length-1");
      } else if (textLength < 800) {
        icon.classList.add("length-2");
      } else if (textLength < 1200) {
        icon.classList.add("length-3");
      } else {
        icon.classList.add("length-4");
      }
    }

    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="0" fill="none" width="16" height="16"/><path d="M13.66 3.76l-1.42-1.42L8 6.59 3.76 2.34 2.34 3.76 6.59 8l-4.25 4.24 1.42 1.42L8 9.41l4.24 4.25 1.42-1.42L9.41 8 13.66 3.76z"/></svg>`;
    button.classList.add("remove");

    li.appendChild(icon);
    li.appendChild(button);
    list.appendChild(li);
  }
}

function getSortedList(arr) {
  let sorted;

  switch (options.sort) {
    case "title":
      sorted = arr.sort((a, b) => {
        let textA = a.title.toUpperCase();
        let textB = b.title.toUpperCase();
        return textA < textB ? -1 : textA > textB ? 1 : 0;
      });
      break;
    case "modified":
      sorted = arr.sort((a, b) => {
        return new Date(b.modified) - new Date(a.modified);
      });
      break;
    case "created":
      sorted = arr.sort((a, b) => {
        return new Date(b.created) - new Date(a.created);
      });
      break;
  }

  return sorted;
}

function newWindow(id) {
  window.open("../html/index.html?context=true&id=" + id, "_blank");
}

function initNavigation() {
  listNavItems = document.querySelectorAll(".item");

  for (let [i, item] of listNavItems.entries()) {
    item.addEventListener(
      "mouseover",
      function (e) {
        removeAllSelections();
        this.classList.add("selected");
        navIndex = i;
      },
      false
    );
  }

  document.addEventListener("keydown", documentOnKeydown, false);
  document.addEventListener("mouseout", documentOnMouseout, false);
}

function navigateDown() {
  const currentSelection = listNavItems[navIndex];

  if (currentSelection.classList.contains("selected")) {
    removeSelection(currentSelection);
    navIndex !== listNavItems.length - 1 ? navIndex++ : navIndex;
  } else {
    navIndex = 0;
  }

  const newSelection = listNavItems[navIndex];

  addSelection(newSelection);
}

function navigateUp() {
  const currentSelection = listNavItems[navIndex];

  if (currentSelection.classList.contains("selected")) {
    removeSelection(currentSelection);
    navIndex !== 0 ? navIndex-- : navIndex;
  } else {
    navIndex = listNavItems.length - 1;
  }

  const newSelection = listNavItems[navIndex];

  addSelection(newSelection);
}

function navigateClick(e) {
  listNavItems[navIndex].click();
}

function removeSelection(el) {
  el.classList.remove("selected");
}

function addSelection(el) {
  el.classList.add("selected");
}

function removeAllSelections() {
  for (const item of listNavItems) {
    item.classList.remove("selected");
  }

  navIndex = 0;
}

function documentOnMouseout(e) {
  removeAllSelections();
}

// Event handlers

async function onListClick(e) {
  const target = e.target;

  if (target.classList.contains("remove")) {
    const uid = target.parentElement.dataset.id;
    await storage.clear(uid);
    let data = await getData();
    updateList(data);
    initNavigation();
  } else {
    newWindow(target.dataset.id);
  }
}

function onActionsClick(e) {
  const target = e.target;

  if (target.id === "new") {
    let uid = createNewUid();
    newWindow(uid);
  }
}

function itemOnMouseover(e) {
  removeAllSelections();
  this.classList.add("selected");
  navIndex = e.index;
}

function documentOnKeydown(e) {
  switch (e.key) {
    case "ArrowDown":
      navigateDown();
      break;
    case "ArrowUp":
      navigateUp();
      break;
    case "Enter":
      navigateClick();
      break;
  }
}
