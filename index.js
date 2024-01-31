'use strict';

const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const requestClient = require('request-promise-native');
const fs = require('fs');

const url = "https://app.dev.bluecrewenv.com/app.html#!/roster";
let onQuit = async () => { };

async function exitHandler(evtOrExitCodeOrError) {
  try {
    await onQuit();
  } catch (e) {
    console.error('EXIT HANDLER ERROR', e);
  }

  process.exit(isNaN(+evtOrExitCodeOrError) ? 1 : +evtOrExitCodeOrError);
}
[
  'beforeExit', 'uncaughtException', 'unhandledRejection',
  'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP',
  'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV',
  'SIGUSR2', 'SIGTERM',
].forEach(evt => process.on(evt, exitHandler));


(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--disable-features=site-per-process'] });
  const page = await browser.newPage();
  const records = [];

  await page.setRequestInterception(true);

  page.on('request', request => {
    requestClient({
      uri: request.url(),
      resolveWithFullResponse: true,
    }).then(response => {
      const requestUrl = request.url();
      const requestHeaders = request.headers();
      const requestPostData = request.postData();
      const responseHeaders = response.headers;
      const responseSize = responseHeaders['content-length'];
      const responseBody = response.body;

      records.push({
        timestamp: Date.now(),
        requestUrl: requestUrl,
        requestHeaders: requestHeaders,
        requestPostData: requestPostData,
        responseHeaders: responseHeaders,
        responseSize: responseSize,
        responseBody: responseBody,
      });

      request.continue();
    }).catch(error => {
      request.abort();
    });
  });

  const recorder = new PuppeteerScreenRecorder(page);
  const startTimestamp = Date.now();
  await recorder.start(`report_${startTimestamp.toString()}.mp4`); // supports extension - mp4, avi, webm and mov
  console.log(`Going to ${url}`)
  page.goto(url);

  onQuit = async () => {
    console.log("Caught interrupt signal");
    await recorder.stop();
    console.log("Stopped recorder");
    await browser.close();
    console.log("Closed browser");

    const report = {
      startTimestamp,
      records: records,
    };

    const reportJson = JSON.stringify(report, null, 2);
    const reportPath = `report_${startTimestamp.toString().json}`
    fs.writeFileSync(reportPath, reportJson);
    console.log(`Recorded to ${reportPath}`)
  };
})()
