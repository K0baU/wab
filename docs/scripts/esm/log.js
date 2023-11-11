export const log = (text) => {
    const p = document.createElement("p");
    p.append(text);
    doc.logElm.append(p);
};