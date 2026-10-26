/**
 * Document Chunking Service
 * Splits extracted document text into semantically cohesive chunks with context overlap,
 * preserving authentic page numbers for grounded citations.
 */

const DEFAULT_TARGET_CHUNK_SIZE = 700; // characters
const DEFAULT_CHUNK_OVERLAP = 120;     // characters

/**
 * Splits text cleanly along sentence and paragraph boundaries.
 * 
 * @param {string} text - Raw text to split.
 * @param {number} targetSize - Approximate target chunk size in characters.
 * @param {number} overlap - Overlap between adjacent chunks in characters.
 * @returns {Array<string>} Array of chunk text strings.
 */
function splitTextIntoSegments(text, targetSize = DEFAULT_TARGET_CHUNK_SIZE, overlap = DEFAULT_CHUNK_OVERLAP) {
  if (!text || text.trim().length === 0) return [];
  
  // Normalize whitespace while preserving paragraph breaks
  const cleaned = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  if (cleaned.length <= targetSize) {
    return [cleaned];
  }

  // Split into paragraphs first
  const paragraphs = cleaned.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 <= targetSize) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
    } else {
      // If adding this paragraph exceeds target size, split paragraph into sentences
      const sentences = para.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [para];
      
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        if (currentChunk.length + trimmedSentence.length + 1 <= targetSize) {
          currentChunk = currentChunk ? `${currentChunk} ${trimmedSentence}` : trimmedSentence;
        } else {
          if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
            // Create overlap from the tail of currentChunk
            const overlapText = currentChunk.slice(-overlap).trim();
            currentChunk = `${overlapText} ${trimmedSentence}`.trim();
          } else {
            // Very long sentence larger than targetSize
            chunks.push(trimmedSentence);
            currentChunk = '';
          }
        }
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 20); // Filter out trivial fragments
}

/**
 * Chunks a list of page objects preserving accurate page numbers.
 * 
 * @param {Array<{pageNumber: number, text: string}>} pages 
 * @param {object} options
 * @returns {Array<{chunkIndex: number, content: string, pageNumber: number}>}
 */
function chunkDocumentPages(pages, options = {}) {
  const targetSize = options.targetSize || DEFAULT_TARGET_CHUNK_SIZE;
  const overlap = options.overlap || DEFAULT_CHUNK_OVERLAP;

  const result = [];
  let chunkIndex = 0;

  for (const page of pages) {
    if (!page.text || page.text.trim().length === 0) continue;
    const pageSegments = splitTextIntoSegments(page.text, targetSize, overlap);

    for (const segment of pageSegments) {
      result.push({
        chunkIndex: chunkIndex++,
        content: segment,
        pageNumber: page.pageNumber
      });
    }
  }

  // Fallback if pages resulted in 0 chunks but text existed
  if (result.length === 0 && pages.length > 0) {
    const combined = pages.map(p => p.text).join('\n\n');
    const fallbackSegments = splitTextIntoSegments(combined, targetSize, overlap);
    for (let i = 0; i < fallbackSegments.length; i++) {
      result.push({
        chunkIndex: i,
        content: fallbackSegments[i],
        pageNumber: 1
      });
    }
  }

  return result;
}

module.exports = {
  splitTextIntoSegments,
  chunkDocumentPages
};
