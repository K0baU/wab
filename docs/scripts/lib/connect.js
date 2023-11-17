import { log } from "./log.js";
import { doc } from "./doc.js";
import { opr } from "./db.js";
import { cid } from "../content/id.js";
import { showOne } from "../peer/show-one.js";
import { addContent } from "../content/add.js";

const wshost = "wss://wab.sabae.cc";
const onlineMsg = "🟢オンライン";
const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
export let conns = {};
let creditOuts = {}, onlines = {}, mimes = {};

        let user;
        opr.for({ store:"keypairs", f:rec=>user = rec, end: async()=>{
            let isNew;
            if (!user) {                
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
                    opr.crud({ store:"keypairs", op:"add", rec:{body:user, id:pub.x + pub.y} });
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
                                addContent("content", blob);
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
                                    const newPeer = { id, name: "", credit: 0 };
                                    opr.crud({ store: "peers", op: "add", rec: newPeer, callback: showOne });
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
        }});
        const increaseCredit = (multiplier) => {
            const id = (new FormData(doc.credits)).get("target");
            const amount = Number(doc.amountIn.value);
            opr.crud({ store: "peers", op: "get", rec: id, callback: rec => {
                const newRec = rec;
                newRec.credit += amount * multiplier;
                opr.crud({ store: "peers", op: "put", rec: newRec, callback: () => {
                    log(
                        `${rec.name}: ${rec.credit} => ${newRec.credit} (${multiplier >= 0 ? "+" : "-"}${amount})`
                    );
                    creditOuts[id].value = newRec.credit;
                } });
            } });
        };
        document.getElementById('plus').onclick = () => {
            increaseCredit(1);
        };
        document.getElementById('minus').onclick = () => {
            increaseCredit(-1);
        };