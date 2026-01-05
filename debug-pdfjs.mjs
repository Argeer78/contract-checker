import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
console.log('Exports:', Object.keys(pdfjs));
if (pdfjs.getDocument) console.log('getDocument exists');
else console.log('getDocument MISSING');
