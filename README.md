# Browser Recorder

Browser Recorder records user session workflow while recording the network activity. The recorded data then is used to playback alongside the network requests.
The goal is to capture a list of related network requests. This project is highly inspired by webviz project, https://webviz.io/app/?demo=&seek-to=1490150288.327839653.

## How to use?

`npm run record` will produce 2 files: report_<timestamp>.mp4 and report_<timestamp>.json.

`npm run visualize` will serve a web app that takes these 2 files and align the recorded video and network requests/responses in the json.
