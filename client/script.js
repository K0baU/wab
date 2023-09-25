const host = document.location.host;

const doc = {
    left: document.getElementById('left'),
    center: document.getElementById('center'),
    right: document.getElementById('right'),
    sendForm: document.getElementById('sendForm'),
    messageInputBox: document.getElementById('message'),
    receiveBox: document.getElementById('receivebox'),
    idElm: document.getElementById('id'),
    idSmr: document.getElementById('idSmr'),
    logElm: document.getElementById('log'),
    amountIn: document.getElementById('amount'),
    withdraw: document.getElementById('withdraw'),
    creditForm: document.getElementById('credits'),
};
const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const log = (text) => {
    const p = document.createElement("p");
    p.append(text);
    doc.logElm.append(p);
};

const conns = {};
const chs = {};
let creditOuts = {}, onlines = {};
const onlineMsg = "🟢オンライン";
const targets = [];

const dbReq = indexedDB.open("Storage", 35);
dbReq.onerror = (event) => {
    log(event.target.error);
};
dbReq.onsuccess = (event) => {
    const db = event.target.result;
    const dbOpr = {
        for: (store, f, end) => {
            const req = db.transaction([store]).objectStore(store).openCursor();
            req.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    f(cursor.value);
                    cursor.continue();
                } else {
                    if (end) end();
                }
            }
            req.onerror = (event) => {
                log(`Database error: ${event.target.error}`);
            };
        },
        get: (store, id, callback) => {
            const req = db.transaction([store]).objectStore(store).get(id);
            req.onsuccess = (event) => callback(event.target.result);
            req.onerror = (event) => {
                log(`Database error: ${event.target.error}`);
            };
        },
        add: (store, rec, callback) => {
            const req = db.transaction([store], "readwrite").objectStore(store).add(rec)
            req.onsuccess = () => {
                if (callback) callback(rec);
            };
            req.onerror = (event) => {
                if (event.target.error.name == "ConstraintError") {
                    return;
                }
                log(`Database error: ${event.target.error}`);
            };
        },
        put: (store, rec, callback) => {
            const req = db.transaction([store], "readwrite").objectStore(store).put(rec);
            req.onsuccess = () => {
                if (callback) callback(rec);
            };
            req.onerror = (event) => {
                log(`Database error: ${event.target.error}`);
            };
        }
    };
    dbOpr.for("credits", (value) => {
        if (value.name == "" && value.credit == 0) {
            db.transaction(["credits"], "readwrite").objectStore("credits").delete(value.id).onerror = (event) => {
                log(`Database error: ${event.target.error}`);
            };
        }
    }, () => display("credits"));
    const displayNewPeer = (record) => {
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "target";
        radio.id = record.id;
        radio.value = record.id;
        doc.creditForm.append(radio);
        const peerLbl = document.createElement("label");
        doc.creditForm.append(peerLbl);
        peerLbl.htmlFor = record.id;
        const peerIdElm = document.createElement("details");
        peerLbl.append(peerIdElm);
        const peerIdSmr = document.createElement("summary");
        peerIdElm.append(peerIdSmr);
        peerIdSmr.append(record.id.slice(0, 4) + "...");
        peerIdElm.append(record.id);
        const online = document.createElement("output");
        peerLbl.append(online);
        if (chs[record.id]) {
            online.append(onlineMsg);
        }
        onlines[record.id] = online;
        const renameForm = document.createElement("form");
        peerLbl.append(renameForm);
        const renameInput = document.createElement("input"), renameBtn = document.createElement("button");
        renameForm.append(renameInput, renameBtn);
        renameInput.value = record.name == "" ? "名無しさん" : record.name;
        renameBtn.append("✎");
        renameForm.onsubmit = (e) => {
            e.preventDefault();
            log(`rename: ${record.name} => ${renameInput.value}`);
            dbOpr.get("credits", record.id, (rec) => {
                rec.name = renameInput.value;
                dbOpr.put("credits", rec);
            });
        };
        const creditOut = document.createElement("output");
        creditOuts[record.id] = creditOut;
        peerLbl.append(creditOut);
        creditOut.value = record.credit;
    }
    const display = (store) => {
        switch (store) {
            case "contents":
                const newList = document.createElement("ul");
                newList.id = "receivebox";
                dbOpr.for(store, (value) => {
                    const li = document.createElement("li");
                    newList.append(li);
                    li.textContent = value.body;
                }, () => {
                    doc.receiveBox.replaceWith(newList);
                    doc.receiveBox = newList;
                });
                break;
            case "credits":
                doc.creditForm.textContent = "";
                dbOpr.for(store, displayNewPeer);
        }
    };
    display("contents");
    const add = (type, body) => {
        switch (type) {
            case "peer":
                const newPeer = { id: body, name: "", credit: 0 };
                dbOpr.add("credits", newPeer, (rec) => displayNewPeer(rec));
                break;
            case "content":
                dbOpr.add("contents", body, () => {
                    const li = document.createElement("li");
                    doc.receiveBox.append(li);
                    li.textContent = body.body;
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
                dbOpr.get("credits", client, (rec) => {
                    rec.credit += amount;
                    dbOpr.put("credits", rec, (rec) => {
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
            dbOpr.get("credits", server, (rec) => {
                rec.credit -= reserved;
                dbOpr.put("credits", rec, (rec) => {
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
            user = await window.crypto.subtle.generateKey(
                {
                    name: "ECDSA",
                    namedCurve: "P-384",
                },
                true,
                ["sign", "verify"],
            );
        }
        window.crypto.subtle.exportKey("jwk", user.publicKey).then((pub) => {
            db.transaction(["keypairs"], "readwrite").objectStore("keypairs").add(user, pub.x + pub.y).onerror = (event) => {
                if (event.target.error.name == "ConstraintError") {
                    return;
                }
                log(`Database error: ${event.target.error}`);
            };
            doc.idSmr.append(pub.x.slice(0, 4) + "...");
            doc.idElm.append(pub.x + pub.y);
            const wshost = 'wss://' + host;
            let socket = new WebSocket(wshost);
            const socketSend = (obj) => socket.send(JSON.stringify(obj));
            socket.onopen = () => {
                log("socket opened");
                socketSend({ type: "id", body: pub.x + pub.y });
            };

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
                        if (await window.crypto.subtle.verify(
                            {
                                name: "ECDSA",
                                hash: { name: "SHA-384" },
                            },
                            await window.crypto.subtle.importKey(
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
                            dbOpr.for("credits", rec => {
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
                    dbOpr.for("contents", (value) => ch.send(JSON.stringify({ type: "content", body: value })));
                };
                ch.onmessage = (e) => receive(e, id);
            };
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
                                        sign: Array.from(new Uint8Array(await window.crypto.subtle.sign(
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
            socket.onmessage = (e) => receive(e);
            socket.onclose = () => {
                log("socket closed");
                log("reconnecting to server");
                socket = new WebSocket(wshost);
            }

            // Set event listeners for user interface widgets

            doc.sendForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                var message = doc.messageInputBox.value;
                const content = {
                    id: (new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message)))).toString(),
                    body: message
                };
                add("content", content);
                for (const id in chs) {
                    chs[id].send(JSON.stringify({ type: "content", body: content }));
                }

                // Clear the input box and re-focus it, so that we're
                // ready for the next message.

                doc.messageInputBox.value = "";
                doc.messageInputBox.focus();
            });
        });
        doc.withdraw.onclick = () => {
            const id = (new FormData(doc.creditForm)).get("target");
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
        const id = (new FormData(doc.creditForm)).get("target");
        const amount = Number(doc.amountIn.value);
        dbOpr.get("credits", id, (rec) => {
            const newRec = rec;
            newRec.credit += amount * multiplier;
            dbOpr.put("credits", newRec, () => {
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

    try {
        db.deleteObjectStore("contents");
    } catch (error) { }
    try {
        db.deleteObjectStore("credits");
    } catch (error) { }
    try {
        db.deleteObjectStore("keypairs");
    } catch (error) { }
    // このデータベース用の objectStore を作成します
    db.createObjectStore("contents", { keyPath: "id" });
    db.createObjectStore("credits", { keyPath: "id" });
    db.createObjectStore("keypairs");
};

const jokes = [
    "バズるとは、拡散回数が5の倍数になること。15の倍数ならフィズバズるという。",
    "ああ、NaNでもない。",
    "ここでの通貨単位はDn(ダンゴ)である。1024Dn=1KiDn(キビダンゴ)。",
    "キビダンゴ1つで、不信感が半分になる。鬼退治のためにたくさん用意しておこう。",
    "忘れられる権利などないのだよ、Mr.ロックハート。",
    "経験値がインフレするのは必然だ。expなんだから。",
    "同志イーロンマスク万歳！",
    "AIの発達により、知能は予定外の急速分解を起こすだろう。",
    "インスタントコーヒーが418を駆逐する。",
    "過去の改変は高くつくだろう。",
    "火星先住民は皆8本足だ。火星先住民は皆2本足だ。",
    "神は死んだ。が、バックアップを忘れなかった。"
];
doc.messageInputBox.placeholder = jokes[Math.floor(Math.random() * jokes.length)];
const hide = () => {
    doc.left.style.display = "none";
    doc.center.style.display = "none";
    doc.right.style.display = "none";
};
document.getElementById("showLeft").onclick = () => {
    hide();
    doc.left.style.display = "block";
}
document.getElementById("showCenter").onclick = () => {
    hide();
    doc.center.style.display = "block";
}
document.getElementById("showRight").onclick = () => {
    hide();
    doc.right.style.display = "block";
}