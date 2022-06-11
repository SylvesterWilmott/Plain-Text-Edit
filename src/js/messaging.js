"use strict";

export function send(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ msg: message }, function (response) {
      resolve(response);
    });
  });
}
