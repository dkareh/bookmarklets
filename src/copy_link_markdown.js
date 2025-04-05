// Based on https://hamatti.org/posts/my-most-used-bookmarklets/
(() => {
    const selection = getSelection()?.toString();
    const quote = selection ? `> ${selection}\n\n` : "";
    const text = `${quote}[${document.title}](${location.href})`;

    if (ClipboardItem.supports("text/plain; charset=UTF-8")) {
        const formats = { "text/plain; charset=UTF-8": text };
        const item = new ClipboardItem(formats, { presentationStyle: "inline" });
        navigator.clipboard.write([item]);
    } else {
        const formats = { "text/plain": text };
        const item = new ClipboardItem(formats, { presentationStyle: "inline" });
        navigator.clipboard.write([item]);
    }
})();
