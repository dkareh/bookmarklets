(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.addEventListener("change", async () => {
        const { files } = input;
        if (!files || files.length < 1) return;
        const shader = await files[0].text();
        gShaderToy.Load(JSON.parse(shader));
    });
    input.click();
})();
