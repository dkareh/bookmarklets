// Based on https://hamatti.org/posts/my-most-used-bookmarklets/
(() => {
    // Escape special characters like '<' and '>'!
    const link = document.createElement("a");
    link.href = location.href;
    link.textContent = document.title;
    const text = link.outerHTML;

    const mimeTypes = ["text/html", "text/plain"];
    const mimeTypesUtf8 = mimeTypes.map((type) => type + "; charset=UTF-8");
    if (mimeTypesUtf8.every((type) => ClipboardItem.supports(type))) {
        const formats = Object.fromEntries(mimeTypesUtf8.map((type) => [type, text]));
        const item = new ClipboardItem(formats, { presentationStyle: "inline" });
        navigator.clipboard.write([item]);
    } else {
        const formats = Object.fromEntries(mimeTypes.map((type) => [type, text]));
        const item = new ClipboardItem(formats, { presentationStyle: "inline" });
        navigator.clipboard.write([item]);
    }
})();
