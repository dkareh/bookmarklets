// Based on https://hamatti.org/posts/my-most-used-bookmarklets/
// Reference: https://spec.commonmark.org/0.31.2/
(async () => {
    const title = escapeAsciiPunctuation(removeLineEndings(document.title));
    const text = `[${title}](${escapeLinkDestination(location.href)})`;

    // NOTE: Browsers don't support `text/markdown`.
    if (ClipboardItem.supports("text/plain; charset=UTF-8")) {
        // Use MIME types that explicitly specify the encoding.
        const formats = { "text/plain; charset=UTF-8": text };
        const item = new ClipboardItem(formats, { presentationStyle: "inline" });
        await navigator.clipboard.write([item]);
    } else {
        // Fallback to parameterless MIME types. The Clipboard API specification
        // seems to assume, or at least prefer, UTF-8 anyway.
        const formats = { "text/plain": text };
        const item = new ClipboardItem(formats, { presentationStyle: "inline" });
        await navigator.clipboard.write([item]);
    }

    function escapeAsciiPunctuation(string) {
        const asciiPunctuation = /[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/g;
        return string.replaceAll(asciiPunctuation, (character) => `\\${character}`);
    }

    // Remove line endings by converting them to spaces, similar to the way in
    // which CommonMark normalizes the contents of code spans.
    function removeLineEndings(string) {
        const lineEndings = /\r\n|[\r\n]/g;
        return string.replaceAll(lineEndings, " ");
    }

    function escapeLinkDestination(string) {
        return string
            .replaceAll(/^<|[\x00-\x1F\x7F ]/g, percentEncode)
            .replaceAll(/[()]/g, (character) => `\\${character}`);
    }

    function percentEncode(character) {
        const byte = character.codePointAt(0);
        return `%${byte.toString(16).padStart(2, "0").toUpperCase()}`;
    }
})();
