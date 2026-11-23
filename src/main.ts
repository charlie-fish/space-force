import "./style.css";
import { mountGameClient } from "./lobby.js";

let storage: Storage | undefined;
try {
  storage = window.localStorage;
} catch {
  /* Optional local persistence. */
}
mountGameClient(document.getElementById("app")!, storage);
