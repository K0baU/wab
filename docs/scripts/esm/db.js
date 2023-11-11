import { log } from "./log.js";

let db;
const queue = [];
const dbReq = indexedDB.open("Storage", 99);
dbReq.onsuccess = e => {
    log("database opened");
    e.target.result.onerror = event => log(event.target.error);
    db = e.target.result;
    for(const q in queue) {
        q.f(q.args);
    }
};
dbReq.onerror = event => log(event.target.error);
export const opr = {
        for: ({ store, index, range, direction, f, end }) => {
            if(!db) {
                queue.push({ f: opr.for, args: { store, index, range, direction, f, end } })
                return;
            };
            const objStore = db.transaction(store).objectStore(store);
            const req = index ? objStore.index(index).openCursor(range) : objStore.openCursor(range);
            req.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    f(cursor.value, cursor.key);
                    cursor.continue();
                }
            }
            req.transaction.oncomplete = end;
        },
        crud: ({ store, op, rec, callback }) => {
            if(!db) {
                queue.push({ f: opr.crud, args: { store, op, rec, callback } })
                return;
            };
            const objStore = db.transaction(store, op == "get" ? "readonly" : "readwrite").objectStore(store);
            ((!(objStore.keyPath || objStore.autoIncrement) && ["add", "put"].includes(op)) ? objStore[op](rec.body, rec.id) : objStore[op](rec))
                .onsuccess = e => {
                    if (callback) callback(op == "get" ? e.target.result : rec);
                };
        }
    };
dbReq.onupgrade = (event) => {
    log("upgrade DB");
    const db = event.target.result;
    const tx = event.target.transaction;
    const init = [];
    const createContentsStore = async () => {
        const contents = db.createObjectStore("contents", { keyPath: "id" });
        contents.createIndex("date", "date");
        contents.createIndex("tag", "tag", { multiEntry: true });
        for (const rec of init) opr.crud("contents", "add", rec);
    };
    if (event.oldVersion == 0) createContentsStore();
    else opr.for(tx.objectStore("contents").openCursor(), rec => {
        init.push(rec);
    }, () => {
            log("delete objectStore 'contents'");
            db.deleteObjectStore("contents");
            createContentsStore();
        }
    });
    try {
        db.deleteObjectStore("index");
    } catch (error) { }
    try {
        db.createObjectStore("credits", { keyPath: "id" });
    } catch (error) { }
    try {
        db.createObjectStore("keypairs");
    } catch (error) { }
};