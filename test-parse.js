const fs = require('fs');
const pdf = require('pdf-parse');

const buffer = fs.readFileSync('./test.pdf');
pdf(buffer).then(function (data) {
    console.log(data.text.substring(0, 100));
}).catch(err => console.error(err));
