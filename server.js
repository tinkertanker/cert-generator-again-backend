import express from "express";
import multer from "multer";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"; // Import StandardFonts
import fs from "fs/promises"; // Use fs/promises for promises
import path from "path"; // Import path module
import cors from "cors";
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

      // Embed fonts for each individual PDF
      const helveticaFont = await pdf.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
      const helveticaObliqueFont = await pdf.embedFont(StandardFonts.HelveticaOblique); // Corrected to Embed Helvetica Oblique
      const helveticaBoldObliqueFont = await pdf.embedFont(StandardFonts.HelveticaBoldOblique); // Embed Helvetica Bold Oblique
      const timesFont = await pdf.embedFont(StandardFonts.TimesRoman); // Embed Times New Roman
      const timesBoldFont = await pdf.embedFont(StandardFonts.TimesRomanBold); // Embed Times Bold
      const timesObliqueFont = await pdf.embedFont(StandardFonts.TimesRomanItalic); // Corrected to Embed Times Oblique
      const timesBoldObliqueFont = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic); // Embed Times Bold Oblique
      const courierFont = await pdf.embedFont(StandardFonts.Courier); // Embed Courier
      const courierBoldFont = await pdf.embedFont(StandardFonts.CourierBold); // Embed Courier Bold
      const courierObliqueFont = await pdf.embedFont(StandardFonts.CourierOblique); // Embed Courier Oblique
      const courierBoldObliqueFont = await pdf.embedFont(StandardFonts.CourierBoldOblique); // Embed Courier Bold Oblique

      const page = pdf.getPages()[0];
      const { width, height } = page.getSize();

      // Add text to the PDF based on positions
      for (const [key, position] of Object.entries(positions)) {
        if (entry[key]) {
          const adjustedFontSize = (position.fontSize || 12) * FONT_SIZE_MULTIPLIER;

          const x = position.x * width;
          
          // Use color from entry or default to black
          const color = entry[key].color ? rgb(...entry[key].color) : rgb(0, 0, 0);

          // Select font based on entry properties
          let font;
          switch (entry[key].font) {
            case 'Times':
              font = entry[key].bold 
                ? (entry[key].oblique ? timesBoldObliqueFont : timesBoldFont) 
                : (entry[key].oblique ? timesObliqueFont : timesFont);
              break;
            case 'Courier':
              font = entry[key].bold 
                ? (entry[key].oblique ? courierBoldObliqueFont : courierBoldFont) 
                : (entry[key].oblique ? courierObliqueFont : courierFont);
              break;
            case 'Helvetica':
              font = entry[key].bold 
                ? (entry[key].oblique ? helveticaBoldObliqueFont : helveticaBoldFont) 
                : (entry[key].oblique ? helveticaObliqueFont : helveticaFont);
              break;
            default:
              console.warn(`Unknown font: ${entry[key].font}. Defaulting to Helvetica.`);
              font = helveticaFont; // Default to Helvetica if unknown
          }

          page.drawText(entry[key].text, {
            x: x,
            y: height * position.y,
            size: adjustedFontSize,
            color: color,
            font: font,
          });
        }
      }

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
