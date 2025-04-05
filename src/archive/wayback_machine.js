(() => {
    // https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format
    const iso8601 = new Date().toISOString();
    const timestamp = iso8601
        .replace(/^[+-]\d\d/, "") // Truncate expanded years ('±YYYYYY').
        .replaceAll(/\D/g, "") // Remove the delimiters (non-digits).
        .replace(/\d\d\d$/, ""); // Remove the number of milliseconds.
    const prefix = `https://web.archive.org/web/${timestamp}/`;
    location.assign(prefix + encodeURIComponent(location.href));
})();
