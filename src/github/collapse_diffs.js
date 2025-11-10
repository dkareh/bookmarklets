// Based on https://lobste.rs/s/pb8bq4/bookmarklets#c_g0gwtj
for (const button of document.querySelectorAll(
    [
        "button[aria-label='Toggle diff contents'][aria-expanded='true']",
        `div[class*="DiffFileHeader-module__diff-file-header"]` +
            `:not([class*="DiffFileHeader-module__collapsed"])` +
            ` > div:nth-of-type(1) > button`,
    ].join(", "),
)) {
    button.click();
}
