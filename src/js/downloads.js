"use strict";

export function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: url,
        filename: filename,
        saveAs: true,
        conflictAction: "prompt",
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
