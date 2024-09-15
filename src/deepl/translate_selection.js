(() => {
    const text = getSelection().toString();
    // NOTE: The hash doesn't have to be "#auto/...", but that choice is
    // the most self-explanatory: we want DeepL to infer the languages.
    const prefix = "https://www.deepl.com/translator#auto/";
    const tag = navigator.languages?.[0] ?? navigator.language;
    location.assign(prefix + tag + "/" + encodeURIComponent(text));
})();
