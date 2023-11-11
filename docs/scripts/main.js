import { log } from "./esm/log.js";
import { doc } from "./esm/doc.js";
import { opr } from "./esm/db.js";
import { displayContent } from "./esm/content-to-html.js";
import { displayPeer } from "./esm/peer-to-html.js";
import { getThread, getTag } from "./esm/search.js";

window.onerror = log;
    const display = () => {
        log("display");
        doc.contents.textContent = "";
        if (!getThread(doc.messageInputBox.value)) if (!getTag()) {
            opr.for({ store: "contents", index:"date", direction: "prev", f: displayContent});
        }
    };
    display();
    opr.for({ store: "credits", f: value => {
        if (value.name == "" && value.credit == 0) {
            opr.crud({store:"credits",op:"delete"});
        }
    }, end: () => opr.for({ store: "credits", f: displayPeer }) });
    doc.messageInputBox.oninput = display;