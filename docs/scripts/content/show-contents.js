import { doc } from "../lib/doc.js";
import { opr } from "../lib/db.js";
import { showAContent } from "./show-a-content.js";
import { decodeId } from "./id.js";
import { aPtn, tagPtn } from "./patterns.js";

const messageInput = doc("messageInput");
export const getThread = (content = messageInput.value) => {
    const anchor = content.match(aPtn);
    if (!anchor) return false;
    const id = decodeId(anchor[1]);
    opr.crud({ store: "contents", op: "get", rec: id, callback: async rec => {
        showAContent(rec);
        getThread(await rec.body.text());
    } });
    return true;
};
export const getTag = () => {
    const tag = messageInput.value.match(tagPtn);
    if (!tag) return false;
    opr.for({ store: "contents", index:"tag", range: IDBKeyRange.only(tag[1]), f: showAContent});
    return true;
};

export const showContents = () => {
    doc("contentsUl").textContent = "";
    if (!getThread()) if (!getTag()) {
        opr.for({ store: "contents", index:"date", direction: "prev", f: showAContent});
    }
};

showContents();
messageInput.value = showContents;