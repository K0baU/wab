import { log } from "./log.js";
import { doc } from "./doc.js";
import { opr } from "./db.js";
import { displayContent } from "./content-to-html.js";
import { displayPeer } from "./peer-to-html.js";
import { getThread, getTag } from "./search.js";

export const display = () => {
        log("display");
        doc.contents.textContent = "";
        if (!getThread(doc.messageInputBox.value)) if (!getTag()) {
            opr.for({ store: "contents", index:"date", direction: "prev", f: displayContent});
        }
    };