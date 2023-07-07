import puppeteer from 'puppeteer';
import fs from "fs"
import path from "path"

function downloadDataUri(dataUri, outputPath) {
    // Remove the "data:image/png;base64," prefix from the data URI
    const base64Data = dataUri.replace(/^data:image\/png;base64,/, '');

    // Convert the base64 data to a buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Write the buffer to a file
    fs.writeFile(outputPath, imageBuffer, (error) => {
        if (error) {
            console.error('Error downloading the image:', error);
        }
    });
}

/**
 * Unblurs an image using Fotor's AI Enlarger feature.
 *
 * @param {string} from - The path to the image file to be unblurred.
 * @param {string} to - The path where the unblurred image will be saved.
 * @return {Promise<void>} A promise that resolves when the image is unblurred and saved.
 */
let unblur = async (from, to, verbose = false) => {
    try {
        // First launch browser and start Fotor
        const browser = await puppeteer.launch({
            "headless": "new"
        });
        const page = await browser.newPage();

        await page.goto('https://www.fotor.com/photo-editor-app/editor/basic/');

        await page.setViewport({ width: 1080, height: 1024 });

        // Close the "Pro" popup
        await page.waitForSelector("#rootPopup > div > div > span");
        await page.click("#rootPopup > div > div > span");
        await page.waitForFunction('document.querySelector("#rootPopup > div > div > span") === null')

        // Upload the file
        const fileUpload = await page.$("#canvas > div.noImageContent > div > input[type=file]");
        await fileUpload.uploadFile(path.resolve(from));

        // Wait for file to finish loading
        await page.waitForSelector("#leftSiderBar", { visible: true })
        await new Promise(r => setTimeout(r, 1000));

        // Wait until the AI Enlarger is available
        await page.waitForXPath("//button[contains(., 'AI Enlarger')]")
        await page.evaluate(() => {
            const xpath = "//button[contains(., 'AI Enlarger')]";
            const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            const button = result.snapshotItem(0);
            if (button) button.click();
        });

        // Wait until load starts
        await page.waitForSelector('.long_loading', { visible: true });

        // And then wait for load to finish
        await page.waitForSelector('.long_loading', { hidden: true });

        // Apply effects onto original image
        await page.waitForXPath("//button[contains(., 'Apply')]")
        await page.evaluate(() => {
            const xpath = "//button[contains(., 'Apply')]";
            const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            const button = result.snapshotItem(0);
            if (button) button.click();
        });
        await new Promise(r => setTimeout(r, 1000));

        // Trigger mobile view
        await page.setViewport({ width: 20, height: 1024 });
        await new Promise(r => setTimeout(r, 1000));

        // Download the new image
        let uri = await page.evaluate(() => {
            return document.querySelectorAll('canvas')[0].toDataURL()
        })

        downloadDataUri(uri, path.resolve(to))

        // Close browser
        await browser.close();
    } catch (e) {
        throw new Error("Failed to get Fotor. Please try again in a moment. If this problem continues, submit an issue at EvanZhouDev/unblur-ai.")
    }
}

export default unblur;