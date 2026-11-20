import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { mountApp } from "../work/compiled/ui.js";

export function harness(storage) {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="app"></div></body></html>',
    { url: "https://space-force.test/" },
  );
  const { window } = dom;
  window.scrollTo = () => {};
  const root = window.document.querySelector("#app");
  const app = mountApp(root, storage ?? window.localStorage);
  const click = (selector) => {
    const el = root.querySelector(selector);
    assert.ok(el, `Missing control: ${selector}`);
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  };
  const key = (selector, value, extra = {}) => {
    const el = root.querySelector(selector);
    assert.ok(el);
    el.dispatchEvent(
      new window.KeyboardEvent("keydown", {
        key: value,
        bubbles: true,
        cancelable: true,
        ...extra,
      }),
    );
  };
  const input = (selector, value, event = "change") => {
    const el = root.querySelector(selector);
    assert.ok(el);
    el.value = value;
    el.dispatchEvent(new window.Event(event, { bubbles: true }));
  };
  const pointer = (selector, type, x, y, id = 1) => {
    const event = new window.MouseEvent(type, {
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperties(event, {
      pointerType: { value: "touch" },
      pointerId: { value: id },
    });
    root.querySelector(selector).dispatchEvent(event);
  };
  return {
    app,
    root,
    window,
    click,
    key,
    input,
    pointer,
    close: () => {
      app.destroy();
      window.close();
    },
  };
}
