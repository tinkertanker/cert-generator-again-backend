# CGABE

CGA (Cert Generator Again) BE is a backend application for generating certificates based on templates. It allows users to upload image or PDF templates and generate customised certificates using provided data.

Almost everything is written by AI in [Cursor](https://cursor.com).

## Features

- Upload PNG, JPEG, or PDF templates.
- Generate certificates with customisable text and styles.
- Supports multiple entries for batch certificate generation.
- Uses Express.js for the server and Multer for file uploads.

## Technologies Used

- Node.js
- Express
- Multer
- PDF-lib
- Axios
- Nodemon (for development)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory (if needed) to configure environment variables.

## Usage

1. For development mode with auto-reload:

   ```bash
   npm run dev
   ```

2. Use the following API endpoints:

   - **Upload Template**: `POST /api/upload`
     - Upload a PNG, JPEG, or PDF file.
     - Returns the filename of the uploaded template.

   - **Generate Certificates**: `POST /api/generate`
     - Body:
       ```json
       {
         "templateFilename": "filename_of_uploaded_template",
         "data": [
           {
             "name": { "text": "John Doe", "color": [0.7, 0.7, 0.7], "bold": true },
             "course": { "text": "Web Development", "color": [1, 0.5, 0.5] },
             "date": { "text": "2023-05-01", "color": [0.5, 0.5, 1] }
           }
         ],
         "positions": {
           "name": { "x": 0.42, "y": 0.6, "fontSize": 36 },
           "course": { "x": 0.44, "y": 0.5, "fontSize": 24 },
           "date": { "x": 0.47, "y": 0.4, "fontSize": 12 }
         }
       }
       ```
     - Returns the path to the generated certificates.