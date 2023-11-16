import { doc } from "./doc.js";
import { displayContent } from "./content-to-html.js";
import { decodeId } from "./id.js";
import { opr } from "./db.js";

export const aPtn = ">>(\\S{32})(?:\\s|$)";
export const tagPtn = "#([^#\\s]+)(?:\\s|$)";

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