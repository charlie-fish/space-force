# Testing on iPhone or another phone

The ZIP was extracted correctly. On iPhone, tapping an HTML file in Files usually opens a document preview rather than running it as a normal Safari website. That preview may not execute the game's JavaScript or load its neighbouring artwork. A blank preview does not establish that the game is incompatible with Safari.

Use an **HTTP(S) web address in Safari**. There is no hosted game URL yet; the following lets your computer serve the prototype to a phone on the same Wi-Fi. The computer must stay on while testing.

## From the source checkout

Install [Node.js 24 LTS](https://nodejs.org/) on the computer and follow the [README setup steps](../README.md#run-the-prototype). In the project folder, run:

```sh
npm ci
npm run dev
```

Keep that terminal open. Vite prints a **Network** address, for example `http://192.168.1.25:5173/`. Open that exact Network address in **Safari on the iPhone**, with both devices on the same Wi-Fi. The example address is illustrative; use the one printed on your computer. Do not enter `localhost` on the phone, because that refers to the phone itself.

## From the downloaded portable ZIP

If Python is already installed on your computer, extract the whole ZIP, open a terminal in the extracted folder containing `index.html` and `art/`, and run:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

On Windows the command may instead be `py -m http.server 8000 --bind 0.0.0.0`. Find the computer's local Wi-Fi IP address in network settings, then open `http://THAT-IP-ADDRESS:8000/` in iPhone Safari. Serve the extracted game folder, keeping its `art` folder in place. Stop the server with Ctrl+C when finished.

If Safari cannot connect, check the address/port, that the server is still running, and whether the computer's firewall permits access on your private network. Guest Wi-Fi can prevent devices from reaching each other.

## What this tests

This build is local pass-and-play: the phone runs its own game and saves it in that browser. Opening the same address on desktop and phone does not connect their games. A hosted test address will remove the local-server setup step; remote multiplayer remains a separate milestone.

Please try portrait/landscape, single/double taps, dragging, pinch zoom, page scrolling, view navigation, and refresh during a pending choice. A narrow desktop window helps review layout, but does not reproduce iPhone Safari or touch behaviour. Real-phone visual/gesture verification remains outstanding until performed.
