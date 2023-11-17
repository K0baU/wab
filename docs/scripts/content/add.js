import { cid } from "./id.js";
import { opr } from "../lib/db.js";
import { tagPtn } from "./patterns.js";
import { showAll } from "./show-all.js";
import { send } from "./send.js";
import { conns } from "../lib/connect.js";

export const addContent = async (type, body) => {
                const id = await cid(body);
                opr.crud({ store: "contents", op: "get", rec: id, callback: async rec => {
                    if (rec) return;
                    const newRec = { id, body, date: Date.now() };
                    if(body.type == "text/plain")
                        newRec.tag = Array.from((await body.text()).matchAll(tagPtn))
                            .map(result => result[1]);
                    opr.crud({ store: "contents", op: "add", rec: newRec, callback: showAll });
                    for (const id in conns) sendFile(conns[id], body);
                } });
    };
