(() => {
    const text = getSelection().toString();
    const prefix = "https://translate.google.com/?op=translate&sl=auto&tl=";
    // Google Translate usually only needs the primary language subtag.
    // https://datatracker.ietf.org/doc/html/rfc5646#section-2.1
    const tag = navigator.languages?.[0] ?? navigator.language;
    const primaryLanguage = tag.match(/^[A-Za-z]{2,8}/)?.[0] ?? tag;
    location.assign(prefix + primaryLanguage + "&text=" + encodeURIComponent(text));
})();
