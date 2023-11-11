import { doc, addDOM } from "/scripts/esm/doc.js";
import { encodeId } from "/scripts/esm/id.js";
const HTMLify = (str, ptns) => {
        return ptns.reduce((prev, ptn) =>
            prev.replaceAll(RegExp(ptn, "g"), match =>
                `<button type="button" onclick="
                    arguments[0].stopImmediatePropagation();
                    const box=document.getElementById('message');
                    box.value += '${match.replaceAll("\n", " ")}';
                    box.dispatchEvent(new InputEvent('input'));
                    box.focus();">${match}</button>`
            )
            , str);
    };

export const displayContent = async result => {
        const li = document.createElement("li");
        doc.contents.append(li);    
        addDOM(li, [{ tag: "span", content: (new Date(result.date)).toLocaleString("ja") }]);
        const file = result.body;
        switch (file.type.split("/")[0]) {
            case "text":
                const p = document.createElement("p");
                p.innerHTML = HTMLify(await file.text(), [aPtn, tagPtn]);
                addDOM(li, [p]);
                li.onclick = () => {
                    if (getSelection().toString()) return;
                    doc.messageInputBox.value += `>>${encodeId(id)} `;
                    doc.messageInputBox.dispatchEvent(new InputEvent('input'));
                    doc.messageInputBox.focus();
                };
                break;
            case "image":
                const img = document.createElement("img");
                img.src = URL.createObjectURL(file);
                img.onload = () => {
                    URL.revokeObjectURL(img.src);
                };
                addDOM(li, [img]);
                break;
            case "video":
                const video = document.createElement("video");
                video.src = URL.createObjectURL(file);
                video.controls = true;
                video.onload = () => {
                    URL.revokeObjectURL(video.src);
                };
                addDOM(li, [video]);
                break;
            default:
                break;
        }
    };