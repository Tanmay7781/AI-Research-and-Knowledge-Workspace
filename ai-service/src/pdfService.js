const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Extracts raw text and page count from a PDF file.
 * @param {string} filePath - Absolute or relative path to the PDF file.
 * @returns {Promise<{text: string, numPages: number}>}
 */
async function extractTextFromPdf(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF file not found at path: ${filePath}`);
  }

  const dataBuffer = fs.readFileSync(filePath);
  
  try {
    const data = await pdfParse(dataBuffer);
    const trimmedText = data.text ? data.text.trim() : '';

    if (!trimmedText || trimmedText.length === 0) {
      throw new Error(
        'The uploaded PDF contains no extractable text. It may consist solely of scanned images, non-searchable pages, or be password-protected.'
      );
    }

    return {
      text: trimmedText,
      numPages: data.numpages || 1
    };
  } catch (error) {
    if (error.message.includes('no extractable text')) {
      throw error;
    }
    throw new Error(`Failed to parse PDF document: ${error.message}`);
  }
}

module.exports = {
  extractTextFromPdf
};
