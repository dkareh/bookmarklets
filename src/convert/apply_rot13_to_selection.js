(() => {
    const selection = getSelection();
    const liveRanges = getRanges(selection);

    // The live ranges will be updated as we mutate the node tree, so in order
    // to preserve the user's selection, we need to make static copies.
    const staticRanges = liveRanges.map((range) => new StaticRange(range));

    // Collect all selected pieces before mutating the node tree.
    const pieces = liveRanges.flatMap(collectSelectedPieces);

    // Then, mutate the selected pieces all at once.
    for (const piece of pieces) rot13Piece(piece);

    // Restore the user's selection.
    selection.removeAllRanges();
    for (const staticRange of staticRanges) {
        // SAFETY: `rot13Piece()` does not invalidate any static ranges.
        const liveRange = new Range();
        liveRange.setStart(staticRange.startContainer, staticRange.startOffset);
        liveRange.setEnd(staticRange.endContainer, staticRange.endOffset);
        selection.addRange(liveRange);
    }

    function getRanges(selection) {
        const ranges = [];
        for (let i = 0; i < selection.rangeCount; ++i)
            ranges.push(selection.getRangeAt(i));
        return ranges;
    }

    // `range` must implement the `Range` interface; it cannot be static.
    // Based on https://dom.spec.whatwg.org/#dom-range-stringifier:
    function collectSelectedPieces(range) {
        const pieces = [];
        if (isTextNode(range.startContainer)) {
            if (range.startContainer == range.endContainer) {
                pieces.push([range.startContainer, range.startOffset, range.endOffset]);
                return pieces;
            } else {
                pieces.push([range.startContainer, range.startOffset]);
            }
        }
        // Collect text nodes that are completely contained in `range`.
        const nodes = collectContainedTextNodes(range);
        pieces.push(...nodes.map((node) => [node]));
        if (isTextNode(range.endContainer)) {
            pieces.push([range.endContainer, 0, range.endOffset]);
        }
        return pieces;
    }

    // `range` must implement the `Range` interface; it cannot be static.
    // Based on https://dom.spec.whatwg.org/#dom-range-stringifier:
    function collectContainedTextNodes(range) {
        const iterator = document.createNodeIterator(
            range.commonAncestorContainer,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_CDATA_SECTION,
        );
        const nodes = [];
        for (let node = iterator.nextNode(); node != null; node = iterator.nextNode())
            if (nodeIsContainedInRange(node, range)) nodes.push(node);
        return nodes;
    }

    // `range` must implement the `Range` interface; it cannot be static.
    // Based on https://dom.spec.whatwg.org/#contained:
    function nodeIsContainedInRange(node, range) {
        const nodeRange = new Range();
        nodeRange.selectNodeContents(node);
        return (
            nodeRange.compareBoundaryPoints(Range.START_TO_START, range) == 1 &&
            nodeRange.compareBoundaryPoints(Range.END_TO_END, range) == -1
        );
    }

    function isTextNode(node) {
        const textNodeTypes = [Node.TEXT_NODE, Node.CDATA_SECTION_NODE];
        return textNodeTypes.includes(node.nodeType);
    }

    // SAFETY: This function must not invalidate any static ranges.
    function rot13Piece([textNode, start = 0, end = textNode.length]) {
        const text = textNode.substringData(start, end - start);
        textNode.replaceData(start, end - start, rot13(text));
    }

    function rot13(text) {
        return text.replaceAll(/[A-Za-z]/g, (letter) => {
            const isUpperCase = "A" <= letter && letter <= "Z";
            const origin = (isUpperCase ? "A" : "a").codePointAt(0);
            const index = (letter.codePointAt(0) - origin + 13) % 26;
            return String.fromCodePoint(origin + index);
        });
    }
})();
