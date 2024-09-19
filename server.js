const express = require("express");
const multer = require("multer");
const { PDFDocument, rgb } = require("pdf-lib");
const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path"); // Import path module
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

// Routes
app.post("/api/upload", upload.single("template"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const { filename, mimetype } = req.file;
    let templatePath = `uploads/${filename}`;

    // Check if the uploaded file is a PNG, JPEG, or PDF
    if (mimetype !== 'image/png' && mimetype !== 'image/jpeg' && mimetype !== 'application/pdf') {
      return res.status(400).json({ error: "The input is not a PNG, JPEG, or PDF file!" });
    }

    // If the uploaded file is an image, convert it to PDF
    if (mimetype === 'image/png' || mimetype === 'image/jpeg') {
      const imageBytes = await fs.readFile(templatePath);
      const pdfDoc = await PDFDocument.create();
      
      const image = mimetype === 'image/png' ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);
      const { width: imgWidth, height: imgHeight } = image.scale(1); // Get original dimensions

      // Create a page with the same dimensions as the image
      const page = pdfDoc.addPage([imgWidth, imgHeight]); // Set page size to image size
      page.drawImage(image, { x: 0, y: 0, width: imgWidth, height: imgHeight }); // Draw image at full size

      await fs.writeFile(templatePath, await pdfDoc.save());
    }

    // If the uploaded file is a PDF, just save it as is
    if (mimetype === 'application/pdf') {
      await fs.copyFile(templatePath, templatePath);
    }

    res.json({
      message: "Template uploaded successfully",
      filename: filename
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

const FONT_SIZE_MULTIPLIER = 8; // Define a constant for the font size multiplier

app.post("/api/generate", async (req, res) => {
  try {
    const { templateFilename, data, positions } = req.body;
    const templatePath = `uploads/${templateFilename}`;

    // Load the template PDF
    const templatePdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templatePdfBytes);

    // Generate a certificate for each entry in the data array
    const generatedPdfs = await Promise.all(data.map(async (entry) => {
      const pdf = await PDFDocument.create();
      const [templatePage] = await pdf.copyPages(pdfDoc, [0]);
      pdf.addPage(templatePage);

      const page = pdf.getPages()[0];
      const { width, height } = page.getSize();

      // Add text to the PDF based on positions
      Object.entries(positions).forEach(([key, position]) => {
        if (entry[key]) {
          const adjustedFontSize = (position.fontSize || 12) * FONT_SIZE_MULTIPLIER; // Use the multiplier
          const textWidth = entry[key].length * adjustedFontSize * 0.6; // Approximate width of a character

          // Default to left alignment
          const x = position.x * width; // Use x from positions
          
          page.drawText(entry[key], {
            x: x,
            y: height * position.y,
            size: adjustedFontSize,
            color: rgb(0, 0, 0),
          });
        }
      });

      return pdf.save();
    }));

    // Merge all generated PDFs into a single file
    const mergedPdf = await PDFDocument.create();
    for (const pdfBytes of generatedPdfs) {
      const pdf = await PDFDocument.load(pdfBytes);
      const [page] = await mergedPdf.copyPages(pdf, [0]);
      mergedPdf.addPage(page);
    }

    const pdfBytes = await mergedPdf.save();

    // Create the "generated" directory if it doesn't exist
    const generatedDir = path.join(__dirname, 'generated');
    await fs.mkdir(generatedDir, { recursive: true }); // Create directory

    const outputPath = path.join(generatedDir, `certificates_${Date.now()}.pdf`); // Update output path
    await fs.writeFile(outputPath, pdfBytes);

    res.json({ message: "Certificates generated successfully", outputPath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
