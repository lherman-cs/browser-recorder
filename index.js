'use strict';

const VERSION = '1.0'; // This will determine breaking changes on the record format.
const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const fs = require('fs');

if (process.argv.length != 3) {
  console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <url>`);
  process.exit(1);
}

const url = process.argv[2];

(async () => {
  const browser = await puppeteer.launch({
    headless: false, devtools: false, defaultViewport: null, args: [
      "--start-fullscreen",
      "--use-gl=angle",
      "--use-angle=gl"
    ]
  });
  const page = await browser.newPage();
  const customUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36';
  const records = [];

  await page.setCacheEnabled(false);
  await page.setUserAgent(customUA);

  page.on('response', async response => {
    const timestamp = Date.now();
    const timing = response.timing();
    const requestUrl = response.url();
    const responseHeaders = response.headers();
    const responseStatus = response.status();
    const requestMethod = response.request().method();
    const requestType = response.request().resourceType();
    let responseJson;
    try {
      responseJson = await response.json();
    } catch (err) {
      responseJson = { "error": `invalid json: ${err}` };
    }

    records.push({
      timestamp,
      timing,
      requestUrl,
      responseHeaders,
      responseStatus,
      requestMethod,
      requestType,
      responseJson,
    });
  });

  const recorder = new PuppeteerScreenRecorder(page, {
    followNewTab: true,
    fps: 25,
    ffmpeg_Path: null,
    videoFrame: {
      width: null,
      height: null,
    },
    videoCrf: 30,
    videoCodec: 'libx264',
    videoPreset: 'ultrafast',
    videoBitrate: 1000,
    aspectRatio: '16:9',
  });
  const reportName = `report_${new Date().toUTCString()}`;
  const recorderStart = Date.now();
  await recorder.start(`${reportName}.mp4`); // supports extension - mp4, avi, webm and mov
  const startTimestamp = Date.now();

  console.log(`Recorder start delay: ${startTimestamp - recorderStart}ms`)
  console.log(`Going to ${url}`)
  page.goto(url);

  await new Promise((resolve) => {
    page.on("close", () => {
      resolve();
    });
  })
  await recorder.stop();
  console.log("Stopped recorder");

  const report = {
    version: VERSION,
    startTimestamp,
    records,
  };

  const reportJson = JSON.stringify(report, null, 2);
  const reportPath = `${reportName}.json`
  fs.writeFileSync(reportPath, reportJson);
  console.log(`Recorded to ${reportPath}`)

  // HACK:
  // This should be the correct way to exit. But, it always hangs. For now, use process.exit(0) to cleanup
  // const pages = await browser.pages();
  // for (let i = 0; i < pages.length; i++) {
  //   await pages[i].close();
  // }
  // await browser.close();
  // console.log("Closed browser");
  process.exit(0);
})()
