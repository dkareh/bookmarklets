// Based on https://hamatti.org/posts/my-most-used-bookmarklets/
(async () => {
    // Use DOM APIs to automatically escape metacharacters.
    const anchor = document.createElement("a");
    anchor.textContent = document.title;
    anchor.href = location.href;
    const text = anchor.outerHTML;

    const mimeTypes = ["text/html", "text/plain"];
    const mimeTypesUtf8 = mimeTypes.map((type) => `${type}; charset=UTF-8`);
    // The HTML and plain text formats should be interpreted using the same
    // encoding. Don't mix explicit/parameterless MIME types.
    if (mimeTypesUtf8.every((type) => ClipboardItem.supports(type))) {
        // Use MIME types that explicitly specify the encoding.
        const formats = Object.fromEntries(mimeTypesUtf8.map((type) => [type, text]));
        const item = new ClipboardItem(formats, { presentationStyle: "inline" });
        await navigator.clipboard.write([item]);
    } else {
        // Fallback to parameterless MIME types. The Clipboard API specification
        // seems to assume, or at least prefer, UTF-8 anyway.
        const formats = Object.fromEntries(mimeTypes.map((type) => [type, text]));
        const item = new ClipboardItem(formats, { presentationStyle: "inline" });
        await navigator.clipboard.write([item]);
    }
})();
