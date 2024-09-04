(() => {
    const text = getSelection().toString();
    const prefix = "https://translate.google.com/?text=";
    location.assign(prefix + encodeURIComponent(text));
})();
