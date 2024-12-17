(() => {
    // For unknown reasons, some characters break DeepL.
    const badCharacterRegex = /[%./]/g;
    const text = getSelection().toString().replaceAll(badCharacterRegex, "");
    // To make DeepL detect the language, we use '_' instead of a real language
    // tag. (I originally used 'detect', but DeepL interpreted it as German.)
    const prefix = "https://www.deepl.com/translator/q/_/";
    const tag = navigator.languages?.[0] ?? navigator.language;
    location.assign(prefix + encodeURIComponent(text) + "/" + tag);
})();
