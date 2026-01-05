import * as pdfjsLib from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';

const run = async () => {
    console.log('Starting PDF test...');
    try {
        const pdfPath = path.resolve('test.pdf');
        console.log(`Reading file from: ${pdfPath}`);

        if (!fs.existsSync(pdfPath)) {
            console.error('File does not exist!');
            return;
        }

        const buffer = fs.readFileSync(pdfPath);
        const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

        console.log('Loading document...');
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            disableFontFace: true,
            verbosity: 0
        });

        const doc = await loadingTask.promise;
        console.log(`Parsed ${doc.numPages} pages.`);

        const page = await doc.getPage(1);
        const content = await page.getTextContent();
        const text = content.items.map(item => item.str).join(' ');

        console.log('--- EXTRACTED TEXT START ---');
        console.log(text.substring(0, 500));
        console.log('--- EXTRACTED TEXT END ---');
    } catch (e) {
        console.error('Test Failed:', e);
    }
};

run();
