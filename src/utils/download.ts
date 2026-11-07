/** Trigger a browser download of `text` as `filename`. */
function downloadTextFile(filename: string, text: string, type = 'application/json'): void {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    // Revoking straight away can cancel the download before it starts.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

export { downloadTextFile };
