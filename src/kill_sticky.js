// Based on https://github.com/t-mart/kill-sticky
(() => {
    for (const node of document.body.querySelectorAll("*")) {
        const style = getComputedStyle(node);
        if (["fixed", "sticky"].includes(style.position)) {
            node.remove();
        }
    }

    const root = document.documentElement;
    for (const node of root.querySelectorAll("*")) {
        const style = getComputedStyle(node);
        if ("hidden" == style["overflow"]) {
            node.style.setProperty("overflow", "visible", "important");
        }
        if ("hidden" == style["overflow-x"]) {
            node.style.setProperty("overflow-x", "visible", "important");
        }
        if ("hidden" == style["overflow-y"]) {
            node.style.setProperty("overflow-y", "visible", "important");
        }
    }

    root.style.setProperty("overflow", "visible", "important");
    root.style.setProperty("overflow-x", "visible", "important");
    root.style.setProperty("overflow-y", "visible", "important");
})();
