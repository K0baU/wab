const doc = {
    left: document.getElementById('left'),
    center: document.getElementById('center'),
    right: document.getElementById('right'),
    sendForm: document.getElementById('sendForm'),
    messageInputBox: document.getElementById('message'),
    contents: document.getElementById('receivebox'),
    idElm: document.getElementById('id'),
    idSmr: document.getElementById('idSmr'),
    logElm: document.getElementById('log'),
    amountIn: document.getElementById('amount'),
    withdraw: document.getElementById('withdraw'),
    credits: document.getElementById('credits'),
};
const aPtn = ">>(\\S{32})(?:\\s|$)";
const tagPtn = "#([^#\\s]+)(?:\\s|$)";
let creditOuts = {}, onlines = {};
const log = (text) => {
    const p = document.createElement("p");
    p.append(text);
    doc.logElm.append(p);
};
const chars = "234679abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXYZあいうえおかきくけこさしすせそたちつてとなにぬねのはひふほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶぼぱぴぷぽアイウオキクケコサシスセソチツテトナヌネノハヒフホマムメモヤユヨラリルレワヲンガギグゲゴザジズゼゾダヂヅデドバビブボパピプポ右雨円王音下火花貝学気九休玉金空月犬見五校左山子四糸字耳七車手十出女小上森人水正生青石赤千川先早草足村大男竹中虫町天田土日入年白八百文木本名目立林六";
const encodeId = (str) => {
    const arr = str.split(",");
    let rtn = "";
    for (const n of arr) {
        rtn += chars[n];
    }
    return rtn;
};
const decodeId = (str) => {
    const arr = [];
    for (let i = 0; i < str.length; i++) {
        arr.push(chars.indexOf(str[i]));
    }
    return arr.toString();
}
const nomeDateArr = date => {
    switch (typeof date) {
        case "string":
            if (Number.isNaN(Date.parse(date))) {
                return date.split(",").map(d => Date.parse(d) || new Date(d).getTime());
            }
        case "undefined":
        case "number":
            return [new Date(date).getTime() || Date.now()];
        case "object":
            switch (Object.prototype.toString.call(date)) {
                case "[object Set]":
                case "[object Array]":
                case "[object Map]":
                    return Array.from(new Set(Array.from(date).map(d => nomeDateArr(d)[0]))).sort();
                case "[object Date]":
                    return [date.getTime()];
            }
        default:
            return [Date.now()];
    }
};
const normalize = async rec => {
    rec.id = (new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rec.body)))).toString();
    rec.date = nomeDateArr(rec.date);
    rec.tag = Array.from(rec.body.matchAll(tagPtn)).map(cg => [cg[1], -rec.date[0]]);
    return rec;
};
const changeMsgBox = (txt, replace) => {
    if (replace) {
        doc.messageInputBox.value = txt;
    } else {
        doc.messageInputBox.value += txt;
    }
    doc.messageInputBox.dispatchEvent(new InputEvent('input'));
    doc.messageInputBox.focus();
};

// db
{
    const dbReq = indexedDB.open("Storage", 39);
    dbReq.onerror = (event) => {
        log(event.target.error);
    };
    dbReq.onsuccess = (event) => {
        log("database opened");
        const db = event.target.result;
        const dbOpr = {
            for: (store, mode, f, end) => {
                const req = typeof mode == "string" ? db.transaction(store, mode).objectStore(store).openCursor() : mode;
                req.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        f(cursor.value, cursor.key);
                        cursor.continue();
                    }
                }
                req.onerror = (event) => {
                    log(`Database error: ${event.target.error}`);
                };
                req.transaction.oncomplete = end;
            },
            crud: (store, opr, rec, callback) => {
                const req = db.transaction(store, opr == "get" ? "readonly" : "readwrite").objectStore(store)[opr](rec);
                req.onsuccess = e => {
                    if (callback) callback(opr == "get" ? e.target.result : rec);
                };
                req.onerror = (event) => {
                    log(`Database error: ${event.target.error}`);
                };
            }
        };
        const chs = {};
        const onlineMsg = "🟢オンライン";
        const addDOM = (par, children) => {
            for (const child of children) {
                if (child.tag) {
                    const elm = document.createElement(child.tag);
                    elm.append(child.content);
                    par.append(elm);
                } else {
                    par.append(child);
                }
            }
        };
        const replaceWithBtn = (str, ptns) => {
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
        const displayNewContent = (rec, date = rec.date.at(-1), mode = "append") => {
            const li = document.createElement("li");
            doc.contents[mode](li);
            const p = document.createElement("p");
            p.innerHTML = replaceWithBtn(rec.body, [aPtn, tagPtn]);
            addDOM(li, [{ tag: "span", content: (new Date(date)).toLocaleString("ja") }, p]);
            li.onclick = () => {
                if (getSelection().toString()) {
                    return;
                }
                changeMsgBox(`>>${encodeId(rec.id)} `, false);
            };
        };
        const displayNewPeer = (record) => {
            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "target";
            radio.id = record.id;
            radio.value = record.id;
            const peerLbl = document.createElement("label");
            addDOM(doc.credits, [radio, peerLbl]);
            peerLbl.htmlFor = record.id;
            const peerIdElm = document.createElement("details");
            addDOM(peerIdElm, [{ tag: "summary", content: record.id.slice(0, 4) + "..." }, record.id]);
            const online = document.createElement("output");
            if (chs[record.id]) {
                online.append(onlineMsg);
            }
            onlines[record.id] = online;
            const renameForm = document.createElement("form");
            const renameInput = document.createElement("input");
            addDOM(renameForm, [renameInput, { tag: "button", content: "✎" }])
            renameInput.value = record.name == "" ? "名無しさん" : record.name;
            renameForm.onsubmit = (e) => {
                e.preventDefault();
                log(`rename: ${record.name} => ${renameInput.value}`);
                dbOpr.crud("credits", "get", record.id, (rec) => {
                    rec.name = renameInput.value;
                    dbOpr.crud("credits", "put", rec);
                });
            };
            const creditOut = document.createElement("output");
            creditOuts[record.id] = creditOut;
            creditOut.value = record.credit;
            addDOM(peerLbl, [peerIdElm, online, renameForm, creditOut]);
        }
        const getThread = (content, isDeep) => {
            const anchor = content.match(aPtn);
            if (!anchor) return false;
            dbOpr.crud("contents", "get", decodeId(anchor[1]), (rec) => {
                if (!isDeep) doc.contents.textContent = "";
                displayNewContent(rec);
                getThread(rec.body, true);
            });
            return true;
        };
        const getTag = (content) => {
            const tag = content.match(tagPtn);
            if (!tag) return false;
            doc.contents.textContent = "";
            dbOpr.for("contents",
                db.transaction("contents").objectStore("contents").index("tag").openCursor(
                    IDBKeyRange.bound([tag[1]], [tag[1].slice(0, -1) + String.fromCharCode(tag[1].slice(-1).charCodeAt() + 1)], false, true)),
                v => displayNewContent(v));
            return true;
        };
        const display = () => {
            if (!getThread(doc.messageInputBox.value)) if (!getTag(doc.messageInputBox.value)) {
                doc.contents.textContent = "";
                dbOpr.for("contents", db.transaction("contents").objectStore("contents").index("date").openCursor(undefined, "prev"),
                    displayNewContent);
            }
        };
        const displayPeers = () => dbOpr.for("credits", "readonly", displayNewPeer);
        let pending = 0;
        dbOpr.for("contents", "readonly", async value => {
            pending++;
            dbOpr.crud("contents", "delete", value.id, async () => dbOpr.crud("contents", "add", await normalize(value), () => {
                pending--;
                if (pending <= 0) {
                    display();
                }
            }));
        });
        dbOpr.for("credits", "readonly", (value) => {
            if (value.name == "" && value.credit == 0) {
                db.transaction(["credits"], "readwrite").objectStore("credits").delete(value.id).onerror = (event) => {
                    log(`Database error: ${event.target.error}`);
                };
            }
        }, displayPeers);
        doc.messageInputBox.oninput = display;
        const add = async (type, body) => {
            switch (type) {
                case "peer":
                    const newPeer = { id: body, name: "", credit: 0 };
                    dbOpr.crud("credits", "add", newPeer, (rec) => displayNewPeer(rec));
                    break;
                case "content":
                    await normalize(body);
                    dbOpr.crud("contents", "get", body.id, async (rec) => {
                        let newRec;
                        if (rec) {
                            await normalize(rec);
                            const dateSet = new Set();
                            for (const d of rec.date.values()) {
                                dateSet.add(d);
                            }
                            for (const d of body.date.values()) {
                                dateSet.add(d);
                            }
                            rec.date = Array.from(dateSet).sort();
                            newRec = rec;
                        } else newRec = body;
                        dbOpr.crud("contents", "put", newRec);
                        displayNewContent(newRec, undefined, "prepend");
                    });
                    break;
                default:
                    break;
            }
        };
        class Withdrawing {
            constructor(id, amount) {
                this.mine = amount > 0;
                this.id = id;
                this.amount = amount || 0;
                this.withdrawn = 0;
                this.clients = {};
                this.servers = {};
            }
            registerClient(client, amount) {
                this.clients[client] = (this.clients[client] || 0) + amount;
                if (!this.mine) this.amount += amount;
            }
            registerServer(server, amount) {
                this.servers[server] = (this.servers[server] || 0) + amount;
                this.withdrawn += amount;
                if (this.withdrawn >= this.amount) {
                    if (this.mine) {
                        for (const server in this.servers) {
                            this.exe(server, this.servers[server]);
                        }
                    } else {
                        this.res();
                    }
                }
            }
            res() {
                let reserved = 0;
                for (const client in this.clients) {
                    const amount = Math.min(this.clients[client], this.withdrawn - reserved);
                    chs[client].send(JSON.stringify({
                        type: "withdraw:res",
                        body: { id: this.id, amount }
                    }));
                    reserved += amount;
                }
            }
            exe(server, total) {
                let reserved = 0;
                for (const client in this.clients) {
                    const amount = Math.min(this.clients[client], total - reserved);
                    dbOpr.crud("credits", "get", client, (rec) => {
                        rec.credit += amount;
                        dbOpr.crud("credits", "put", rec, (rec) => {
                            creditOuts[rec.id].value = rec.credit;
                        });
                    });
                    chs[client].send(JSON.stringify({
                        type: "withdraw:exe",
                        body: { id: this.id, amount }
                    }));
                    this.clients[client] -= amount;
                    reserved += amount;
                }
                dbOpr.crud("credits", "get", server, (rec) => {
                    rec.credit -= reserved;
                    dbOpr.crud("credits", "put", rec, (rec) => {
                        creditOuts[rec.id].value = rec.credit;
                    });
                });
            }
        }
        const ts = new Map();
        const kpReq = db.transaction(["keypairs"]).objectStore("keypairs").openCursor();
        kpReq.onsuccess = async (event) => {
            const cursor = event.target.result;
            let user;
            if (cursor) {
                user = cursor.value;
            } else {
                user = await crypto.subtle.generateKey(
                    {
                        name: "ECDSA",
                        namedCurve: "P-384",
                    },
                    true,
                    ["sign", "verify"],
                );
            }
            crypto.subtle.exportKey("jwk", user.publicKey).then((pub) => {
                db.transaction(["keypairs"], "readwrite").objectStore("keypairs").add(user, pub.x + pub.y).onerror = (event) => {
                    if (event.target.error.name == "ConstraintError") {
                        return;
                    }
                    log(`Database error: ${event.target.error}`);
                };
                doc.idSmr.append(pub.x.slice(0, 4) + "...");
                doc.idElm.append(pub.x + pub.y);
                const wshost = 'wss://' + document.location.host;
                let socket = new WebSocket(wshost);
                const socketSend = (obj) => socket.send(JSON.stringify(obj));

                const targets = [];
                const receive = async (e, sender) => {
                    const data = JSON.parse(e.data);
                    const tid = data.body.id;
                    const wd = ts.get(tid) || new Withdrawing(tid);
                    switch (data.type) {
                        case "peer":
                            const id = data.body;
                            if (id == pub.x + pub.y) {
                                break;
                            }
                            setupConn(id);
                            break;
                        case "description":
                            if (await crypto.subtle.verify(
                                {
                                    name: "ECDSA",
                                    hash: { name: "SHA-384" },
                                },
                                await crypto.subtle.importKey(
                                    "jwk",
                                    data.body.pub,
                                    {
                                        name: "ECDSA",
                                        namedCurve: "P-384",
                                    },
                                    true,
                                    ["verify"],
                                ),
                                new Uint8Array(data.body.sign).buffer,
                                (new TextEncoder()).encode(data.body.descriptionStr),
                            )) {
                                const description = JSON.parse(data.body.descriptionStr);
                                setupConn(data.body.pub.x + data.body.pub.y, description);
                            };
                            break;
                        case "content":
                            add("content", data.body);
                            break;
                        case "withdraw:req":
                            if (wd.mine) {
                                const amount = Math.min(data.body.amount, wd.amount - wd.withdrawn);
                                wd.registerClient(sender, data.body.amount);
                                chs[sender].send(JSON.stringify({
                                    type: "withdraw:res",
                                    body: { id: tid, amount }
                                }));
                            } else {
                                const target = { id: tid, similarity: 0 };
                                target.similarity = Math.random();
                                const index = targets.findIndex(t => t.similarity < target.similarity);
                                if (index >= 0) {
                                    targets.splice(index, 0, target);
                                } else {
                                    targets.push(target);
                                }
                                if (targets.length > 4) {
                                    const popped = targets.pop();
                                    ts.get(popped.id).res();
                                    if (index == -1) {
                                        break;
                                    }
                                }
                                wd.registerClient(sender, data.body.amount);
                                ts.set(tid, wd);
                                dbOpr.for("credits", "readonly", rec => {
                                    if (rec.credit > 0) {
                                        chs[rec.id].send(JSON.stringify({
                                            type: data.type,
                                            body: { id: tid, amount: Math.min(data.body.amount, rec.credit) }
                                        }));
                                        wd.servers[rec.id] = 0;
                                    }
                                });
                            }
                            break;
                        case "withdraw:res":
                            ts.get(tid).registerServer(sender, data.body.amount);
                            break;
                        case "withdraw:exe":
                            if (!wd.mine) wd.exe(sender, data.body.amount);
                            break;
                        default:
                            break;
                    }
                };
                const openConn = (id, ch) => {
                    ch.onopen = () => {
                        chs[id] = ch;
                        dbOpr.for("contents", "readonly", (value) => ch.send(JSON.stringify({ type: "content", body: value })));
                    };
                    ch.onmessage = (e) => receive(e, id);
                };
                const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
                const conns = {};
                const setupConn = (id, description) => {
                    if (description && description.type == "answer") {
                        conns[id].setRemoteDescription(description);
                        delete conns[id];
                        return;
                    }
                    // Create the local connection and its event listeners
                    const con = new RTCPeerConnection(config);
                    con.onconnectionstatechange = () => {
                        log(con.connectionState);
                        switch (con.connectionState) {
                            case "connected":
                                if (creditOuts[id]) {
                                    onlines[id].textContent = onlineMsg;
                                } else {
                                    add("peer", id);
                                }
                                break;
                            case "disconnected":
                                onlines[id].textContent = "";
                                delete chs[id];
                                break;
                        }
                    };
                    // Set up the ICE candidates for the two peers
                    con.onicecandidate = async e => {
                        if (!e.candidate) {
                            socketSend({
                                type: "transport", body: {
                                    payload: {
                                        type: "description", body: {
                                            descriptionStr: JSON.stringify(con.localDescription),
                                            sign: Array.from(new Uint8Array(await crypto.subtle.sign(
                                                {
                                                    name: "ECDSA",
                                                    hash: { name: "SHA-384" },
                                                },
                                                user.privateKey,
                                                (new TextEncoder()).encode(JSON.stringify(con.localDescription)),
                                            ))),
                                            pub
                                        }
                                    }, to: id
                                }
                            });
                        }
                    }
                    if (!description) {
                        conns[id] = con;
                        // Create the data channel and establish its event listeners
                        openConn(id, con.createDataChannel("sendChannel"))

                        con.createOffer()
                            .then(offer => {
                                con.setLocalDescription(offer);
                            })
                    } else {
                        con.ondatachannel = (event) => {
                            openConn(id, event.channel);
                        };
                        new Promise((resolve, reject) => { resolve(description) })
                            .then((offer) => con.setRemoteDescription(offer))
                            .then(() => con.createAnswer())
                            .then(answer => {
                                con.setLocalDescription(answer);
                            });
                    }
                }
                const setupWs = () => {
                    socket.onopen = () => {
                        log("socket opened");
                        socketSend({ type: "id", body: pub.x + pub.y });
                    };
                    socket.onmessage = (e) => receive(e);
                    socket.onclose = () => {
                        log("socket closed");
                        log("reconnecting to server");
                        socket = new WebSocket(wshost);
                        setupWs();
                    }
                };
                setupWs();
                // submitContent
                {
                    const submitContent = async () => {
                        const content = {
                            body: doc.messageInputBox.value,
                        };
                        add("content", content);
                        for (const id in chs) {
                            chs[id].send(JSON.stringify({ type: "content", body: content }));
                        }

                        changeMsgBox("", true);
                    };
                    doc.sendForm.onsubmit = e => {
                        e.preventDefault();
                        submitContent();
                    };
                    doc.messageInputBox.onkeydown = (e) => {
                        if (e.key == "Enter" && e.metaKey) {
                            submitContent();
                        }
                    }
                }
            });
            doc.withdraw.onclick = () => {
                const id = (new FormData(doc.credits)).get("target");
                const uuid = self.crypto.randomUUID();
                const amount = Number(doc.amountIn.value);
                if (!amount) {
                    return;
                }
                const wd = new Withdrawing(uuid, amount);
                ts.set(uuid, wd);
                chs[id].send(JSON.stringify({
                    type: "withdraw:req",
                    body: {
                        id: uuid,
                        amount: Number(doc.amountIn.value)
                    }
                }));
            };
        };
        kpReq.onerror = (event) => {
            log(`Database error: ${event.target.error}`);
        };
        const increaseCredit = (multiplier) => {
            const id = (new FormData(doc.credits)).get("target");
            const amount = Number(doc.amountIn.value);
            dbOpr.crud("credits", "get", id, (rec) => {
                const newRec = rec;
                newRec.credit += amount * multiplier;
                dbOpr.crud("credits", "put", newRec, () => {
                    log(
                        `${rec.name}: ${rec.credit} => ${newRec.credit} (${multiplier >= 0 ? "+" : "-"}${amount})`
                    );
                    creditOuts[id].value = newRec.credit;
                });
            });
        };
        document.getElementById('plus').onclick = () => {
            increaseCredit(1);
        };
        document.getElementById('minus').onclick = () => {
            increaseCredit(-1);
        };
    };
    // このイベントは最新のブラウザーにのみ実装されています
    dbReq.onupgradeneeded = (event) => {
        // IDBDatabase インターフェイスに保存します
        const db = event.target.result;
        const tx = event.target.transaction;

        try {
            db.createObjectStore("contents", { keyPath: "id" });
        } catch (error) { }
        try {
            tx.objectStore("contents").deleteIndex("date");
        } catch (error) { }
        tx.objectStore("contents").createIndex("date", "date", { multiEntry: true });
        tx.objectStore("contents").createIndex("tag", "tag", { multiEntry: true });
        try {
            db.createObjectStore("credits", { keyPath: "id" });
        } catch (error) { }
        try {
            db.createObjectStore("keypairs");
        } catch (error) { }
    };
}

const jokes = [
    "バズるとは、拡散回数が5の倍数になること。15の倍数ならフィズバズるという。",
    "ああ、NaNでもない。",
    "ここでの通貨単位はDn(ダンゴ)である。1024Dn=1KiDn(キビダンゴ)。",
    "忘れられる権利などないのだよ、Mr.ロックハート。",
    "経験値がインフレするのは必然だ。expなんだから。",
    "同志イーロンマスク万歳！",
    "AIの発達により、知能は予定外の急速分解を起こすだろう。",
    "インスタントコーヒーが418を駆逐する。",
    "過去の改変は高くつくだろう。",
    "火星先住民は皆8本足だ。火星先住民は皆2本足だ。",
    "神は死んだ。が、バックアップを忘れなかった。",
    "文化は暴力である。"
];
doc.messageInputBox.placeholder = jokes[Math.floor(Math.random() * jokes.length)];

// レスポンシブ
{
    const hide = () => {
        doc.left.style.display = "none";
        doc.center.style.display = "none";
        doc.right.style.display = "none";
    };
    document.getElementById("showLeft").onclick = () => {
        hide();
        doc.left.style.display = "flex";
    }
    document.getElementById("showCenter").onclick = () => {
        hide();
        doc.center.style.display = "flex";
    }
    document.getElementById("showRight").onclick = () => {
        hide();
        doc.right.style.display = "block";
    }
}