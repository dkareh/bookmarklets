// Based on https://yawaramin.github.io/bookmarklets/
window.addEventListener("paste", (event) => event.stopImmediatePropagation(), {
    capture: true,
});
