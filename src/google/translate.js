(() => {
    const text = prompt("Enter text:");
    if (!text) return;
    const prefix = "https://translate.google.com/?text=";
    location.assign(prefix + encodeURIComponent(text));
})();
