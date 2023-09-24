const mime = {
    "html": "text/html",
    "css": "text/css",
    "js": "text/javascript"
};

const cons = {};
Deno.serve(
    async (req) => {
        const upgrade = req.headers.get("upgrade") || "";
        if (upgrade.toLowerCase() == "websocket") {
            const { socket, response } = Deno.upgradeWebSocket(req);
            socket.onmessage = async (e) => {
                const payload = JSON.parse(e.data);
                console.log(payload.type);
                switch (payload.type) {
                    case "id":
                        cons[payload.body] = socket;
                        for (const id in cons) {
                            socket.send(JSON.stringify({ type: "peer", body: id }));
                        }
                        break;
                    case "transport":
                        const ws = cons[payload.body.to];
                        console.log(cons[payload.body.to].onmessage)
                        if (ws && ws.readyState == 1) {
                            ws.send(JSON.stringify(payload.body.payload));
                        }
                        break;
                }
            };
            socket.onerror = (e) => console.log("socket errored:", e);
            socket.onclose = () => {
                console.log("socket closed");
                for (const did in cons) {
                    if (cons[did] == socket) {
                        delete cons[did];
                        break;
                    }
                }
            };
            return response;
        } else {
            let path = (new URL(req.url)).pathname;
            if (path == "/") path = "/index.html";
            const ext = path.split(".").pop();
            const data = await Deno.readTextFile("client" + path);
            return new Response(data, { headers: new Headers({ "Content-Type": mime[ext] }) });
        }
    });