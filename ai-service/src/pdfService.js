const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Extracts raw text, page count, and page-by-page text content from a PDF file.
 * Preserves genuine page numbers for grounded citation tracking.
 * 
 * @param {string} filePath - Absolute or relative path to the PDF file.
 * @returns {Promise<{text: string, numPages: number, pages: Array<{pageNumber: number, text: string}>}>}
 */
async function extractTextFromPdf(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF file not found at path: ${filePath}`);
  }

  const dataBuffer = fs.readFileSync(filePath);

  const pages = [];

  function customPageRenderer(pageData) {
    return pageData.getTextContent().then(function (textContent) {
      let lastY, pageText = '';
      for (let item of textContent.items) {
        if (lastY === undefined || lastY === item.transform[5]) {
          pageText += item.str;
        } else {
          pageText += '\n' + item.str;
        }
        lastY = item.transform[5];
      }

      const cleanText = pageText.trim();
      pages.push({
        pageNumber: pageData.pageIndex + 1,
        text: cleanText
      });

      return pageText;
    });
  }

  try {
    const data = await pdfParse(dataBuffer, { pagerender: customPageRenderer });
    const fullText = (data.text || '').trim();

    if (!fullText || fullText.length === 0) {
      throw new Error(
        'The uploaded PDF contains no extractable text. It may consist solely of scanned images, non-searchable pages, or be password-protected.'
      );
    }

    // Sort captured pages in ascending order of page number
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    return {
      text: fullText,
      numPages: data.numpages || pages.length || 1,
      pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: fullText }]
    };
  } catch (error) {
    if (error.message && error.message.includes('no extractable text')) {
      throw error;
    }
    throw new Error(`Failed to parse PDF document: ${error.message}`);
  }
}

module.exports = {
  extractTextFromPdf
};
