import { opr } from "db.js";
import { sendFile } from "send-file.js";
import { conns } from "credits.js";

export const addContent = async (type, body) => {
                const id = await cid(body);
                opr.crud({ store: "contents", op: "get", rec: id, callback: async rec => {
                    if (rec) return;
                    const newRec = { id, body, date: Date.now() };
                    if(body.type == "text/plain")
                        newRec.tag = Array.from((await body.text()).matchAll(tagPtn))
                            .map(result => result[1]);
                    opr.crud({ store: "contents", op: "add", rec: newRec, callback: display });
                    for (const id in conns) sendFile(conns[id], body);
                });
    };