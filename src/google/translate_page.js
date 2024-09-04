(() => {
    const prefix = "https://translate.google.com/translate?u=";
    location.assign(prefix + encodeURIComponent(location.href));
})();
