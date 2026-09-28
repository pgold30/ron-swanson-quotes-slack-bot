/**
 * Inverted word index for searching Ron Swanson quotes by topic or phrase.
 */

const quotes = require('./quotes');

const wordIndex = new Map();

// Common English stop words (from https://github.com/fergiemcdowall/stopword)
const stopWords = new Set([
  'about', 'after', 'all', 'also', 'am', 'an', 'and', 'another', 'any', 'are', 'as', 'at', 'be',
  'because', 'been', 'before', 'being', 'between', 'both', 'but', 'by', 'came', 'can',
  'come', 'could', 'did', 'do', 'each', 'for', 'from', 'get', 'got', 'has', 'had',
  'he', 'have', 'her', 'here', 'him', 'himself', 'his', 'how', 'if', 'in', 'into',
  'is', 'it', 'like', 'make', 'many', 'me', 'might', 'more', 'most', 'much', 'must',
  'my', 'never', 'now', 'of', 'on', 'only', 'or', 'other', 'our', 'out', 'over',
  'said', 'same', 'see', 'should', 'since', 'some', 'still', 'such', 'take', 'than',
  'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'to', 'too', 'under', 'up', 'very', 'was', 'way', 'we', 'well', 'were',
  'what', 'where', 'which', 'while', 'who', 'with', 'would', 'you', 'your', 'a', 'i'
]);

function sample(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Extracts normalized search tokens from a string.
 * Splits on whitespace and punctuation (including newlines, ellipses, hyphens)
 * while also preserving compound words and stripping possessive suffixes.
 */
function tokenize(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return [];
  }

  const normalized = text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B`]/g, "'");

  const rawTokens = normalized.split(/[^a-z0-9']+/i).filter(Boolean);
  const tokens = new Set();

  for (const raw of rawTokens) {
    const cleaned = raw.replace(/^'+|'+$/g, '');
    if (!cleaned) continue;

    tokens.add(cleaned);

    // Also index without trailing "'s" (e.g. "tammy's" -> "tammy")
    if (cleaned.endsWith("'s") && cleaned.length > 2) {
      tokens.add(cleaned.slice(0, -2));
    }

    // Also index stripped of internal apostrophes (e.g. "don't" -> "dont")
    if (cleaned.includes("'")) {
      const noApostrophe = cleaned.replace(/'/g, '');
      if (noApostrophe) tokens.add(noApostrophe);
    }
  }

  return Array.from(tokens);
}

function addWordToIndex(word, quoteIdx) {
  if (!word || stopWords.has(word)) {
    return;
  }
  if (!wordIndex.has(word)) {
    wordIndex.set(word, new Set([quoteIdx]));
  } else {
    wordIndex.get(word).add(quoteIdx);
  }
}

function initIndex() {
  wordIndex.clear();

  quotes.forEach((quote, idx) => {
    const tokens = tokenize(quote);
    tokens.forEach(word => addWordToIndex(word, idx));
  });
}

function getQuoteByWord(rawQuery = '') {
  if (wordIndex.size === 0) {
    initIndex();
  }

  if (typeof rawQuery !== 'string') {
    return makeQuoteObj('', false, sample(quotes));
  }

  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return makeQuoteObj('', false, sample(quotes));
  }

  const allTokens = tokenize(trimmed);
  const searchTokens = allTokens.filter(t => !stopWords.has(t));
  const effectiveTokens = searchTokens.length > 0 ? searchTokens : allTokens;
  const origWord = effectiveTokens.join(' ') || trimmed.toLowerCase();

  if (effectiveTokens.length === 0) {
    return makeQuoteObj('', false, sample(quotes));
  }

  // Score quotes by how many query tokens they match in the word index
  const quoteScores = new Map();

  for (const token of effectiveTokens) {
    let matchedIndices = wordIndex.get(token);

    // Fallback: check singular/plural or prefix matches in the index
    if (!matchedIndices || matchedIndices.size === 0) {
      const fallbackSet = new Set();
      const singular = token.endsWith('es') && token.length > 4
        ? token.slice(0, -2)
        : token.endsWith('s') && token.length > 3
          ? token.slice(0, -1)
          : null;

      for (const [indexedWord, indices] of wordIndex.entries()) {
        if (
          (singular && indexedWord === singular) ||
          indexedWord === `${token}s` ||
          indexedWord === `${token}es` ||
          (token.length >= 4 && indexedWord.startsWith(token))
        ) {
          indices.forEach(i => fallbackSet.add(i));
        }
      }

      if (fallbackSet.size > 0) {
        matchedIndices = fallbackSet;
      }
    }

    if (matchedIndices && matchedIndices.size > 0) {
      for (const idx of matchedIndices) {
        quoteScores.set(idx, (quoteScores.get(idx) || 0) + 1);
      }
    }
  }

  if (quoteScores.size > 0) {
    const maxScore = Math.max(...quoteScores.values());
    const bestIndices = [];
    for (const [idx, score] of quoteScores.entries()) {
      if (score === maxScore) {
        bestIndices.push(idx);
      }
    }
    return makeQuoteObj(origWord, true, quotes[sample(bestIndices)]);
  }

  return makeQuoteObj(origWord, false, sample(quotes));
}

function makeQuoteObj(origWord, wasFound, quote) {
  return {
    origWord,
    wasFound,
    quote
  };
}

module.exports = {
  initIndex,
  getQuoteByWord
};
