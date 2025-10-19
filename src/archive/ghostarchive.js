(() => {
    const url = new URL(location);
    url.username = "";
    url.password = "";
    url.hash = "";
    location.assign(`https://ghostarchive.org/search?term=${encodeURIComponent(url)}`);
})();
