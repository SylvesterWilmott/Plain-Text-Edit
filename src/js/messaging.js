"use strict";

export function send(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ msg: message }, function (response) {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError.message);
      }
      resolve(response);
    });
  });
}
