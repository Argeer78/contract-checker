try {
    const pdf = require('pdf-parse/dist/node/cjs/index.cjs');
    console.log('Type:', typeof pdf);
    if (typeof pdf === 'object') {
        console.log('Keys:', Object.keys(pdf));
        console.log('Default:', pdf.default);
    } else {
        console.log('Value Is Function:', typeof pdf === 'function');
    }
} catch (e) {
    console.error('Error requiring CJS:', e);
}
