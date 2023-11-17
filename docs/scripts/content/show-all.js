import { doc } from "../lib/doc.js";
import { opr } from "../lib/db.js";
import { showOne } from "./show-one.js";
import { decodeId } from "./id.js";
import { aPtn, tagPtn } from "./patterns.js";

export const getThread = (content) => {
    const anchor = content.match(aPtn);
    if (!anchor) return false;
    const id = decodeId(anchor[1]);
    opr.crud({ store: "contents", op: "get", rec: id, callback: async rec => {
        displayContent(rec);
        getThread(await rec.body.text());
    } });
    return true;
};
export const getTag = () => {
    const tag = doc.messageInputBox.value.match(tagPtn);
    if (!tag) return false;
    opr.for({ store: "contents", index:"tag", range: IDBKeyRange.only(tag[1]), f: displayContent});
    return true;
};

export const showContents = () => {
    doc.contents.textContent = "";
    if (!getThread(doc.messageInputBox.value)) if (!getTag()) {
        opr.for({ store: "contents", index:"date", direction: "prev", f: displayContent});
    }
};

showContents();
doc.messageInputBox = showContents;