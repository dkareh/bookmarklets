(() => {
    const url = new URL(location);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    location.assign(`https://archive.today/newest/${encodeURIComponent(url)}`);
})();
