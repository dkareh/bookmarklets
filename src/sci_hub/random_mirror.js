(() => {
    const mirrors = [
        "https://sci-hub.box/",
        "https://sci-hub.red/",
        "https://sci-hub.ru/",
        "https://sci-hub.se/",
        "https://sci-hub.st/",
    ];
    const chosenIndex = Math.floor(Math.random() * mirrors.length);
    const chosenMirror = mirrors[chosenIndex];
    // NOTE: Sci-Hub expects the reference URL to be *unescaped*.
    location.assign(chosenMirror + location.href);
})();
