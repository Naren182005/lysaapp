/**
 * Document Type Detection Utility
 * 
 * This module provides specialized functions for detecting document types
 * and optimizing OCR parameters based on document characteristics.
 */

/**
 * Interface for document type detection result
 */
export interface DocumentTypeResult {
  isHandwritten: boolean;
  isPrintedText: boolean;
  isQuestionPaper: boolean;
  isMCQOptions: boolean;
  isModelAnswer: boolean;
  isStudentAnswer: boolean;
  confidence: number; // 0-1 confidence score
  detectedFeatures: string[]; // List of detected features that led to this classification
}

/**
 * Analyzes an image to detect document type characteristics
 * @param imageData The image data as a Uint8ClampedArray
 * @param width The width of the image
 * @param height The height of the image
 * @returns A DocumentTypeResult with detected document characteristics
 */
export const detectDocumentType = (
  imageData: Uint8ClampedArray,
  width: number,
  height: number
): DocumentTypeResult => {
  // Initialize result with default values
  const result: DocumentTypeResult = {
    isHandwritten: false,
    isPrintedText: false,
    isQuestionPaper: false,
    isMCQOptions: false,
    isModelAnswer: false,
    isStudentAnswer: false,
    confidence: 0.5,
    detectedFeatures: []
  };

  // Calculate image statistics for analysis
  const stats = calculateImageStatistics(imageData, width, height);
  
  // Detect if the document contains handwritten text
  const handwritingScore = detectHandwriting(imageData, width, height, stats);
  result.isHandwritten = handwritingScore > 0.6;
  if (result.isHandwritten) {
    result.detectedFeatures.push(`Handwriting detected (score: ${handwritingScore.toFixed(2)})`);
  }
  
  // Detect if the document contains printed text
  const printedTextScore = detectPrintedText(imageData, width, height, stats);
  result.isPrintedText = printedTextScore > 0.6;
  if (result.isPrintedText) {
    result.detectedFeatures.push(`Printed text detected (score: ${printedTextScore.toFixed(2)})`);
  }
  
  // Detect if the document is a question paper
  const questionPaperScore = detectQuestionPaper(imageData, width, height, stats);
  result.isQuestionPaper = questionPaperScore > 0.7;
  if (result.isQuestionPaper) {
    result.detectedFeatures.push(`Question paper features detected (score: ${questionPaperScore.toFixed(2)})`);
  }
  
  // Detect if the document contains MCQ options
  const mcqOptionsScore = detectMCQOptions(imageData, width, height, stats);
  result.isMCQOptions = mcqOptionsScore > 0.7;
  if (result.isMCQOptions) {
    result.detectedFeatures.push(`MCQ options detected (score: ${mcqOptionsScore.toFixed(2)})`);
  }
  
  // Determine if this is a model answer or student answer
  if (result.isHandwritten && !result.isQuestionPaper) {
    result.isStudentAnswer = true;
    result.detectedFeatures.push('Classified as student answer (handwritten, not question paper)');
  } else if (result.isPrintedText && !result.isQuestionPaper) {
    result.isModelAnswer = true;
    result.detectedFeatures.push('Classified as model answer (printed text, not question paper)');
  }
  
  // Calculate overall confidence based on feature detection scores
  result.confidence = calculateConfidence(
    handwritingScore,
    printedTextScore,
    questionPaperScore,
    mcqOptionsScore
  );
  
  return result;
};

/**
 * Calculates image statistics for analysis
 * @param imageData The image data as a Uint8ClampedArray
 * @param width The width of the image
 * @param height The height of the image
 * @returns Object containing image statistics
 */
const calculateImageStatistics = (
  imageData: Uint8ClampedArray,
  width: number,
  height: number
): {
  avgBrightness: number;
  darkRatio: number;
  lightRatio: number;
  edgeDensity: number;
  lineCount: number;
  verticalLineCount: number;
  horizontalLineCount: number;
} => {
  let totalBrightness = 0;
  let darkPixels = 0;
  let lightPixels = 0;
  let edgePixels = 0;
  let horizontalLines = 0;
  let verticalLines = 0;
  
  // Calculate brightness statistics
  for (let i = 0; i < imageData.length; i += 4) {
    const pixelBrightness = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
    totalBrightness += pixelBrightness;
    
    if (pixelBrightness < 50) darkPixels++;
    if (pixelBrightness > 200) lightPixels++;
  }
  
  const avgBrightness = totalBrightness / (imageData.length / 4);
  const darkRatio = darkPixels / (imageData.length / 4);
  const lightRatio = lightPixels / (imageData.length / 4);
  
  // Detect edges and lines (simplified algorithm)
  const edgeMap = new Uint8Array(width * height);
  const horizontalLineMap = new Uint8Array(height);
  const verticalLineMap = new Uint8Array(width);
  
  // Simple edge detection
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const up = ((y - 1) * width + x) * 4;
      const down = ((y + 1) * width + x) * 4;
      const left = (y * width + (x - 1)) * 4;
      const right = (y * width + (x + 1)) * 4;
      
      // Calculate gradient magnitude (simplified)
      const gx = Math.abs(imageData[right] - imageData[left]);
      const gy = Math.abs(imageData[down] - imageData[up]);
      const gradient = Math.sqrt(gx*gx + gy*gy);
      
      if (gradient > 30) { // Edge detection threshold
        edgePixels++;
        edgeMap[y * width + x] = 1;
        
        // Track horizontal and vertical lines
        horizontalLineMap[y]++;
        verticalLineMap[x]++;
      }
    }
  }
  
  // Count horizontal and vertical lines
  for (let y = 0; y < height; y++) {
    if (horizontalLineMap[y] > width * 0.5) {
      horizontalLines++;
    }
  }
  
  for (let x = 0; x < width; x++) {
    if (verticalLineMap[x] > height * 0.5) {
      verticalLines++;
    }
  }
  
  const edgeDensity = edgePixels / (width * height);
  
  return {
    avgBrightness,
    darkRatio,
    lightRatio,
    edgeDensity,
    lineCount: horizontalLines + verticalLines,
    horizontalLineCount: horizontalLines,
    verticalLineCount: verticalLines
  };
};

/**
 * Detects handwriting features in an image
 * @param imageData The image data as a Uint8ClampedArray
 * @param width The width of the image
 * @param height The height of the image
 * @param stats Image statistics
 * @returns A score between 0 and 1 indicating handwriting likelihood
 */
const detectHandwriting = (
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  stats: ReturnType<typeof calculateImageStatistics>
): number => {
  // Handwriting typically has:
  // 1. Higher edge density but less structured than printed text
  // 2. More irregular line patterns
  // 3. Fewer perfectly horizontal or vertical lines
  
  // Calculate handwriting score based on these characteristics
  let score = 0;
  
  // Edge density is a good indicator of handwriting
  if (stats.edgeDensity > 0.05 && stats.edgeDensity < 0.2) {
    score += 0.4;
  } else if (stats.edgeDensity >= 0.2) {
    score += 0.2; // Very high edge density might be noise or other features
  }
  
  // Handwriting typically has fewer perfect horizontal/vertical lines
  if (stats.horizontalLineCount < height * 0.05 && stats.verticalLineCount < width * 0.05) {
    score += 0.3;
  }
  
  // Handwriting often has more varied brightness
  if (stats.darkRatio > 0.1 && stats.darkRatio < 0.4) {
    score += 0.3;
  }
  
  return Math.min(1, score);
};

/**
 * Detects printed text features in an image
 * @param imageData The image data as a Uint8ClampedArray
 * @param width The width of the image
 * @param height The height of the image
 * @param stats Image statistics
 * @returns A score between 0 and 1 indicating printed text likelihood
 */
const detectPrintedText = (
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  stats: ReturnType<typeof calculateImageStatistics>
): number => {
  // Printed text typically has:
  // 1. More regular edge patterns
  // 2. More consistent line spacing
  // 3. Higher contrast between text and background
  
  let score = 0;
  
  // Printed text typically has moderate edge density
  if (stats.edgeDensity > 0.03 && stats.edgeDensity < 0.15) {
    score += 0.4;
  }
  
  // Printed text often has more horizontal alignment
  if (stats.horizontalLineCount > height * 0.05) {
    score += 0.3;
  }
  
  // Printed text usually has good contrast
  if (stats.darkRatio > 0.05 && stats.darkRatio < 0.3 && stats.lightRatio > 0.5) {
    score += 0.3;
  }
  
  return Math.min(1, score);
};

/**
 * Detects question paper features in an image
 * @param imageData The image data as a Uint8ClampedArray
 * @param width The width of the image
 * @param height The height of the image
 * @param stats Image statistics
 * @returns A score between 0 and 1 indicating question paper likelihood
 */
const detectQuestionPaper = (
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  stats: ReturnType<typeof calculateImageStatistics>
): number => {
  // Question papers typically have:
  // 1. Structured layout with clear sections
  // 2. Numbered questions
  // 3. More horizontal lines for separation
  
  let score = 0;
  
  // Question papers typically have more horizontal lines for separation
  if (stats.horizontalLineCount > height * 0.08) {
    score += 0.4;
  }
  
  // Question papers usually have good contrast for readability
  if (stats.darkRatio > 0.05 && stats.darkRatio < 0.25 && stats.lightRatio > 0.6) {
    score += 0.3;
  }
  
  // Question papers often have moderate edge density from text and structure
  if (stats.edgeDensity > 0.04 && stats.edgeDensity < 0.12) {
    score += 0.3;
  }
  
  return Math.min(1, score);
};

/**
 * Detects MCQ options features in an image
 * @param imageData The image data as a Uint8ClampedArray
 * @param width The width of the image
 * @param height The height of the image
 * @param stats Image statistics
 * @returns A score between 0 and 1 indicating MCQ options likelihood
 */
const detectMCQOptions = (
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  stats: ReturnType<typeof calculateImageStatistics>
): number => {
  // MCQ options typically have:
  // 1. Regular pattern of option markers (A, B, C, D)
  // 2. Aligned text with similar indentation
  // 3. Consistent spacing between options
  
  let score = 0;
  
  // MCQ options typically have regular horizontal spacing
  if (stats.horizontalLineCount > height * 0.1) {
    score += 0.4;
  }
  
  // MCQ options usually have moderate edge density
  if (stats.edgeDensity > 0.03 && stats.edgeDensity < 0.1) {
    score += 0.3;
  }
  
  // MCQ options often have good contrast for readability
  if (stats.darkRatio > 0.05 && stats.darkRatio < 0.2 && stats.lightRatio > 0.7) {
    score += 0.3;
  }
  
  return Math.min(1, score);
};

/**
 * Calculates overall confidence based on feature detection scores
 * @param handwritingScore Handwriting detection score
 * @param printedTextScore Printed text detection score
 * @param questionPaperScore Question paper detection score
 * @param mcqOptionsScore MCQ options detection score
 * @returns A confidence score between 0 and 1
 */
const calculateConfidence = (
  handwritingScore: number,
  printedTextScore: number,
  questionPaperScore: number,
  mcqOptionsScore: number
): number => {
  // Calculate confidence based on the strength and consistency of detected features
  const maxScore = Math.max(handwritingScore, printedTextScore, questionPaperScore, mcqOptionsScore);
  
  // If we have strong conflicting signals, reduce confidence
  if (handwritingScore > 0.7 && printedTextScore > 0.7) {
    return 0.5; // Conflicting signals
  }
  
  // Higher confidence if we have strong signals
  if (maxScore > 0.8) {
    return 0.9;
  } else if (maxScore > 0.6) {
    return 0.8;
  } else {
    return 0.6;
  }
};
