/**
 * Keyword Extractor Utility
 *
 * This utility extracts important keywords from text for comparison purposes.
 * It uses natural language processing techniques to identify significant terms.
 */

/**
 * Extracts important keywords from a text with a focus on content rather than formatting
 * @param text The text to extract keywords from
 * @returns An array of keywords
 */
export function extractKeywords(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Normalize text by removing extra whitespace and converting to lowercase
  const normalizedText = text.trim().toLowerCase();

  // Store all potential keywords
  let allKeywords: string[] = [];

  // Method 1: Extract comma-separated keywords (from Together API or similar formats)
  if (normalizedText.includes(',')) {
    const commaKeywords = normalizedText
      .split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length >= 2);

    allKeywords = [...allKeywords, ...commaKeywords];
  }

  // Method 2: Extract from bullet points or numbered lists (vertical format)
  if (normalizedText.includes('\n-') || normalizedText.includes('\n•') || /\n\d+\./.test(normalizedText)) {
    const lines = normalizedText.split('\n');
    const listKeywords = lines
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.startsWith('-') ||
               trimmed.startsWith('•') ||
               /^\d+\./.test(trimmed) ||
               /^[a-z][\)\.]\s/.test(trimmed); // Match formats like "a)" or "b."
      })
      .map(line => line.replace(/^[-•\d\w][\.\)]*\s*/, '').trim())
      .filter(keyword => keyword.length >= 2);

    allKeywords = [...allKeywords, ...listKeywords];
  }

  // Method 3: Extract from horizontal format (e.g., "a) option1 b) option2")
  const horizontalMatches = normalizedText.match(/[a-z][\.\)]\s*[^a-z\.\)]+/g);
  if (horizontalMatches) {
    const horizontalKeywords = horizontalMatches
      .map(match => match.replace(/^[a-z][\.\)]\s*/, '').trim())
      .filter(keyword => keyword.length >= 2);

    allKeywords = [...allKeywords, ...horizontalKeywords];
  }

  // Method 4: Extract from semicolon-separated lists
  if (normalizedText.includes(';')) {
    const semicolonKeywords = normalizedText
      .split(';')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length >= 2);

    allKeywords = [...allKeywords, ...semicolonKeywords];
  }

  // Method 5: Extract sentences as potential keywords for content-focused matching
  const sentences = normalizedText
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length >= 5 && s.length <= 100); // Only consider reasonably sized sentences

  if (sentences.length > 0) {
    allKeywords = [...allKeywords, ...sentences];
  }

  // If we haven't found many keywords yet, extract key phrases
  if (allKeywords.length < 3) {
    // Extract noun phrases and important concept phrases
    const phrases = extractImportantPhrases(normalizedText);
    if (phrases.length > 0) {
      allKeywords = [...allKeywords, ...phrases];
    }
  }

  // If we still haven't found any keywords, fall back to processing as regular text
  if (allKeywords.length === 0) {
    // Remove common punctuation
    const cleanText = normalizedText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

    // Split into words
    const words = cleanText.split(/\s+/).filter(word => word.length >= 3);

    // Filter out common stop words
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'to', 'from', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
      'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
      'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
      'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
      'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should',
      'now', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
      'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up',
      'down', 'that', 'this', 'these', 'those', 'am', 'as', 'if', 'it', 'its'
    ]);

    // Filter out stop words and keep only words with 3 or more characters
    const filteredWords = words.filter(word =>
      !stopWords.has(word) && word.length >= 3
    );

    // Get the most frequent words as keywords
    const wordFrequency: Record<string, number> = {};
    filteredWords.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    // Sort by frequency
    const sortedWords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    // Take the top 10 words as keywords
    allKeywords = [...allKeywords, ...sortedWords.slice(0, 10)];
  }

  // Remove duplicates and log the results
  const uniqueKeywords = [...new Set(allKeywords)];
  console.log("Extracted keywords from text:", uniqueKeywords);
  return uniqueKeywords;
}

/**
 * Extracts important phrases from text that might represent key concepts
 * @param text The text to extract phrases from
 * @returns An array of important phrases
 */
function extractImportantPhrases(text: string): string[] {
  if (!text) return [];

  // Clean the text
  const cleanText = text
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // Split into words
  const words = cleanText.split(' ');

  // List of important domain-specific terms that might indicate a key concept
  const importantTerms = [
    'algorithm', 'function', 'variable', 'constant', 'equation', 'formula',
    'theory', 'principle', 'law', 'theorem', 'proof', 'definition',
    'concept', 'method', 'technique', 'process', 'system', 'structure',
    'analysis', 'synthesis', 'evaluation', 'application', 'implementation',
    'data', 'information', 'knowledge', 'understanding', 'comprehension',
    'solution', 'problem', 'challenge', 'question', 'answer', 'result',
    'cause', 'effect', 'reason', 'example', 'illustration', 'evidence',
    'argument', 'conclusion', 'summary', 'introduction', 'development',
    'feature', 'characteristic', 'property', 'attribute', 'quality',
    'factor', 'element', 'component', 'part', 'whole', 'relationship'
  ];

  const phrases: string[] = [];

  // Look for 2-3 word phrases containing important terms
  for (let i = 0; i < words.length; i++) {
    // Check if this word is an important term
    if (importantTerms.includes(words[i])) {
      // Try to extract 2-word phrase
      if (i > 0) {
        phrases.push(`${words[i-1]} ${words[i]}`);
      }
      if (i < words.length - 1) {
        phrases.push(`${words[i]} ${words[i+1]}`);
      }

      // Try to extract 3-word phrase
      if (i > 0 && i < words.length - 1) {
        phrases.push(`${words[i-1]} ${words[i]} ${words[i+1]}`);
      }
    }
  }

  // Also extract any phrases that look like they might be important concepts
  // (e.g., "object-oriented programming", "data structure", etc.)
  const conceptPatterns = [
    /(\w+)\s+(algorithm|method|technique|approach|system|theory|principle|concept|process)/g,
    /(algorithm|method|technique|approach|system|theory|principle|concept|process)\s+(\w+)/g,
    /(\w+)\s+(\w+)\s+(algorithm|method|technique|approach|system|theory|principle|concept|process)/g,
    /(algorithm|method|technique|approach|system|theory|principle|concept|process)\s+(\w+)\s+(\w+)/g
  ];

  for (const pattern of conceptPatterns) {
    const matches = cleanText.match(pattern);
    if (matches) {
      phrases.push(...matches);
    }
  }

  // Remove duplicates
  return [...new Set(phrases)];
}

/**
 * Extracts key phrases (2-3 word combinations) from text
 * @param text The text to extract key phrases from
 * @returns An array of key phrases
 */
export function extractKeyPhrases(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Convert to lowercase for case-insensitive comparison
  const lowerText = text.toLowerCase();

  // Remove common punctuation
  const cleanText = lowerText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

  // Split into words
  const words = cleanText.split(/\s+/).filter(word => word.length > 0);

  // Generate 2-3 word phrases
  const phrases: string[] = [];

  // Generate 2-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }

  // Generate 3-word phrases
  for (let i = 0; i < words.length - 2; i++) {
    phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  // Remove duplicates
  const uniquePhrases = [...new Set(phrases)];

  return uniquePhrases;
}

/**
 * Calculates the similarity score between two texts based on keyword matching
 * @param text1 First text
 * @param text2 Second text
 * @returns A similarity score between 0 and 1
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const keywords1 = extractKeywords(text1);
  const keywords2 = extractKeywords(text2);

  const keyPhrases1 = extractKeyPhrases(text1);
  const keyPhrases2 = extractKeyPhrases(text2);

  // Count matching keywords
  let matchingKeywords = 0;
  for (const keyword of keywords1) {
    if (keywords2.includes(keyword)) {
      matchingKeywords++;
    }
  }

  // Count matching phrases (weighted higher)
  let matchingPhrases = 0;
  for (const phrase of keyPhrases1) {
    if (keyPhrases2.includes(phrase)) {
      matchingPhrases++;
    }
  }

  // Calculate similarity score
  // Phrases are weighted 3x more than individual keywords
  const totalScore = matchingKeywords + (matchingPhrases * 3);
  const maxPossibleScore = keywords1.length + (keyPhrases1.length * 3);

  // Prevent division by zero
  if (maxPossibleScore === 0) {
    return 0;
  }

  return totalScore / maxPossibleScore;
}

/**
 * Normalizes text for content-focused comparison
 * @param text The text to normalize
 * @returns Normalized text
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()                                // Convert to lowercase
    .replace(/\s+/g, ' ')                         // Normalize whitespace
    .replace(/[.,;:!?()[\]{}'"]/g, ' ')           // Replace punctuation with spaces
    .replace(/\s+/g, ' ')                         // Normalize whitespace again
    .trim();                                      // Remove leading/trailing whitespace
}

/**
 * Calculates the Levenshtein distance between two strings
 * @param a First string
 * @param b Second string
 * @returns The edit distance between the strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize the matrix
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Calculates the similarity between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns A similarity score between 0 and 1
 */
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;

  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;

  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLength);
}

/**
 * Checks if two strings are similar enough to be considered a match
 * @param str1 First string
 * @param str2 Second string
 * @param threshold Similarity threshold (default: 0.7)
 * @returns True if the strings are similar enough
 */
function isSimilarString(str1: string, str2: string, threshold: number = 0.7): boolean {
  return stringSimilarity(str1, str2) >= threshold;
}

/**
 * Finds matching keywords between two texts with a focus on content rather than formatting
 * @param modelAnswer The model answer text (comma-separated keywords)
 * @param studentAnswer The student answer text
 * @returns An object with matching keywords and phrases
 */
export function findMatchingKeywords(modelAnswer: string, studentAnswer: string): {
  matchingKeywords: string[];
  matchingPhrases: string[];
  similarity: number;
} {
  // Normalize both texts to handle different formatting styles
  const normalizedModelAnswer = normalizeText(modelAnswer);
  const normalizedStudentAnswer = normalizeText(studentAnswer);

  console.log("Normalized model answer:", normalizedModelAnswer.substring(0, 100) + (normalizedModelAnswer.length > 100 ? '...' : ''));
  console.log("Normalized student answer:", normalizedStudentAnswer.substring(0, 100) + (normalizedStudentAnswer.length > 100 ? '...' : ''));

  // Extract keywords from both texts using our enhanced extractor
  const modelKeywords = extractKeywords(normalizedModelAnswer);
  const studentKeywords = extractKeywords(normalizedStudentAnswer);

  console.log("Model keywords:", modelKeywords);
  console.log("Student keywords:", studentKeywords);

  // Find matching keywords - check for exact matches first, then try more lenient matching
  let matchingKeywords: string[] = [];

  // First try exact matches (case-insensitive)
  for (const modelKeyword of modelKeywords) {
    if (studentKeywords.some(sk => sk.toLowerCase() === modelKeyword.toLowerCase())) {
      matchingKeywords.push(modelKeyword);
    }
  }

  // Try partial matches (one keyword contains the other)
  for (const modelKeyword of modelKeywords) {
    // Skip already matched keywords
    if (matchingKeywords.includes(modelKeyword)) continue;

    for (const studentKeyword of studentKeywords) {
      // Check if student keyword contains the model keyword or vice versa
      // Only consider meaningful matches (at least 3 characters)
      const mkLower = modelKeyword.toLowerCase();
      const skLower = studentKeyword.toLowerCase();

      if ((mkLower.length >= 3 && skLower.includes(mkLower)) ||
          (skLower.length >= 3 && mkLower.includes(skLower))) {
        matchingKeywords.push(modelKeyword);
        break;
      }
    }
  }

  // Try word-level matching for more flexibility
  if (matchingKeywords.length < Math.min(2, modelKeywords.length / 2)) {
    // Split both answers into individual words
    const modelWords = normalizedModelAnswer.split(/\s+/).filter(w => w.length > 3);
    const studentWords = normalizedStudentAnswer.split(/\s+/).filter(w => w.length > 3);

    // Check for word-level matches
    for (const modelKeyword of modelKeywords) {
      // Skip already matched keywords
      if (matchingKeywords.includes(modelKeyword)) continue;

      // Split the model keyword into words
      const keywordWords = modelKeyword.split(/\s+/).filter(w => w.length > 3);

      // If any significant word from the keyword appears in the student answer, count it as a match
      if (keywordWords.some(kw => studentWords.some(sw => isSimilarString(kw, sw, 0.8)))) {
        matchingKeywords.push(modelKeyword);
      }
    }
  }

  // Check if the entire student answer contains the essential concepts
  if (matchingKeywords.length === 0) {
    // Check if the student answer as a whole contains any of the model keywords
    for (const modelKeyword of modelKeywords) {
      if (normalizedStudentAnswer.includes(modelKeyword.toLowerCase())) {
        matchingKeywords.push(modelKeyword);
      }
    }
  }

  // For backward compatibility and additional matching, extract and compare phrases
  const modelPhrases = extractKeyPhrases(normalizedModelAnswer);
  const studentPhrases = extractKeyPhrases(normalizedStudentAnswer);

  // Find matching phrases with more flexible matching
  const matchingPhrases = modelPhrases.filter(phrase =>
    studentPhrases.some(sp => isSimilarString(sp.toLowerCase(), phrase.toLowerCase(), 0.7))
  );

  // Check for concept presence in the entire answer
  if (matchingKeywords.length === 0 && matchingPhrases.length === 0) {
    // Direct content check - see if the student answer contains the essential concepts
    // This is a last resort for very differently formatted answers
    const studentAnswerContainsEssentialConcepts = modelKeywords.some(keyword => {
      // For each model keyword, check if any part of the student answer is similar
      const keywordWords = keyword.split(/\s+/).filter(w => w.length > 3);
      return keywordWords.some(kw =>
        normalizedStudentAnswer.split(/\s+/).some(sw => isSimilarString(kw, sw, 0.8))
      );
    });

    if (studentAnswerContainsEssentialConcepts) {
      // If we found essential concepts, add the first model keyword as a match
      // This ensures the student gets credit for having the right content
      if (modelKeywords.length > 0) {
        matchingKeywords.push(modelKeywords[0]);
      }
    }
  }

  // Always set similarity to 1.0 (100%) if there's any match
  // This ensures full marks for any matching content, regardless of format
  const similarity = (matchingKeywords.length > 0 || matchingPhrases.length > 0) ? 1.0 : 0.0;

  console.log("Matching keywords:", matchingKeywords);
  console.log("Matching phrases:", matchingPhrases);
  console.log("Similarity score:", similarity);

  return {
    matchingKeywords,
    matchingPhrases,
    similarity
  };
}

export default {
  extractKeywords,
  extractKeyPhrases,
  calculateSimilarity,
  findMatchingKeywords,
  normalizeText
};
