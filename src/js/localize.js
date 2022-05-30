"use strict";

export function localize() {
  let strings = document.querySelectorAll("[data-localize]");

  for (const s of strings) {
    s.innerText = chrome.i18n.getMessage(s.dataset.localize);
  }
}
