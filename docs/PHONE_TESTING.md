# Testing on iPhone or another phone

The ZIP was extracted correctly. On iPhone, tapping an HTML file in Files usually opens a document preview rather than running it as a normal Safari website. That preview may not execute the game's JavaScript or load its neighbouring artwork. A blank preview does not establish that the game is incompatible with Safari.

Use an **HTTP(S) web address in Safari**. Use the hosted online address when supplied, or let your computer serve the game to a phone on the same Wi-Fi. The computer must stay on while testing.

## From the source checkout

Install [Node.js 24 LTS](https://nodejs.org/) on the computer and follow the [README setup steps](../README.md#run-online-multiplayer). In the project folder, run:

```sh
npm ci
npm run build
npm start
```

Keep that terminal open. Find your computer’s local Wi-Fi IP address in network settings, for example `http://192.168.1.25:3000/`. Open its address on port 3000 in **Safari on the iPhone**, with both devices on the same Wi-Fi. The example address is illustrative; use your computer’s actual network address. Do not enter `localhost` on the phone, because that refers to the phone itself.

## From the downloaded portable ZIP

If Python is already installed on your computer, extract the whole ZIP, open a terminal in the extracted folder containing `index.html` and `art/`, and run:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

On Windows the command may instead be `py -m http.server 8000 --bind 0.0.0.0`. Find the computer's local Wi-Fi IP address in network settings, then open `http://THAT-IP-ADDRESS:8000/` in iPhone Safari. Serve the extracted game folder, keeping its `art` folder in place. Stop the server with Ctrl+C when finished.

If Safari cannot connect, check the address/port, that the server is still running, and whether the computer's firewall permits access on your private network. Guest Wi-Fi can prevent devices from reaching each other.

## What this tests

The Node service supports live/asynchronous rooms across devices at the same address. Create a room and use its invitation to join from the phone. The portable ZIP/static server runs local pass-and-play only; opening that static address on two devices creates separate games. Private recovery keys resume occupied online seats on another browser.

Please try portrait/landscape, single/double taps, dragging, pinch zoom, page scrolling, view navigation, and refresh during a pending choice. A narrow desktop window helps review layout, but does not reproduce iPhone Safari or touch behaviour. Real-phone visual/gesture verification remains outstanding until performed.
