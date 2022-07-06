"use strict";

import * as storage from "./storage.js";
import * as i18n from "./localize.js";
import * as icons from "./icons.js";

let list; // List of notes
let actions; // List of permanent actions
let listNavItems; // List of elements available for keyboard navigation
let navIndex = 0; // Index of currently selected element
let options = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  getDOMElements();
  await loadUserPreferences();
  await loadInitialDisplayState();
  setNavigationToInitialState();
  addListeners();
  i18n.localize();
}

function getDOMElements() {
  list = document.getElementById("list");
  actions = document.getElementById("actions");
}

async function loadUserPreferences() {
  options = await getOptions();
}

async function loadInitialDisplayState() {
  let data = await getData();
  updateList(data);
}

function getData() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, async function (items) {
      let data = [];

      for (let key in items) {
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
  document.addEventListener("keydown", documentOnKeydown, false);
  document.addEventListener("mouseout", documentOnMouseout, false);
}

async function getOptions() {
  return await storage.load("options", {
    sort: "modified",
  });
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

  for (let item of sorted) {
    let li = document.createElement("li");
    let icon = document.createElement("div");
    let button = document.createElement("span");
    let content = document.createElement("div");
    let title = document.createElement("div");
    let time = document.createElement("div");

    li.setAttribute("data-id", item.id);
    li.classList.add("item");
    content.classList.add("content");
    title.innerText = item.title;
    title.classList.add("title");
    time.classList.add("time");
    icon.classList.add("icon");

    if (item.text.length < 100) {
      icon.classList.add("length-1");
    } else if (item.text.length < 800) {
      icon.classList.add("length-2");
    } else if (item.text.length < 1200) {
      icon.classList.add("length-3");
    } else {
      icon.classList.add("length-4");
    }

    switch (options.sort) {
      case "created":
        time.innerText = getTimestamp(item.created);
        break;
      case "title":
      case "modified":
        time.innerText = getTimestamp(item.modified);
        break;
    }

    button.innerHTML = icons.ICON_CLOSE;
    button.classList.add("remove");

    content.appendChild(title);
    content.appendChild(time);
    li.appendChild(content);
    li.appendChild(icon);
    li.appendChild(button);
    list.appendChild(li);
  }
}

function getTimestamp(date) {
  let dateObj = new Date(date);
  return dateObj.toLocaleDateString(undefined);
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

function newWindow(uid) {
  window.open("../html/index.html?id=" + uid, "_blank");
}

function setNavigationToInitialState() {
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
}

function navigateDirection(e) {
  e.preventDefault();

  switch (e.key) {
    case "ArrowDown":
      if (listNavItems[navIndex].classList.contains("selected")) {
        listNavItems[navIndex].classList.remove("selected");
        navIndex !== listNavItems.length - 1
          ? navIndex++
          : listNavItems.length - 1;
      } else {
        navIndex = 0;
      }
      break;
    case "ArrowUp":
      if (listNavItems[navIndex].classList.contains("selected")) {
        listNavItems[navIndex].classList.remove("selected");
        navIndex !== 0 ? navIndex-- : 0;
      } else {
        navIndex = listNavItems.length - 1;
      }
      break;
  }

  listNavItems[navIndex].classList.add("selected");
  listNavItems[navIndex].scrollIntoView({ block: "nearest" });
}

function navigateClick(e) {
  e.preventDefault();

  let el = listNavItems[navIndex];

  switch (e.key) {
    case "Enter":
      el.click();
      break;
    case "Backspace":
    case "Delete":
      if (el.parentElement.id !== "actions") {
        el.querySelector(".remove").click();
      }
      break;
  }
}

function removeAllSelections() {
  for (let item of listNavItems) {
    item.classList.remove("selected");
  }

  navIndex = 0;
}

async function deleteItem(uid) {
  if (confirm("Permanently delete this document?")) {
    await storage.clear(uid);
    let data = await getData();
    updateList(data);
    setNavigationToInitialState();
  }
}

// Event handlers

function documentOnMouseout(e) {
  removeAllSelections();
}

async function onListClick(e) {
  let el = listNavItems[navIndex];
  let uid = el.dataset.id;

  if (e.target.classList.contains("remove")) {
    deleteItem(uid);
  } else {
    newWindow(uid);
  }
}

function onActionsClick(e) {
  let el = listNavItems[navIndex];

  if (el.id === "new") {
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
    case "ArrowUp":
      navigateDirection(e);
      break;
    case "Enter":
    case "Backspace":
    case "Delete":
      navigateClick(e);
      break;
  }
}
