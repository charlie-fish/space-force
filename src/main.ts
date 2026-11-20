import "./style.css";
import { mountApp } from "./ui.js";

let storage: Storage | undefined;
try {
  storage = window.localStorage;
} catch {
  /* Optional local persistence. */
}
mountApp(document.getElementById("app")!, storage);
