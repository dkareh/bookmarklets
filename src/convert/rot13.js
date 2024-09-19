alert(
    prompt("Enter original text:").replaceAll(/[A-Za-z]/g, (letter) => {
        const isUpperCase = "A" <= letter && letter <= "Z";
        const origin = (isUpperCase ? "A" : "a").codePointAt(0);
        const index = (letter.codePointAt(0) - origin + 13) % 26;
        return String.fromCodePoint(origin + index);
    }),
);
