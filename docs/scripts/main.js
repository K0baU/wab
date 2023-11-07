const doc = {
    sendForm: document.getElementById('sendForm'),
    messageInputBox: document.getElementById('message'),
    uploadFile: document.getElementById('file'),
    uploadBtn: document.getElementById('upload'),
    contents: document.getElementById('receivebox'),
    idElm: document.getElementById('id'),
    idSmr: document.getElementById('idSmr'),
    logElm: document.getElementById('log'),
    amountIn: document.getElementById('amount'),
    credits: document.getElementById('credits'),
};
const log = (text) => {
    const p = document.createElement("p");
    p.append(text);
    doc.logElm.append(p);
};
window.onerror = log;
const wshost = "wss://wab.sabae.cc";
const onlineMsg = "🟢オンライン";
const aPtn = ">>(\\S{32})(?:\\s|$)";
const tagPtn = "#([^#\\s]+)(?:\\s|$)";
const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let conns = {}, creditOuts = {}, onlines = {}, mimes = {};
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
const cid = async rec =>
    (new Uint8Array(await crypto.subtle.digest("SHA-256",
        rec.type ? await rec.arrayBuffer() : rec))).toString();
const chs = new Map();
const sendFile = (con, file) => {
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

const init = [];
const dbReq = indexedDB.open("Storage", 99);
dbReq.onerror = event => log(event.target.error);
dbReq.onsuccess = async (event) => {
    log("database opened");
    const db = event.target.result;
    db.onerror = event => log(`Database error: ${event.target.error}`);
    const dbOpr = {
        for: (req, f, end) => {
            req.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    f(cursor.value, cursor.key);
                    cursor.continue();
                }
            }
            req.transaction.oncomplete = end;
        },
        crud: (store, opr, rec, callback) => {
            const objStore = db.transaction(store, opr == "get" ? "readonly" : "readwrite").objectStore(store);
            ((!(objStore.keyPath || objStore.autoIncrement) && ["add", "put"].includes(opr)) ? objStore[opr](rec.body, rec.id) : objStore[opr](rec))
                .onsuccess = e => {
                    if (callback) callback(opr == "get" ? e.target.result : rec);
                };
        }
    };
    for (const rec of init) dbOpr.crud("contents", "add", rec);
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
    const displayNewContent = id => {
        const li = document.createElement("li");
        doc.contents.append(li);
        dbOpr.crud("contents", "get", id, async result => {
            addDOM(li, [{ tag: "span", content: (new Date(cursor.value.date)).toLocaleString("ja") }]);
            const file = result.body;
            switch (file.type.split("/")[0]) {
                case "text":
                    const p = document.createElement("p");
                    p.innerHTML = replaceWithBtn(await file.text(), [aPtn, tagPtn]);
                    addDOM(li, [p]);
                    li.onclick = () => {
                        if (getSelection().toString()) return;
                        doc.messageInputBox.value += `>>${encodeId(id)} `;
                        doc.messageInputBox.dispatchEvent(new InputEvent('input'));
                        doc.messageInputBox.focus();
                    };
                    break;
                case "image":
                    const img = document.createElement("img");
                    img.src = URL.createObjectURL(file);
                    img.onload = () => {
                        URL.revokeObjectURL(img.src);
                    };
                    addDOM(li, [img]);
                    break;
                case "video":
                    const video = document.createElement("video");
                    video.src = URL.createObjectURL(file);
                    video.controls = true;
                    video.onload = () => {
                        URL.revokeObjectURL(video.src);
                    };
                    addDOM(li, [video]);
                    break;
                default:
                    break;
            }
        });
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
        if (conns[record.id]) {
            online.append(onlineMsg);
        }
        onlines[record.id] = online;
        const renameForm = document.createElement("form");
        const renameInput = document.createElement("input");
        addDOM(renameForm, [renameInput, { tag: "button", content: "✍" }])
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
    const getThread = (content) => {
        const anchor = content.match(aPtn);
        if (!anchor) return false;
        const id = decodeId(anchor[1]);
        displayNewContent(id);
        dbOpr.crud("contents", "get", id, async file => {
            getThread(await file.text());
        });
        return true;
    };
    const getTag = () => {
        const tag = doc.messageInputBox.value.match(tagPtn);
        if (!tag) return false;
        dbOpr.for(
            db.transaction("contents").objectStore("contents").index("tag")
                .openKeyCursor(IDBKeyRange.only(tag[1])), (value,key) => displayNewContent(key));
        return true;
    };
    const display = () => {
        log("display");
        doc.contents.textContent = "";
        if (!getThread(doc.messageInputBox.value)) if (!getTag()) {
            log("default view");
            dbOpr.for(db.transaction("contents").objectStore("contents").index("date")
                .openKeyCursor(undefined, "prev"), (value,key) => displayNewContent(key));
        }
    };
    const displayPeers = () => dbOpr.for(
      db.transaction("credits").objectStore("credits").openCursor(), displayNewPeer);
    display();
    dbOpr.for(db.transaction("credits").objectStore("credits").openCursor(), (value) => {
        if (value.name == "" && value.credit == 0) {
            db.transaction(["credits"], "readwrite").objectStore("credits").delete(value.id);
        }
    }, displayPeers);
    doc.messageInputBox.oninput = display;
    const add = async (type, body) => {
        log("add " + type);
        switch (type) {
            case "peer":
                const newPeer = { id: body, name: "", credit: 0 };
                dbOpr.crud("credits", "add", newPeer, (rec) => displayNewPeer(rec));
                break;
            case "content":
                const id = await cid(body);
                dbOpr.crud("contents", "get", id, async rec => {
                    if (rec) return;
                    const newRec = { id, body, date: Date.now() };
                    if(body.type == "text/plain")
                        newRec.tag = Array.from((await body.text()).matchAll(tagPtn))
                            .map(result => result[1]);
                    dbOpr.crud("contents", "add", newRec, display);
                    for (const id in conns) sendFile(conns[id], body);
                });
                break;
            default:
                break;
        }
    };
    // submitContent
    {
        const submitContent = async () => {
            const str = doc.messageInputBox.value;
            const content = new Blob([str], { type: "text/plain" });
            add("content", content);
            doc.messageInputBox.value = "";
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
    // credits
    {
        db.transaction(["keypairs"]).objectStore("keypairs").openCursor().onsuccess = async (event) => {
            const cursor = event.target.result;
            let user, isNew;
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
                isNew = true;
            }
            crypto.subtle.exportKey("jwk", user.publicKey).then((pub) => {
                if (isNew)
                    db.transaction(["keypairs"], "readwrite").objectStore("keypairs").add(user, pub.x + pub.y);
                doc.idSmr.append(pub.x.slice(0, 4) + "...");
                doc.idElm.append(pub.x + pub.y);
                let socket = new WebSocket(wshost);
                const socketSend = (obj) => socket.send(JSON.stringify(obj));

                const receive = async e => {
                    switch (typeof e.data) {
                        case "string":
                            const data = JSON.parse(e.data);
                            switch (data.type) {
                                case "peer":
                                    const id = data.body;
                                    if (id == pub.x + pub.y) {
                                        break;
                                    }
                                    log("offer")
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
                                        log("answer")
                                        setupConn(data.body.pub.x + data.body.pub.y, description);
                                    };
                                    break;
                                case "mime":
                                    mimes[data.body.cid] = data.body.type;
                                    break;
                                default:
                                    break;
                            }
                            break;
                        default:
                            const id = await cid(e.data);
                            if (mimes[id]) {
                                const blob = new Blob([e.data], { type: mimes[id] });
                                add("content", blob);
                            } else log("no mime received");
                            delete mimes[id];
                            break;
                    }
                };
                const setupConn = (id, description) => {
                    if (description && description.type == "answer") {
                        conns[id].setRemoteDescription(description);
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
                                break;
                        }
                    };
                    // Set up the ICE candidates for the two peers
                    con.onicecandidate = async e => {
                        log("ice");
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
                    con.ondatachannel = e => {
                        e.channel.onmessage = receive;
                    };
                    if (!description) {
                        conns[id] = con;
                        con.createDataChannel("");
                        con.createOffer()
                            .then(offer => {
                                con.setLocalDescription(offer);
                            });
                    } else {
                        log("createAnswer");
                        new Promise(resolve => { resolve(description) })
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
                    socket.onmessage = receive;
                    socket.onclose = () => {
                        log("socket closed");
                        log("reconnecting to server");
                        socket = new WebSocket(wshost);
                        setupWs();
                    }
                };
                setupWs();
            });
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
    }
    // ファイル入力
    {
        const handleFiles = () => {
            log("upload file");
            for (const file of doc.uploadFile.files) {
                add("content", file);
            }
        };
        doc.uploadFile.onchange = handleFiles;
        doc.uploadBtn.onclick = () => doc.uploadFile.click();
        const stop = (e) => {
            e.stopPropagation();
            e.preventDefault();
        };
        doc.sendForm.ondragenter = stop;
        doc.sendForm.ondragover = stop;
        doc.sendForm.ondrop = (e) => {
            stop(e);
            doc.uploadFile.files = e.dataTransfer.files;
            handleFiles();
        };
    }
};
dbReq.onupgradeneeded = (event) => {
    log("upgrade DB");
    const db = event.target.result;
    const tx = event.target.transaction;
    const createContentsStore = async () => {
        const contents = db.createObjectStore("contents", { keyPath: "id" });
        contents.createIndex("date", "date");
        contents.createIndex("tag", "tag", { multiEntry: true });
    };
    if (event.oldVersion == 0) createContentsStore();
    else tx.objectStore("contents").openCursor().onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
            init.push(cursor.value);
            cursor.continue();
        } else {
            log("delete objectStore 'contents'");
            db.deleteObjectStore("contents");
            createContentsStore();
        }
    };
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