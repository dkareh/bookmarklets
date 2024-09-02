(() => {
    const mirrors = ["https://sci-hub.se/", "https://sci-hub.st/", "https://sci-hub.ru/"];
    const chosenIndex = Math.floor(Math.random() * mirrors.length);
    const chosenMirror = mirrors[chosenIndex];
    // NOTE: Sci-Hub expects the reference URL to be *unescaped*.
    location.assign(chosenMirror + location.href);
})();
