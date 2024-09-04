(() => {
    // Normalize subreddit and user names.
    const name = prompt("Enter subreddit name or 'u/<username>':")
        .replaceAll(/^[ /]+/g, "")
        .toLowerCase();
    // Don't add a prefix if the name already includes one.
    const prefix = name.startsWith("r/") || name.startsWith("u/") ? "" : "r/";
    location.assign("https://old.reddit.com/" + prefix + name);
})();
