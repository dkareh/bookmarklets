(() => {
    const url = new URL(location);
    url.username = "";
    url.password = "";
    url.hash = "";
    // Request the latest copy by omitting the timestamp.
    // Source: https://archive.org/web/web-advancedsearch.php
    location.assign(`https://web.archive.org/web/${encodeURIComponent(url)}`);
})();
