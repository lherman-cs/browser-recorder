'use strict';

const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const requestClient = require('request-promise-native');
const fs = require('fs');

const url = "https://app.dev.bluecrewenv.com/app.html#!/roster";

function asleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

(async () => {
  const browser = await puppeteer.launch({ headless: false, devtools: false });
  const page = await browser.newPage();
  const customUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36';
  const records = [];

  await page.setUserAgent(customUA);

  page.on('response', async response => {
    const requestUrl = response.url();
    const responseHeaders = response.headers();

    records.push({
      timestamp: Date.now(),
      requestUrl,
      responseHeaders,
    });
  });

  const recorder = new PuppeteerScreenRecorder(page);
  const startTimestamp = Date.now();
  await recorder.start(`report_${startTimestamp.toString()}.mp4`); // supports extension - mp4, avi, webm and mov
  console.log(`Going to ${url}`)
  page.goto(url);

  // TODO: Figure out how to close the browser
  await asleep(10000);
  await recorder.stop();
  console.log("Stopped recorder");
  // const pages = await browser.pages();
  // for (let i = 0; i < pages.length; i++) {
  //   await pages[i].close();
  // }
  // await browser.close();
  // console.log("Closed browser");

  const report = {
    startTimestamp,
    records: records,
  };

  const reportJson = JSON.stringify(report, null, 2);
  const reportPath = `report_${startTimestamp.toString()}.json`
  fs.writeFileSync(reportPath, reportJson);
  console.log(`Recorded to ${reportPath}`)
})()
