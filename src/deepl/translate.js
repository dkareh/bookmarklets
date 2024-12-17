(() => {
    // These characters are forbidden because they cause various issues:
    // - Line terminators don't match a `.` regex used by DeepL.
    // - '%' causes a `decodeURIComponent` call to throw a `URIError`.
    // - '.' causes DeepL to send a '404 Not Found' response.
    // - '/' is misinterpreted as a segment separator.
    // Percent-encoding doesn't resolve these issues, so we must remove the
    // characters. Just deleting them would merge adjacent words such as 'and/
    // or', so replace each character by a single space instead.
    const forbiddenCharacterRegex = /[\n\r\u2028\u2029%./]/g;
    const text = prompt("Enter text:")?.replaceAll(forbiddenCharacterRegex, " ");
    if (!text) return;
    // To make DeepL detect the language, we use '_' instead of a real language
    // tag. (I originally used 'detect', but DeepL thought I meant German.)
    const prefix = "https://www.deepl.com/translator/q/_/";
    const tag = navigator.languages?.[0] ?? navigator.language;
    location.assign(prefix + encodeURIComponent(text) + "/" + tag);
})();
