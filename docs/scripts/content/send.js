import { cid } from "./id.js";

const chs = new Map();
export const send = (con, file) => {
    const ch = con.createDataChannel("");
    const chid = crypto.randomUUID();
    ch.onopen = async () => {
        const ch = chs.get(chid);
        ch.send(JSON.stringify({ type: "mime", body: { cid: await cid(file), type: file.type } }));
        ch.send(await file.arrayBuffer());
        chs.delete(chid);
    }
    chs.set(chid,ch);
};