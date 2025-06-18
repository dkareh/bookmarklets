(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.addEventListener("change", async () => {
        const { files } = input;
        if (!files || files.length < 1) return;
        const graph = await files[0].text();
        // https://www.desmos.com/api/v1.11/docs/index.html#document-saving-and-loading
        Calc.setState(JSON.parse(graph), { allowUndo: true });
    });
    input.click();
})();
