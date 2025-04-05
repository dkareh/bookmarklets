// Based on https://lobste.rs/s/pb8bq4/#c_g0gwtj
for (const button of document.querySelectorAll(
    [
        "button[aria-label='Toggle diff contents'][aria-expanded='false']",
        "button[aria-label^='expand file: ']",
    ].join(", "),
)) {
    button.click();
}
