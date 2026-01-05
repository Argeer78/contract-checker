const fs = require('fs');
const path = require('path');

async function testUpload() {
    try {
        const filePath = path.join(__dirname, 'test.pdf');
        // Ensure file exists
        if (!fs.existsSync(filePath)) {
            console.error('Test PDF not found');
            return;
        }

        const fileBuffer = fs.readFileSync(filePath);
        console.log(`Sending file of size: ${fileBuffer.length} bytes`);

        const blob = new Blob([fileBuffer], { type: 'application/pdf' });

        const formData = new FormData();
        formData.append('file', blob, 'test.pdf');

        const response = await fetch('http://localhost:3000/api/parse-pdf', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const text = await response.text();
            console.log(`Server Error (${response.status}):`, text);
            return;
        }

        const data = await response.json();
        console.log('Success:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Script Error:', error);
    }
}

testUpload();
