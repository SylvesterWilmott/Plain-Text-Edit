"use strict";

export async function downloadFile(text, filename) {
  if (window.showSaveFilePicker) {
    let newHandle = await window.showSaveFilePicker({
      suggestedName: filename,
    });
    let writableStream = await newHandle.createWritable();
    await writableStream.write(text);
    await writableStream.close();
  } else {
    let a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    a.remove();
  }
}
