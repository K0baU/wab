import { showOne } from "./show-one.js";
import { opr } from "../lib/db.js";

opr.for({ store: "peers", f: value => {
    if (value.name == "" && value.credit == 0) {
        opr.crud({ store: "peers", op: "delete" });
    }
}, end: () => opr.for({ store: "peers", f: showOne }) });