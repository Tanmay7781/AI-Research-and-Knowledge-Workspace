const db = require('../db');
const { isValidUuid } = require('./documentController');

// Standard English stop words to filter out grammatical noise
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Tokenizes text into lowercase alphanumeric words, filtering out short tokens and numbers.
 * @param {string} text 
 * @returns {string[]}
 */
function tokenize(text) {
  if (!text) return [];
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  return words;
}

/**
 * Generates word frequency map excluding common stop words.
 * @param {string[]} tokens 
 * @returns {Map<string, number>}
 */
function getTermFrequencies(tokens) {
  const freq = new Map();
  for (const token of tokens) {
    if (!STOP_WORDS.has(token)) {
      freq.set(token, (freq.get(token) || 0) + 1);
    }
  }
  return freq;
}

/**
 * Calculates deterministic Jaccard similarity between two sets.
 * J(A, B) = |A ∩ B| / |A ∪ B|
 * Returns float between 0.00 and 1.00
 */
function calculateJaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * Calculates deterministic Cosine similarity between two term frequency maps.
 * Cosine(v1, v2) = (v1 · v2) / (||v1|| * ||v2||)
 */
function calculateCosineSimilarity(freqA, freqB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, countA] of freqA.entries()) {
    normA += countA * countA;
    if (freqB.has(term)) {
      dotProduct += countA * freqB.get(term);
    }
  }

  for (const countB of freqB.values()) {
    normB += countB * countB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extracts overlapping 4-gram and 5-gram key phrases found across both texts.
 */
function findOverlappingPhrases(textA, textB, maxPhrases = 8) {
  if (!textA || !textB) return [];

  const sentencesA = textA.split(/[.\n;]+/).map(s => s.trim()).filter(s => s.length > 25);
  const lowerB = textB.toLowerCase();
  const matches = [];

  for (const sentence of sentencesA) {
    const cleaned = sentence.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleaned.split(' ');
    // Look for 4-word phrase matches
    if (words.length >= 4) {
      for (let i = 0; i <= words.length - 4; i++) {
        const phrase = words.slice(i, i + 4).join(' ').toLowerCase();
        // Skip phrases composed solely of stop words
        const hasSubstantive = words.slice(i, i + 4).some(w => !STOP_WORDS.has(w) && w.length > 3);
        if (hasSubstantive && lowerB.includes(phrase) && !matches.some(m => m.phrase.includes(phrase) || phrase.includes(m.phrase))) {
          matches.push({ phrase, length: 4 });
          if (matches.length >= maxPhrases) break;
        }
      }
    }
    if (matches.length >= maxPhrases) break;
  }

  return matches;
}

/**
 * POST /api/documents/compare
 * Accepts { documentIds: string[] }
 * Compares 2 or more documents using 100% deterministic algorithms (Jaccard, Cosine TF, shared/unique term analysis).
 * No LLM / Gemini calls used.
 */
async function compareDocuments(req, res, next) {
  try {
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length < 2) {
      return res.status(400).json({
        error: 'Please select at least two distinct documents to compare.'
      });
    }

    // Check for duplicate IDs in selection
    const uniqueIds = Array.from(new Set(documentIds));
    if (uniqueIds.length !== documentIds.length) {
      return res.status(400).json({
        error: 'Duplicate document IDs provided. Each selected document must be distinct.'
      });
    }

    // Validate all IDs are UUIDs
    for (const id of uniqueIds) {
      if (!isValidUuid(id)) {
        return res.status(400).json({ error: `Invalid document UUID format: ${id}` });
      }
    }

    // Fetch documents
    const docsResult = await db.query(`
      SELECT 
        d.id,
        d.original_filename,
        d.file_size,
        d.created_at,
        d.status,
        d.file_sha256,
        COALESCE(d.extracted_text, '') AS extracted_text,
        (da.id IS NOT NULL) AS has_analysis
      FROM documents d
      LEFT JOIN document_analyses da ON d.id = da.document_id
      WHERE d.id = ANY($1::uuid[]);
    `, [uniqueIds]);

    if (docsResult.rows.length < 2) {
      return res.status(404).json({
        error: 'One or more selected documents could not be found in the workspace.'
      });
    }

    // Maintain requested order
    const docs = uniqueIds.map(id => docsResult.rows.find(r => r.id === id)).filter(Boolean);

    // Compute stats per document
    const docProfiles = docs.map((doc) => {
      const text = doc.extracted_text || '';
      const rawWords = text.trim() ? text.trim().split(/\s+/) : [];
      const totalWords = rawWords.length;
      const totalChars = text.length;
      const readingTimeMinutes = Math.max(1, Math.ceil(totalWords / 200));

      const tokens = tokenize(text);
      const termFreqs = getTermFrequencies(tokens);
      const uniqueSignificantTerms = new Set(termFreqs.keys());

      // Sort top terms
      const topTerms = Array.from(termFreqs.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([term, count]) => ({ term, count }));

      const lexicalDiversity = totalWords > 0 ? parseFloat((uniqueSignificantTerms.size / totalWords).toFixed(3)) : 0;

      return {
        id: doc.id,
        originalFilename: doc.original_filename,
        fileSize: doc.file_size,
        status: doc.status,
        createdAt: doc.created_at,
        hasText: text.length > 0,
        stats: {
          wordCount: totalWords,
          characterCount: totalChars,
          readingTimeMinutes,
          uniqueTermsCount: uniqueSignificantTerms.size,
          lexicalDiversityRatio: lexicalDiversity
        },
        tokens,
        termFreqs,
        uniqueSignificantTerms,
        topTerms
      };
    });

    // Pairwise comparisons (primary pair: Doc 0 and Doc 1)
    const docA = docProfiles[0];
    const docB = docProfiles[1];

    // Calculate Shared Terms across Doc A and Doc B
    const sharedTerms = [];
    for (const [term, countA] of docA.termFreqs.entries()) {
      if (docB.termFreqs.has(term)) {
        const countB = docB.termFreqs.get(term);
        sharedTerms.push({
          term,
          countDocA: countA,
          countDocB: countB,
          combinedFrequency: countA + countB
        });
      }
    }
    sharedTerms.sort((a, b) => b.combinedFrequency - a.combinedFrequency);

    // Document A exclusive terms
    const uniqueToDocA = [];
    for (const [term, count] of docA.termFreqs.entries()) {
      if (!docB.termFreqs.has(term)) {
        uniqueToDocA.push({ term, count });
      }
    }
    uniqueToDocA.sort((a, b) => b.count - a.count);

    // Document B exclusive terms
    const uniqueToDocB = [];
    for (const [term, count] of docB.termFreqs.entries()) {
      if (!docA.termFreqs.has(term)) {
        uniqueToDocB.push({ term, count });
      }
    }
    uniqueToDocB.sort((a, b) => b.count - a.count);

    // Deterministic Similarity Calculations
    const jaccardScore = calculateJaccardSimilarity(docA.uniqueSignificantTerms, docB.uniqueSignificantTerms);
    const cosineScore = calculateCosineSimilarity(docA.termFreqs, docB.termFreqs);

    // Weighted composite similarity percentage
    const compositeSimilarity = Math.round(((jaccardScore * 0.4) + (cosineScore * 0.6)) * 100);

    // Overlapping verbatim phrases
    const overlappingPhrases = findOverlappingPhrases(docs[0].extracted_text, docs[1].extracted_text, 10);

    // Fetch chunks for page-level passage alignment if available
    let chunksRows = [];
    try {
      const chunksResult = await db.query(`
        SELECT document_id, chunk_index, content, page_number
        FROM document_chunks
        WHERE document_id = ANY($1::uuid[])
        ORDER BY document_id, chunk_index ASC;
      `, [uniqueIds]);
      chunksRows = chunksResult.rows;
    } catch (chunkQueryErr) {
      console.warn('Could not query document_chunks for passages:', chunkQueryErr.message);
    }

    // Extract passages for Doc A and Doc B
    function extractPassages(doc, chunks) {
      const docChunks = chunks.filter(c => c.document_id === doc.id);
      const list = [];
      if (docChunks.length > 0) {
        for (const chunk of docChunks) {
          const sentences = (chunk.content || '')
            .split(/(?<=[.!?])\s+|\n{2,}/)
            .map(s => s.replace(/\s+/g, ' ').trim())
            .filter(s => s.length >= 25);
          for (const s of sentences) {
            list.push({ text: s, page: chunk.page_number || 1 });
          }
        }
      } else {
        const rawText = doc.extracted_text || '';
        const sentences = rawText
          .split(/(?<=[.!?])\s+|\n{2,}/)
          .map(s => s.replace(/\s+/g, ' ').trim())
          .filter(s => s.length >= 25);
        for (let i = 0; i < sentences.length; i++) {
          list.push({
            text: sentences[i],
            page: Math.floor(i / 10) + 1
          });
        }
      }

      // Deduplicate near identical passages
      const unique = [];
      const seen = new Set();
      for (const item of list) {
        const key = item.text.toLowerCase().slice(0, 60);
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }
      return unique.slice(0, 100);
    }

    const passagesA = extractPassages(docs[0], chunksRows);
    const passagesB = extractPassages(docs[1], chunksRows);

    // Align passages deterministically
    const matchedBIndices = new Set();
    const differences = [];
    const matchingPassages = [];
    const uniqueToA = [];
    const uniqueToB = [];
    let diffCounter = 0;

    for (const pA of passagesA) {
      const tokensA = new Set(tokenize(pA.text));
      let bestMatch = null;
      let bestScore = 0;
      let bestBIndex = -1;

      for (let bIdx = 0; bIdx < passagesB.length; bIdx++) {
        if (matchedBIndices.has(bIdx)) continue;
        const pB = passagesB[bIdx];
        const tokensB = new Set(tokenize(pB.text));
        const jaccard = calculateJaccardSimilarity(tokensA, tokensB);

        if (jaccard > bestScore) {
          bestScore = jaccard;
          bestMatch = pB;
          bestBIndex = bIdx;
        }
      }

      if (bestScore >= 0.65 && bestMatch) {
        matchedBIndices.add(bestBIndex);
        const item = {
          id: `diff-${++diffCounter}`,
          type: 'match',
          color: 'green',
          textA: pA.text,
          textB: bestMatch.text,
          pageA: pA.page,
          pageB: bestMatch.page,
          similarity: parseFloat(bestScore.toFixed(3)),
          description: 'Substantially matching passage across both documents.'
        };
        differences.push(item);
        matchingPassages.push(item);
      } else {
        const item = {
          id: `diff-${++diffCounter}`,
          type: 'unique_a',
          color: 'red',
          textA: pA.text,
          textB: null,
          pageA: pA.page,
          pageB: null,
          similarity: 0,
          description: 'Passage unique to Document A (absent in Document B).'
        };
        differences.push(item);
        uniqueToA.push(item);
      }
    }

    for (let bIdx = 0; bIdx < passagesB.length; bIdx++) {
      if (!matchedBIndices.has(bIdx)) {
        const pB = passagesB[bIdx];
        const item = {
          id: `diff-${++diffCounter}`,
          type: 'unique_b',
          color: 'blue',
          textA: null,
          textB: pB.text,
          pageA: null,
          pageB: pB.page,
          similarity: 0,
          description: 'Passage unique to Document B (absent in Document A).'
        };
        differences.push(item);
        uniqueToB.push(item);
      }
    }

    // Strip internal helper objects before returning JSON
    const cleanDocuments = docProfiles.map(p => ({
      id: p.id,
      originalFilename: p.originalFilename,
      fileSize: p.fileSize,
      status: p.status,
      createdAt: p.createdAt,
      hasText: p.hasText,
      stats: p.stats,
      topTerms: p.topTerms
    }));

    return res.status(200).json({
      algorithmInfo: {
        method: 'Deterministic Lexical Analysis',
        components: [
          'Jaccard Similarity over distinct non-stop-word vocabulary (|A ∩ B| / |A ∪ B|)',
          'Cosine Similarity over Term Frequency (TF) vectors',
          'Exact N-Gram phrase overlap extraction',
          'Page-aware sentence alignment and passage diff detection'
        ],
        llmUsed: false,
        lexicalVsSemanticExplanation: 'Lexical similarity calculates exact word and token overlap using statistical TF-IDF cosine distance and Jaccard set coefficients. In contrast, semantic similarity evaluates conceptual meaning and underlying intent, meaning two documents may express the same ideas using different vocabulary. High lexical similarity guarantees word overlap, but does not imply complete conceptual equivalence.'
      },
      similarityMetrics: {
        compositeScore: compositeSimilarity, // 0 - 100
        jaccardCoefficient: parseFloat(jaccardScore.toFixed(4)),
        cosineSimilarity: parseFloat(cosineScore.toFixed(4)),
        sharedTermsCount: sharedTerms.length,
        uniqueToDocACount: uniqueToDocA.length,
        uniqueToDocBCount: uniqueToDocB.length,
        matchingPassagesCount: matchingPassages.length,
        uniqueToAPassagesCount: uniqueToA.length,
        uniqueToBPassagesCount: uniqueToB.length,
        totalDifferencesCount: uniqueToA.length + uniqueToB.length
      },
      documents: cleanDocuments,
      comparison: {
        docAFilename: docA.originalFilename,
        docBFilename: docB.originalFilename,
        sharedTerms: sharedTerms.slice(0, 40),
        uniqueToDocA: uniqueToDocA.slice(0, 30),
        uniqueToDocB: uniqueToDocB.slice(0, 30),
        overlappingPhrases
      },
      passageComparison: {
        differences,
        matchingPassages,
        uniqueToA,
        uniqueToB,
        summary: {
          totalPassagesA: passagesA.length,
          totalPassagesB: passagesB.length,
          matchingCount: matchingPassages.length,
          uniqueToACount: uniqueToA.length,
          uniqueToBCount: uniqueToB.length,
          totalDifferences: uniqueToA.length + uniqueToB.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  compareDocuments
};

