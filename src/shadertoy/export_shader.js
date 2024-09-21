(() => {
    const shader = JSON.stringify(gShaderToy.Save());
    const blob = new Blob([shader], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.download = `shader${gShaderID ? "_" + gShaderID : ""}.json`;
    anchor.href = URL.createObjectURL(blob);
    anchor.type = "application/json";
    anchor.click();

    // Immediately revoking the object URL seems to work fine.
    URL.revokeObjectURL(anchor.href);
})();
