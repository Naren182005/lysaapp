/**
 * Utility functions for text processing and reconstruction
 */

/**
 * Interface for OCR text segment
 */
export interface OCRTextSegment {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isPartialRecovery?: boolean; // Flag to indicate if this segment was recovered with lower confidence
  isRecovered?: boolean; // Flag to indicate if this segment was recovered using a fallback method
}

/**
 * Reconstructs text from multiple OCR segments
 * @param segments Array of OCR text segments with position information
 * @param isQuestionPaper Whether the text is from a question paper (true) or answer sheet (false)
 * @param isModelAnswer Whether the text is from a model answer (true) or student answer (false)
 * @param includesPartialRecovery Whether the segments include partial recovery segments
 * @returns The reconstructed text
 */
export const reconstructTextFromSegments = (
  segments: OCRTextSegment[],
  isQuestionPaper: boolean = false,
  isModelAnswer: boolean = false,
  includesPartialRecovery: boolean = false
): string => {
  // Sort segments by position (top to bottom, left to right)
  const sortedSegments = [...segments].sort((a, b) => {
    // Group segments into rows based on vertical position
    const rowThreshold = Math.min(a.height, b.height) * 0.5;

    if (Math.abs(a.y - b.y) < rowThreshold) {
      // Same row, sort by x position
      return a.x - b.x;
    }

    // Different rows, sort by y position
    return a.y - b.y;
  });

  // Group segments into rows with improved algorithm
  const rows: OCRTextSegment[][] = [];
  let currentRow: OCRTextSegment[] = [];

  // Calculate average line height for better row grouping
  const avgHeight = sortedSegments.reduce((sum, seg) => sum + seg.height, 0) / sortedSegments.length;

  // Use document type to adjust row grouping parameters
  const rowThresholdMultiplier = isQuestionPaper ? 0.6 :
                                isModelAnswer ? 0.55 : 0.7; // Higher threshold for handwritten text

  // Track the last segment's bottom position for better row detection
  let lastSegmentBottom = -1;

  sortedSegments.forEach(segment => {
    // Calculate the vertical center of this segment
    const segmentCenter = segment.y + (segment.height / 2);

    if (lastSegmentBottom === -1) {
      // First segment
      currentRow.push(segment);
      lastSegmentBottom = segment.y + segment.height;
    } else {
      // Calculate dynamic threshold based on current segment and document type
      const dynamicThreshold = Math.max(
        avgHeight * rowThresholdMultiplier,
        Math.min(segment.height, currentRow[0].height) * rowThresholdMultiplier
      );

      // Check if this segment overlaps vertically with the current row
      const verticalOverlap = segment.y < lastSegmentBottom;

      // Check if this segment is close enough to be in the same row
      const isCloseEnough = Math.abs(segment.y - (lastSegmentBottom - currentRow[0].height)) < dynamicThreshold;

      if (verticalOverlap || isCloseEnough) {
        // Same row - update the last segment bottom if this one extends lower
        currentRow.push(segment);
        lastSegmentBottom = Math.max(lastSegmentBottom, segment.y + segment.height);
      } else {
        // New row
        rows.push([...currentRow]);
        currentRow = [segment];
        lastSegmentBottom = segment.y + segment.height;
      }
    }
  });

  // Add the last row
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // Post-process rows to handle multi-column layouts
  if (isQuestionPaper) {
    // Detect if this might be a multi-column layout
    const potentialColumns = detectColumns(rows);

    if (potentialColumns.length > 1) {
      // Reorder rows based on column structure
      rows = reorderMultiColumnRows(rows, potentialColumns);
    }
  }

  // Combine text from each row with improved spacing detection
  let reconstructedText = '';

  rows.forEach(row => {
    // Sort segments in the row by x position
    row.sort((a, b) => a.x - b.x);

    // Combine text from segments in the row
    let rowText = '';
    let lastSegment: OCRTextSegment | null = null;

    row.forEach(segment => {
      if (lastSegment === null) {
        // First segment in the row
        rowText += segment.text;
      } else {
        // Calculate dynamic gap threshold based on font size and document type
        const avgCharWidth = segment.width / Math.max(1, segment.text.length);
        const lastAvgCharWidth = lastSegment.width / Math.max(1, lastSegment.text.length);
        const meanCharWidth = (avgCharWidth + lastAvgCharWidth) / 2;

        // Adjust threshold based on document type
        const gapMultiplier = isQuestionPaper ? 0.7 :
                             isModelAnswer ? 0.6 : 0.8; // Higher for handwritten text

        const gapThreshold = meanCharWidth * gapMultiplier;

        // Calculate the actual gap between segments
        const actualGap = segment.x - (lastSegment.x + lastSegment.width);

        // Determine if we need to add space(s) or other characters
        if (actualGap > gapThreshold * 3) {
          // Very large gap might indicate a tab or multiple spaces
          // For question papers, this might be a formatting element
          if (isQuestionPaper && actualGap > gapThreshold * 8) {
            rowText += '\t' + segment.text; // Use tab for very large gaps in question papers
          } else {
            rowText += '  ' + segment.text; // Use double space for large gaps
          }
        } else if (actualGap > gapThreshold) {
          // Normal word spacing gap
          rowText += ' ' + segment.text;
        } else {
          // No significant gap, check for punctuation
          const lastChar = rowText.charAt(rowText.length - 1);
          const firstChar = segment.text.charAt(0);

          // Handle special cases where space might be needed despite small gap
          if ((lastChar.match(/[a-zA-Z0-9]/) && firstChar.match(/[a-zA-Z0-9]/)) ||
              (lastChar === '.' && firstChar.match(/[A-Z]/))) {
            rowText += ' ' + segment.text; // Add space between words or after sentence
          } else {
            rowText += segment.text; // Just append without space
          }
        }
      }

      lastSegment = segment;
    });

    // Add the row text to the reconstructed text
    reconstructedText += rowText + '\n';
  });

  // Post-process the reconstructed text
  let processedText = postProcessReconstructedText(reconstructedText, isQuestionPaper, isModelAnswer);

  // Add a note if this includes partial recovery or recovered segments
  if (includesPartialRecovery || segments.some(segment => segment.isRecovered)) {
    processedText += "\n\n[Note: Some text may be incomplete or inaccurate due to recovery from low-quality image segments.]";
  }

  return processedText;
};

/**
 * Post-processes reconstructed text to improve quality
 * @param text The reconstructed text
 * @param isQuestionPaper Whether the text is from a question paper
 * @param isModelAnswer Whether the text is from a model answer
 * @returns The processed text
 */
/**
 * Detects potential columns in a document based on text segment positions
 * @param rows Array of rows, each containing OCR text segments
 * @returns Array of column boundaries (x-coordinates)
 */
const detectColumns = (rows: OCRTextSegment[][]): number[] => {
  // Skip if there are too few rows to reliably detect columns
  if (rows.length < 5) {
    return [];
  }

  // Create a histogram of x-positions to find column boundaries
  const xPositionHistogram: Record<number, number> = {};
  const xEndPositionHistogram: Record<number, number> = {};

  // Round x positions to nearest 10 pixels to create bins
  rows.forEach(row => {
    row.forEach(segment => {
      const roundedX = Math.round(segment.x / 10) * 10;
      const roundedEndX = Math.round((segment.x + segment.width) / 10) * 10;

      xPositionHistogram[roundedX] = (xPositionHistogram[roundedX] || 0) + 1;
      xEndPositionHistogram[roundedEndX] = (xEndPositionHistogram[roundedEndX] || 0) + 1;
    });
  });

  // Find peaks in the histogram (potential column starts)
  const peaks: number[] = [];
  const threshold = rows.length * 0.2; // At least 20% of rows should have segments at this x-position

  Object.entries(xPositionHistogram).forEach(([xPos, count]) => {
    if (count >= threshold) {
      peaks.push(parseInt(xPos));
    }
  });

  // Sort peaks by x-position
  peaks.sort((a, b) => a - b);

  // Filter peaks that are too close to each other (within 50 pixels)
  const filteredPeaks: number[] = [];
  let lastPeak = -100;

  peaks.forEach(peak => {
    if (peak - lastPeak >= 50) {
      filteredPeaks.push(peak);
      lastPeak = peak;
    }
  });

  // If we have at least 2 peaks, we might have columns
  return filteredPeaks.length >= 2 ? filteredPeaks : [];
};

/**
 * Reorders rows based on detected column structure
 * @param rows Original rows from top to bottom
 * @param columnBoundaries X-coordinates of column boundaries
 * @returns Reordered rows that follow reading order across columns
 */
const reorderMultiColumnRows = (
  rows: OCRTextSegment[][],
  columnBoundaries: number[]
): OCRTextSegment[][] => {
  // If we don't have enough column boundaries, return original rows
  if (columnBoundaries.length < 2) {
    return rows;
  }

  // Group rows by column
  const columnRows: OCRTextSegment[][][] = [];

  // Initialize array for each column
  for (let i = 0; i < columnBoundaries.length; i++) {
    columnRows.push([]);
  }

  // Assign each row to a column based on the x-position of its first segment
  rows.forEach(row => {
    if (row.length === 0) return;

    // Sort row segments by x-position
    row.sort((a, b) => a.x - b.x);

    // Find which column this row belongs to
    const firstSegmentX = row[0].x;
    let columnIndex = 0;

    for (let i = 0; i < columnBoundaries.length; i++) {
      if (firstSegmentX >= columnBoundaries[i]) {
        columnIndex = i;
      } else {
        break;
      }
    }

    // Add this row to the appropriate column
    columnRows[columnIndex].push(row);
  });

  // Flatten columns into a single array of rows in reading order
  const reorderedRows: OCRTextSegment[][] = [];

  columnRows.forEach(column => {
    column.forEach(row => {
      reorderedRows.push(row);
    });
  });

  return reorderedRows;
};

export const postProcessReconstructedText = (
  text: string,
  isQuestionPaper: boolean = false,
  isModelAnswer: boolean = false
): string => {
  // Determine document type
  const isStudentAnswer = !isQuestionPaper && !isModelAnswer;

  // Normalize line breaks and whitespace
  let processedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
    .replace(/\n\s+/g, '\n') // Remove spaces at the beginning of lines
    .replace(/\s+\n/g, '\n'); // Remove spaces at the end of lines

  // Apply OCR corrections from the ocrCorrections utility
  try {
    // Import the OCR correction functions
    const { applyOCRErrorPatternCorrections, applyDomainDictionaryCorrections } = require('./ocrCorrections');

    // Apply pattern-based corrections
    processedText = applyOCRErrorPatternCorrections(processedText);

    // Apply dictionary-based corrections
    processedText = applyDomainDictionaryCorrections(processedText);
  } catch (error) {
    console.warn('Error applying OCR corrections:', error);

    // Fallback to basic corrections if the import fails
    processedText = processedText
      // Fix common character confusions
      .replace(/[|]l/g, 'I') // Fix pipe character and lowercase L to uppercase I
      .replace(/\b[|]I\b/g, 'I') // Fix pipe character to uppercase I
      .replace(/\brn\b/g, 'm') // Fix 'rn' misread as 'm'
      .replace(/\bvv\b/g, 'w') // Fix 'vv' misread as 'w'
      .replace(/([a-z])l([a-z])/g, '$1i$2') // Fix 'l' misread as 'i' in words

      // Fix common word errors
      .replace(/\b[0O]ne\b/g, 'One')
      .replace(/\b[0O]f\b/g, 'of')
      .replace(/\b[1I]n\b/g, 'In')
      .replace(/\b[1I]s\b/g, 'is')
      .replace(/\b[1I]t\b/g, 'it')
      .replace(/\b[1I]f\b/g, 'if')
      .replace(/\bTne\b/g, 'The')
      .replace(/\btne\b/g, 'the')
      .replace(/\bana\b/g, 'and')
      .replace(/\bAna\b/g, 'And');
  }

  // Enhanced processing for question papers
  if (isQuestionPaper) {
    // Improve question numbering detection and formatting
    processedText = processedText
      // Fix question numbering with better formatting
      .replace(/(\d+)\s*\.\s*/g, '\n$1. ')
      .replace(/\b([Qq]uestion|Q)\s*(\d+)/g, '\nQuestion $2')
      .replace(/\b([Qq]uestion|Q)\.?\s*(\d+)/g, '\nQuestion $2')

      // Ensure consistent spacing after question numbers
      .replace(/(\d+)\.\s*(\w)/g, '$1. $2')

      // Fix sub-question numbering
      .replace(/\b([a-z])\s*\)\s*/g, '$1) ')
      .replace(/\b([a-z])\s*\.\s*/g, '$1. ')
      .replace(/\b([ivxIVX]+)\s*\)\s*/g, '$1) ') // Roman numerals
      .replace(/\b([ivxIVX]+)\s*\.\s*/g, '$1. ') // Roman numerals

      // Improve MCQ option formatting with enhanced detection
      .replace(/\b([A-D])\s*\)\s*/g, '\n$1) ') // Add newline before MCQ options with parenthesis
      .replace(/\b([A-D])\s*\.\s*/g, '\n$1. ') // Add newline before MCQ options with periods
      .replace(/\n([A-D])[\.|\)]\s*([a-z])/g, '\n$1. $2') // Ensure space after option

      // Detect and format MCQ option groups
      .replace(/(\n[A-D][\.|\)].*\n[A-D][\.|\)].*\n[A-D][\.|\)].*\n[A-D][\.|\)].*)/g,
               (match) => '\n' + match.trim()) // Group MCQ options together

      // Fix marks formatting with enhanced detection
      .replace(/(\d+)\s*marks/gi, '$1 marks')
      .replace(/(\d+)\s*mark/gi, '$1 mark')
      .replace(/\[\s*(\d+)\s*marks\s*\]/gi, '[$1 marks]')
      .replace(/\[\s*(\d+)\s*mark\s*\]/gi, '[$1 mark]')
      .replace(/\(\s*(\d+)\s*marks\s*\)/gi, '($1 marks)')
      .replace(/\(\s*(\d+)\s*mark\s*\)/gi, '($1 mark)')

      // Format total marks and section headings
      .replace(/\b[Tt]otal\s*[Mm]arks\s*:\s*(\d+)/g, '\nTotal Marks: $1')
      .replace(/\b[Ss]ection\s*[A-Za-z]\b/g, '\n\n$&')
      .replace(/\b[Pp]art\s*[A-Za-z]\b/g, '\n\n$&')

      // Format instructions and notes
      .replace(/\b[Ii]nstructions\s*:/g, '\n\nInstructions:')
      .replace(/\b[Nn]ote\s*:/g, '\n\nNote:')
      .replace(/\b[Nn]otes\s*:/g, '\n\nNotes:')

      // Fix common formatting issues in question papers
      .replace(/(\n\d+\..*?)(\n\d+\.)/g, '$1\n$2') // Add extra line between numbered questions
      .replace(/(\([A-D]\).*?)(\([A-D]\))/g, '$1\n$2'); // Add newline between options if missing
  }
  // Enhanced processing for model answers
  else if (isModelAnswer) {
    // Preserve exact formatting for model answers with improved handling
    processedText = processedText
      // Fix MCQ option formatting with better detection
      .replace(/\b([A-D])\s*\)\s*/g, '$1) ') // Normalize MCQ option formatting with parenthesis
      .replace(/\b([A-D])\s*\.\s*/g, '$1. ') // Normalize MCQ option formatting with periods
      .replace(/^([A-D])\s*[\.\)]\s*$/gm, '$1. ') // Fix standalone MCQ options

      // Preserve single-letter answers for MCQs with improved detection
      .replace(/^([A-Da-d])\s*$/, '$1')
      .replace(/^Answer\s*:\s*([A-Da-d])\s*$/i, 'Answer: $1')
      .replace(/^The\s+answer\s+is\s*:?\s*([A-Da-d])\s*$/i, 'Answer: $1')
      .replace(/^Option\s*:?\s*([A-Da-d])\s*$/i, 'Option: $1')

      // Fix common mathematical symbols and equations with enhanced detection
      .replace(/\bpi\b/g, 'π')
      .replace(/\+\-/g, '±')
      .replace(/\-\>/g, '→')
      .replace(/\<\-/g, '←')
      .replace(/([0-9])\s*\^\s*([0-9])/g, '$1^$2')
      .replace(/([0-9])\s*\*\s*([0-9])/g, '$1 × $2')
      .replace(/([0-9])\s*\/\s*([0-9])/g, '$1 ÷ $2')
      .replace(/sqrt\s*\(\s*([0-9]+)\s*\)/g, '√($1)')

      // Fix common formatting issues in model answers
      .replace(/(\d+)\s*\.\s*([A-Za-z])/g, '$1. $2') // Add space after numbered points
      .replace(/([a-z])\s*\.\s*([A-Z])/g, '$1. $2') // Add space after sentence endings
      .replace(/([a-z])\s*\,\s*([a-z])/g, '$1, $2') // Add space after commas

      // Fix step-by-step solution formatting
      .replace(/\b[Ss]tep\s*(\d+)\s*:/g, '\nStep $1:')
      .replace(/\b[Ss]tep\s*(\d+)\s*\./g, '\nStep $1.')
      .replace(/\b[Ss]olution\s*:/g, '\nSolution:')
      .replace(/\b[Aa]nswer\s*:/g, '\nAnswer:')

      // Fix formatting for explanations
      .replace(/\b[Ee]xplanation\s*:/g, '\nExplanation:')
      .replace(/\b[Jj]ustification\s*:/g, '\nJustification:')
      .replace(/\b[Rr]eason\s*:/g, '\nReason:')

      // Fix formatting for proofs
      .replace(/\b[Pp]roof\s*:/g, '\nProof:')
      .replace(/\b[Gg]iven\s*:/g, '\nGiven:')
      .replace(/\b[Tt]o\s*[Pp]rove\s*:/g, '\nTo Prove:')
      .replace(/\b[Cc]onstruction\s*:/g, '\nConstruction:')

      // Fix formatting for mathematical working
      .replace(/\b[Ww]orking\s*:/g, '\nWorking:')
      .replace(/\b[Cc]alculation\s*:/g, '\nCalculation:')
      .replace(/\b[Ff]ormula\s*:/g, '\nFormula:')

      // Preserve equation alignment
      .replace(/(\=\s*[^\n]+)(\n\s*\=)/g, '$1\n$2'); // Keep equations aligned
  }
  // Enhanced processing for student answers (handwritten text)
  else if (isStudentAnswer) {
    // First, detect if the text appears to be an MCQ answer with improved detection
    const isMCQAnswer = /^[A-Da-d]$/i.test(processedText.trim()) ||
                        /^(option|choice|ans|answer)\s*:?\s*[A-Da-d]$/i.test(processedText.trim()) ||
                        /^(the answer is|answer is|answer:|ans:)\s*[A-Da-d]$/i.test(processedText.trim()) ||
                        /^[A-Da-d]\s*(is correct|is the answer|option|choice)$/i.test(processedText.trim());

    if (isMCQAnswer) {
      // For MCQ answers, extract just the letter with improved extraction
      const mcqMatch = processedText.match(/[A-Da-d](?![a-z])/i);
      if (mcqMatch) {
        return mcqMatch[0].toUpperCase();
      }
    }

    // Improve handwritten text recognition with enhanced processing
    processedText = processedText
      // Fix common handwriting OCR errors with improved patterns
      .replace(/([0-9])\s+([0-9])/g, '$1$2') // Fix split numbers
      .replace(/([lI])\s+([lI])/g, 'H') // Fix misrecognized 'H' as 'I I' or 'l l'
      .replace(/([rn])\s+([rn])/g, 'm') // Fix misrecognized 'm' as 'r n' or 'n r'
      .replace(/([c])\s+([l])/g, 'd') // Fix misrecognized 'd' as 'c l'
      .replace(/([v])\s+([v])/g, 'w') // Fix misrecognized 'w' as 'v v'
      .replace(/([o0])\s+([o0])/g, '8') // Fix misrecognized '8' as 'o o' or '0 0'
      .replace(/([uv])\s+([n])/g, 'un') // Fix misrecognized 'un' as 'u n' or 'v n'
      .replace(/([t])\s+([h])/g, 'th') // Fix misrecognized 'th' as 't h'
      .replace(/([t])\s+([r])/g, 'tr') // Fix misrecognized 'tr' as 't r'
      .replace(/([f])\s+([r])/g, 'fr') // Fix misrecognized 'fr' as 'f r'
      .replace(/([s])\s+([h])/g, 'sh') // Fix misrecognized 'sh' as 's h'
      .replace(/([c])\s+([h])/g, 'ch') // Fix misrecognized 'ch' as 'c h'
      .replace(/([w])\s+([h])/g, 'wh') // Fix misrecognized 'wh' as 'w h'
      .replace(/([p])\s+([h])/g, 'ph') // Fix misrecognized 'ph' as 'p h'
      .replace(/([g])\s+([h])/g, 'gh') // Fix misrecognized 'gh' as 'g h'

      // Fix common character confusions in handwriting with improved context awareness
      .replace(/\b[lI](?=\s|$)/g, '1') // Replace standalone l or I with 1
      .replace(/\b[oO](?=\s|$)/g, '0') // Replace standalone o or O with 0
      .replace(/\b[S5](?=\s|$)/g, 'S') // Disambiguate S and 5
      .replace(/\b[Z2](?=\s|$)/g, 'Z') // Disambiguate Z and 2
      .replace(/\b[B8](?=\s|$)/g, 'B') // Disambiguate B and 8
      .replace(/\b[G6](?=\s|$)/g, 'G') // Disambiguate G and 6
      .replace(/\b[Q9](?=\s|$)/g, 'Q') // Disambiguate Q and 9

      // Fix common word confusions in handwriting
      .replace(/\bclid\b/g, 'and') // Fix 'and' misrecognized as 'clid'
      .replace(/\bthot\b/g, 'that') // Fix 'that' misrecognized as 'thot'
      .replace(/\bthc\b/g, 'the') // Fix 'the' misrecognized as 'thc'
      .replace(/\bwitn\b/g, 'with') // Fix 'with' misrecognized as 'witn'
      .replace(/\bfar\b/g, 'for') // Fix 'for' misrecognized as 'far'
      .replace(/\bfrorn\b/g, 'from') // Fix 'from' misrecognized as 'frorn'
      .replace(/\bthis\b/g, 'this') // Fix 'this' misrecognized as 'this'
      .replace(/\bwhcn\b/g, 'when') // Fix 'when' misrecognized as 'whcn'
      .replace(/\bwhcre\b/g, 'where') // Fix 'where' misrecognized as 'whcre'
      .replace(/\bwhot\b/g, 'what') // Fix 'what' misrecognized as 'whot'
      .replace(/\bwhv\b/g, 'why') // Fix 'why' misrecognized as 'whv'
      .replace(/\bhaw\b/g, 'how') // Fix 'how' misrecognized as 'haw'
      .replace(/\bwha\b/g, 'who') // Fix 'who' misrecognized as 'wha'
      .replace(/\bwhase\b/g, 'whose') // Fix 'whose' misrecognized as 'whase'
      .replace(/\bwhich\b/g, 'which') // Fix 'which' misrecognized as 'which'
      .replace(/\bthcre\b/g, 'there') // Fix 'there' misrecognized as 'thcre'
      .replace(/\bthcir\b/g, 'their') // Fix 'their' misrecognized as 'thcir'
      .replace(/\bthcy\b/g, 'they') // Fix 'they' misrecognized as 'thcy'
      .replace(/\bthcm\b/g, 'them') // Fix 'them' misrecognized as 'thcm'
      .replace(/\bthcn\b/g, 'then') // Fix 'then' misrecognized as 'thcn'
      .replace(/\bthcse\b/g, 'these') // Fix 'these' misrecognized as 'thcse'
      .replace(/\bthase\b/g, 'those') // Fix 'those' misrecognized as 'thase'

      // Fix spacing issues common in handwritten text with improved patterns
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
      .replace(/([.,;:!?])([a-zA-Z])/g, '$1 $2') // Add space after punctuation
      .replace(/([a-zA-Z])([.,;:!?])([a-zA-Z])/g, '$1$2 $3') // Add space after punctuation between words

      // Fix sentence structure with improved patterns
      .replace(/([a-z])\s*\.\s*([A-Z])/g, '$1. $2') // Fix sentence spacing
      .replace(/([a-z])\s*,\s*([a-z])/g, '$1, $2') // Fix comma spacing
      .replace(/([a-z])\s*;\s*([a-z])/g, '$1; $2') // Fix semicolon spacing
      .replace(/([a-z])\s*:\s*([a-z])/g, '$1: $2') // Fix colon spacing

      // Fix paragraph structure
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .replace(/([.!?])\s*\n/g, '$1\n\n') // Add paragraph break after sentence ending at line break

      // Preserve single-letter answers for MCQs with improved detection
      .replace(/^([A-Da-d])\s*$/, '$1')
      .replace(/^Answer\s*:?\s*([A-Da-d])\s*$/i, 'Answer: $1')
      .replace(/^Option\s*:?\s*([A-Da-d])\s*$/i, 'Option: $1')
      .replace(/^Choice\s*:?\s*([A-Da-d])\s*$/i, 'Choice: $1')

      // Fix common mathematical symbols in handwritten answers with improved detection
      .replace(/\bpi\b/g, 'π')
      .replace(/\+\-/g, '±')
      .replace(/\-\>/g, '→')
      .replace(/\<\-/g, '←')
      .replace(/sqrt\s*\(\s*([0-9]+)\s*\)/g, '√($1)')
      .replace(/\bsquare\s+root\s+of\s+([0-9]+)\b/gi, '√$1')
      .replace(/\bcube\s+root\s+of\s+([0-9]+)\b/gi, '∛$1')
      .replace(/\bdelta\b/gi, 'Δ')
      .replace(/\balpha\b/gi, 'α')
      .replace(/\bbeta\b/gi, 'β')
      .replace(/\bgamma\b/gi, 'γ')
      .replace(/\btheta\b/gi, 'θ')
      .replace(/\bomega\b/gi, 'ω')
      .replace(/\bsigma\b/gi, 'σ')
      .replace(/\blambda\b/gi, 'λ')
      .replace(/\bmu\b/gi, 'μ')
      .replace(/\binfinity\b/gi, '∞')
      .replace(/\bapprox\b/gi, '≈')
      .replace(/\bdegree(s)?\b/gi, '°')

      // Fix common equation formatting with improved patterns
      .replace(/([0-9])\s*\+\s*([0-9])/g, '$1 + $2') // Fix spacing in addition
      .replace(/([0-9])\s*\-\s*([0-9])/g, '$1 - $2') // Fix spacing in subtraction
      .replace(/([0-9])\s*\*\s*([0-9])/g, '$1 × $2') // Fix spacing in multiplication
      .replace(/([0-9])\s*\/\s*([0-9])/g, '$1 ÷ $2') // Fix spacing in division
      .replace(/([0-9])\s*\=\s*([0-9])/g, '$1 = $2') // Fix spacing in equations
      .replace(/([0-9])\s*\^\s*([0-9])/g, '$1^$2') // Fix spacing in exponents

      // Fix common units in handwritten answers
      .replace(/([0-9])\s*m\b/g, '$1 m') // Add space between number and meter
      .replace(/([0-9])\s*cm\b/g, '$1 cm') // Add space between number and centimeter
      .replace(/([0-9])\s*mm\b/g, '$1 mm') // Add space between number and millimeter
      .replace(/([0-9])\s*km\b/g, '$1 km') // Add space between number and kilometer
      .replace(/([0-9])\s*g\b/g, '$1 g') // Add space between number and gram
      .replace(/([0-9])\s*kg\b/g, '$1 kg') // Add space between number and kilogram
      .replace(/([0-9])\s*s\b/g, '$1 s') // Add space between number and second
      .replace(/([0-9])\s*min\b/g, '$1 min') // Add space between number and minute
      .replace(/([0-9])\s*h\b/g, '$1 h') // Add space between number and hour
      .replace(/([0-9])\s*l\b/g, '$1 L') // Add space between number and liter (and capitalize)
      .replace(/([0-9])\s*ml\b/g, '$1 mL') // Add space between number and milliliter (and capitalize L)

      // Fix common fractions in handwritten answers
      .replace(/([0-9])\s*\/\s*([0-9])/g, '$1/$2') // Remove spaces in fractions
      .replace(/\bone\s+half\b/gi, '1/2')
      .replace(/\bone\s+third\b/gi, '1/3')
      .replace(/\btwo\s+thirds\b/gi, '2/3')
      .replace(/\bone\s+fourth\b/gi, '1/4')
      .replace(/\bone\s+quarter\b/gi, '1/4')
      .replace(/\bthree\s+fourths\b/gi, '3/4')
      .replace(/\bthree\s+quarters\b/gi, '3/4');
  }

  // Final cleanup
  processedText = processedText
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines again
    .replace(/\s{2,}/g, ' ') // Normalize multiple spaces again
    .trim();

  return processedText;
};
