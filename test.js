const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const API_URL = 'http://localhost:3000';
const EXAMPLE_TEMPLATE_URL_JPG =
  "https://a.dropoverapp.com/cloud/download/d29dc44b-a5c5-4d1b-9850-824ebc5c6d3d/4a94fd27-37d8-476d-8df5-32f405f295a2";
const EXAMPLE_TEMPLATE_URL_PDF =
  "https://a.dropoverapp.com/cloud/download/ae04b2d6-f202-4b52-90d1-523f08fa5d26/57f48556-1a9f-4007-b977-330a593cdb23";

async function uploadTemplate(url) {
  const response = await axios.get(url, { responseType: 'stream' });
  const form = new FormData();
  form.append('template', response.data, { filename: url.split('/').pop() });

  const response2 = await axios.post(`${API_URL}/api/upload`, form, {
    headers: form.getHeaders()
  });

  console.log('Upload response:', response2.data);
  return response2.data.filename;
}

async function testGenerate(filename) {
  const response = await axios.post(`${API_URL}/api/generate`, {
    templateFilename: filename,
    data: [
      { name: "John Doe", course: "Web Development", date: "2023-05-01" },
      { name: "Jane Smith", course: "Data Science", date: "2023-05-02" }
    ],
    positions: {
      name: { x: 0.5, y: 0.7, fontSize: 24 },
      course: { x: 0.5, y: 0.6, fontSize: 24 },
      date: { x: 0.5, y: 0.5, fontSize: 24 }
    }
  });

  console.log('Generate response:', response.data);
}

async function runTest() {
  try {
    // Upload and generate for JPEG template
    const jpgFilename = await uploadTemplate(EXAMPLE_TEMPLATE_URL_JPG);
    await testGenerate(jpgFilename);

    // Upload and generate for PDF template
    const pdfFilename = await uploadTemplate(EXAMPLE_TEMPLATE_URL_PDF);
    await testGenerate(pdfFilename);
  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  }
}

runTest();