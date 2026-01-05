const fs = require('fs');
const path = require('path');

async function testUpload() {
    try {
        const filePath = path.join(__dirname, 'test.pdf');
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer], { type: 'application/pdf' });

        const formData = new FormData();
        formData.append('file', blob, 'test.pdf');

        const response = await fetch('http://localhost:3000/api/parse-pdf', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const text = await response.text();
            console.log('Server Error Body:', text);
            return;
        }

        const data = await response.json();
        console.log('Success:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

testUpload();
