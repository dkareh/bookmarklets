(() => {
    const title = document.querySelector("#dcg-graph-title-text").textContent;

    // https://www.desmos.com/api/v1.11/docs/index.html#document-saving-and-loading
    const graph = JSON.stringify(Calc.getState());
    const blob = new Blob([graph], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.download = `${title}.json`;
    anchor.href = URL.createObjectURL(blob);
    anchor.type = "application/json";
    anchor.click();

    // Immediately revoking the object URL seems to work fine.
    URL.revokeObjectURL(anchor.href);
})();
