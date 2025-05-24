/**
 * OCR Corrections Utility
 *
 * This module provides specialized correction functions for OCR text,
 * including domain-specific dictionaries, common error patterns,
 * and confidence-based correction strategies.
 */

/**
 * Interface for OCR correction with confidence score
 */
export interface OCRCorrection {
  original: string;
  corrected: string;
  confidence: number; // 0-1 confidence score
}

/**
 * Domain-specific education terminology dictionary
 * Maps commonly misrecognized terms to their correct forms
 */
export const EDUCATION_TERMS: Record<string, string> = {
  // General education terms
  "examinatian": "examination",
  "examinotion": "examination",
  "exominotion": "examination",
  "questian": "question",
  "questians": "questions",
  "questiom": "question",
  "questioms": "questions",
  "onswer": "answer",
  "onswersheet": "answersheet",
  "answersneet": "answersheet",
  "morks": "marks",
  "totol": "total",
  "totol morks": "total marks",
  "educotion": "education",
  "leorning": "learning",
  "ossessment": "assessment",
  "evoluotion": "evaluation",
  "exom": "exam",
  "exomination": "examination",
  "groduotion": "graduation",
  "certificote": "certificate",
  "diplomo": "diploma",
  "ocademic": "academic",
  "ocademics": "academics",
  "syllobus": "syllabus",
  "curricuium": "curriculum",
  "curricuium": "curriculum",
  "ossignment": "assignment",
  "ossignments": "assignments",
  "homewark": "homework",
  "ciassroom": "classroom",
  "ciass": "class",
  "ciasses": "classes",
  "iecture": "lecture",
  "iecturer": "lecturer",
  "iearning": "learning",
  "knowiedge": "knowledge",
  "understending": "understanding",
  "comprehensian": "comprehension",
  "anaiysis": "analysis",
  "evaiuation": "evaluation",
  "appiication": "application",
  "synttiesis": "synthesis",
  "probiemsoiving": "problemsolving",
  "criticai": "critical",
  "criticai thinking": "critical thinking",
  "refiection": "reflection",
  "refiective": "reflective",
  "grode": "grade",
  "grodes": "grades",
  "groding": "grading",
  "evoluate": "evaluate",
  "evoluated": "evaluated",
  "evoluating": "evaluating",
  "ossess": "assess",
  "ossessed": "assessed",
  "ossessing": "assessing",
  "feedbock": "feedback",
  "instructian": "instruction",
  "instructians": "instructions",
  "instructar": "instructor",
  "instructars": "instructors",
  "teoch": "teach",
  "teocher": "teacher",
  "teochers": "teachers",
  "teoching": "teaching",
  "studant": "student",
  "studants": "students",
  "educatar": "educator",
  "educatars": "educators",
  "schaal": "school",
  "schaals": "schools",
  "callege": "college",
  "calleges": "colleges",
  "university": "university",
  "universities": "universities",
  "caurse": "course",
  "caurses": "courses",
  "curriculum": "curriculum",
  "curricula": "curricula",
  "textbaak": "textbook",
  "textbaaks": "textbooks",
  "workbaak": "workbook",
  "workbaaks": "workbooks",
  "handaut": "handout",
  "handauts": "handouts",
  "nate": "note",
  "nates": "notes",
  "natetaking": "notetaking",
  "revisian": "revision",
  "revise": "revise",
  "revised": "revised",
  "revising": "revising",
  "preparatian": "preparation",
  "prepare": "prepare",
  "prepared": "prepared",
  "preparing": "preparing",
  "examinee": "examinee",
  "examinees": "examinees",
  "invigilotor": "invigilator",
  "invigilotors": "invigilators",
  "proctor": "proctor",
  "proctors": "proctors",
  "proctoring": "proctoring",
  "supervisian": "supervision",
  "supervise": "supervise",
  "supervised": "supervised",
  "supervising": "supervising",
  "supervisar": "supervisor",
  "supervisars": "supervisors",

  // Math terms
  "equotion": "equation",
  "equotions": "equations",
  "olgebra": "algebra",
  "olgebraic": "algebraic",
  "colculus": "calculus",
  "differentiotion": "differentiation",
  "integrotion": "integration",
  "mothematics": "mathematics",
  "mothematical": "mathematical",
  "probobility": "probability",
  "stotistics": "statistics",
  "stotistical": "statistical",
  "geometiy": "geometry",
  "geometrical": "geometrical",
  "trigonometiy": "trigonometry",
  "trigonometric": "trigonometric",
  "thearem": "theorem",
  "theorems": "theorems",
  "formulo": "formula",
  "formuloe": "formulae",
  "formulas": "formulas",
  "function": "function",
  "functions": "functions",
  "voriable": "variable",
  "voriables": "variables",
  "constont": "constant",
  "constonts": "constants",
  "polynomiol": "polynomial",
  "polynomiols": "polynomials",
  "exponentiol": "exponential",
  "logorithm": "logarithm",
  "logorithmic": "logarithmic",
  "derivotive": "derivative",
  "derivotives": "derivatives",
  "integrol": "integral",
  "integrols": "integrals",
  "motrix": "matrix",
  "motrices": "matrices",
  "determinont": "determinant",
  "determinonts": "determinants",
  "vector": "vector",
  "vectors": "vectors",
  "scoiar": "scalar",
  "scoiars": "scalars",
  "froctian": "fraction",
  "froctians": "fractions",
  "froctional": "fractional",
  "decimol": "decimal",
  "decimols": "decimals",
  "percentoge": "percentage",
  "percentoges": "percentages",
  "rotio": "ratio",
  "rotios": "ratios",
  "proportian": "proportion",
  "proportians": "proportions",
  "proportional": "proportional",
  "sequence": "sequence",
  "sequences": "sequences",
  "series": "series",
  "convergent": "convergent",
  "divergent": "divergent",
  "limit": "limit",
  "limits": "limits",
  "continuity": "continuity",
  "continuous": "continuous",
  "differentioble": "differentiable",
  "integroble": "integrable",
  "coordinote": "coordinate",
  "coordinotes": "coordinates",
  "plone": "plane",
  "spoce": "space",
  "lineor": "linear",
  "non-lineor": "non-linear",
  "quodrotic": "quadratic",
  "cubic": "cubic",
  "polynomiol": "polynomial",
  "polynomiols": "polynomials",
  "olgorithm": "algorithm",
  "olgorithms": "algorithms",
  "olgorithmic": "algorithmic",

  // Science terms
  "bioiogy": "biology",
  "bioiogical": "biological",
  "chemistiy": "chemistry",
  "chemicol": "chemical",
  "physics": "physics",
  "physicol": "physical",
  "scientific": "scientific",
  "experiment": "experiment",
  "experimentol": "experimental",
  "loboratory": "laboratory",
  "hypothesis": "hypothesis",
  "theary": "theory",
  "thearies": "theories",
  "observotion": "observation",
  "observotions": "observations",
  "phenomenan": "phenomenon",
  "phenomeno": "phenomena",
  "reseorch": "research",
  "anolysis": "analysis",
  "onolyses": "analyses",
  "doto": "data",
  "conciusion": "conclusion",
  "conciusions": "conclusions",
  "eiement": "element",
  "eiements": "elements",
  "compound": "compound",
  "compounds": "compounds",
  "reoction": "reaction",
  "reoctive": "reactive",
  "reoctivity": "reactivity",
  "molecuie": "molecule",
  "molecuies": "molecules",
  "molecuiar": "molecular",
  "otom": "atom",
  "otoms": "atoms",
  "otomic": "atomic",
  "nucleor": "nuclear",
  "nuclei": "nuclei",
  "nucleus": "nucleus",
  "eiectron": "electron",
  "eiectrons": "electrons",
  "proton": "proton",
  "protons": "protons",
  "neutron": "neutron",
  "neutrons": "neutrons",
  "periodic toble": "periodic table",
  "metol": "metal",
  "metols": "metals",
  "metollic": "metallic",
  "non-metol": "non-metal",
  "non-metols": "non-metals",
  "ocid": "acid",
  "ocids": "acids",
  "ocidic": "acidic",
  "bose": "base",
  "boses": "bases",
  "bosic": "basic",
  "solt": "salt",
  "solts": "salts",
  "solution": "solution",
  "solutions": "solutions",
  "solvent": "solvent",
  "solvents": "solvents",
  "solute": "solute",
  "solutes": "solutes",
  "concentrotion": "concentration",
  "concentroted": "concentrated",
  "dilute": "dilute",
  "diluted": "diluted",
  "dilution": "dilution",
  "titrotion": "titration",
  "titrotions": "titrations",
  "indicotor": "indicator",
  "indicotors": "indicators",
  "equilibrium": "equilibrium",
  "equilibria": "equilibria",
  "cotolyst": "catalyst",
  "cotolysts": "catalysts",
  "cotolytic": "catalytic",
  "cotolysis": "catalysis",

  // MCQ-specific terms
  "muitiple choice": "multiple choice",
  "muitiple-choice": "multiple-choice",
  "optian": "option",
  "optians": "options",
  "chaice": "choice",
  "chaices": "choices",
  "seiect": "select",
  "seiection": "selection",
  "correct optian": "correct option",
  "correct onswer": "correct answer",
  "mcq": "MCQ",
  "mcqs": "MCQs",
  "objective": "objective",
  "objectives": "objectives",
  "subjective": "subjective",
  "true/folse": "true/false",
  "true-folse": "true-false",
  "fill-in-the-blonk": "fill-in-the-blank",
  "fill in the blonk": "fill in the blank",
  "motching": "matching",
  "motch": "match",
  "motched": "matched",
  "motching": "matching",
  "short onswer": "short answer",
  "long onswer": "long answer",
  "essoy": "essay",
  "essoys": "essays",
  "descriptive": "descriptive",
  "onolytical": "analytical",
  "procticol": "practical",
  "procticols": "practicals",
  "loboratory": "laboratory",
  "loboratories": "laboratories",
  "lob": "lab",
  "lobs": "labs",
  "vivo": "viva",
  "vivos": "vivas",
  "orol": "oral",
  "orols": "orals",
  "written": "written",
  "online": "online",
  "offline": "offline",
  "open-book": "open-book",
  "closed-book": "closed-book",
  "toke-home": "take-home",
  "time-bound": "time-bound",
  "time-limited": "time-limited",
  "time limit": "time limit",
  "durotion": "duration",
  "morks ollotted": "marks allotted",
  "morks ollocation": "marks allocation",
  "possing morks": "passing marks",
  "possing grode": "passing grade",
  "foil": "fail",
  "foiled": "failed",
  "foiling": "failing",
  "poss": "pass",
  "possed": "passed",
  "possing": "passing",

  // Common number confusions
  "0ne": "one",
  "tw0": "two",
  "thr0e": "three",
  "f0ur": "four",
  "f1ve": "five",
  "s1x": "six",
  "s0ven": "seven",
  "e1ght": "eight",
  "n1ne": "nine",
  "z0ro": "zero",
  "0": "0",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "l0": "10",
  "ll": "11",
  "l2": "12",
  "l3": "13",
  "l4": "14",
  "l5": "15",
  "l6": "16",
  "l7": "17",
  "l8": "18",
  "l9": "19",
  "2O": "20",
  "3O": "30",
  "4O": "40",
  "5O": "50",
  "6O": "60",
  "7O": "70",
  "8O": "80",
  "9O": "90",
  "1OO": "100"
};

/**
 * Common OCR error patterns to fix
 * These are regular expression patterns with replacements
 */
export const OCR_ERROR_PATTERNS: Array<[RegExp, string]> = [
  // Fix 0/o confusion in numbers
  [/([0-9])o([0-9])/g, '$10$2'],  // Replace 'o' with '0' between numbers (e.g., 1o2 -> 102)
  [/([0-9])O([0-9])/g, '$10$2'],  // Replace 'O' with '0' between numbers (e.g., 1O2 -> 102)
  [/\b([0-9]+)o\b/g, '$10'],      // Replace trailing 'o' with '0' in numbers (e.g., 10o -> 100)
  [/\bo([0-9]+)\b/g, '0$1'],      // Replace leading 'o' with '0' in numbers (e.g., o10 -> 010)

  // Fix o/0 confusion in words
  [/\b0([a-z]{2,})/g, 'o$1'],     // Replace leading '0' with 'o' in words (e.g., 0ption -> option)
  [/\b([a-z]{2,})0\b/g, '$1o'],   // Replace trailing '0' with 'o' in words (e.g., zer0 -> zero)
  [/\b([a-z]+)0([a-z]+)\b/g, '$1o$2'], // Replace middle '0' with 'o' in words (e.g., c0mputer -> computer)

  // Fix l/1/I confusion
  [/\bl([0-9])/g, '1$1'],         // Replace leading 'l' with '1' in numbers (e.g., l0 -> 10)
  [/([0-9])l\b/g, '$11'],         // Replace trailing 'l' with '1' in numbers (e.g., 10l -> 101)
  [/\b([0-9]+)l([0-9]+)\b/g, '$11$2'], // Replace middle 'l' with '1' in numbers (e.g., 10l0 -> 1010)
  [/\b1([a-z]{2,})/g, 'I$1'],     // Replace leading '1' with 'I' in words (e.g., 1nput -> Input)
  [/\b([A-Z])l([a-z])/g, '$1i$2'], // Replace 'l' with 'i' in words (e.g., Clty -> City)

  // Fix common OCR character confusions
  [/\brn\b/g, 'm'],               // Fix 'rn' misread as 'm'
  [/\bm\b/g, 'rn'],               // Fix 'm' misread as 'rn'
  [/\bvv\b/g, 'w'],               // Fix 'vv' misread as 'w'
  [/\bCl\b/g, 'CI'],              // Fix 'Cl' misread as 'CI'
  [/\bIl\b/g, 'II'],              // Fix 'Il' misread as 'II'
  [/\b([A-Z])1\b/g, '$1I'],       // Fix '1' misread as 'I' after capital letter

  // Fix split words at capital letters
  [/([a-z])([A-Z])/g, '$1 $2'],   // Add space between lowercase and uppercase (e.g., helloWorld -> hello World)

  // Fix periods in abbreviations
  [/([A-Z])\.([A-Z])\./g, '$1.$2.'], // Preserve periods in abbreviations (e.g., U.S.A)
  [/([A-Z])\.([A-Z])/g, '$1.$2'],    // Add period between uppercase letters (e.g., U.SA -> U.S.A)

  // Fix common word splits
  [/(\w+)\s+(\w{1,2})\b/g, '$1$2'],  // Join short word fragments (e.g., "compu ter" -> "computer")
  [/(\w{2,})\s+(\w{2,})\s+(\w{1,2})\b/g, '$1 $2$3'], // Join trailing fragments (e.g., "com pu ter" -> "com puter")

  // Fix common mathematical symbols
  [/\bpi\b/g, 'π'],
  [/\+\-/g, '±'],
  [/\-\>/g, '→'],
  [/\<\-/g, '←'],
  [/([0-9])\s*\^\s*([0-9])/g, '$1^$2'],
  [/([0-9])\s*x\s*([0-9])/g, '$1×$2'], // Convert 'x' to multiplication symbol

  // Fix spacing in equations
  [/([0-9])\s*\+\s*([0-9])/g, '$1 + $2'], // Fix spacing in addition
  [/([0-9])\s*\-\s*([0-9])/g, '$1 - $2'], // Fix spacing in subtraction
  [/([0-9])\s*\*\s*([0-9])/g, '$1 × $2'], // Fix spacing in multiplication
  [/([0-9])\s*\/\s*([0-9])/g, '$1 ÷ $2'], // Fix spacing in division
  [/([0-9])\s*\=\s*([0-9])/g, '$1 = $2'], // Fix spacing in equations

  // Fix common punctuation issues
  [/\,\./g, ','],                 // Fix comma followed by period
  [/\.\,/g, '.'],                 // Fix period followed by comma
  [/\s+\./g, '.'],                // Fix space before period
  [/\s+\,/g, ','],                // Fix space before comma
  [/\s+\:/g, ':'],                // Fix space before colon
  [/\s+\;/g, ';'],                // Fix space before semicolon
  [/\s+\?/g, '?'],                // Fix space before question mark
  [/\s+\!/g, '!'],                // Fix space before exclamation mark

  // Enhanced MCQ-specific corrections
  [/\b([A-D])\)\s*([a-z])/g, '$1) $2'], // Fix spacing after MCQ options
  [/\b([0-9]+)\.\s*([A-D])\)/g, '$1. $2)'], // Fix spacing in numbered MCQ options
  [/\b([A-D])[\.\)]\s*([a-z])/g, '$1. $2'], // Standardize MCQ option format

  // Enhanced question formatting
  [/\bQ\.\s*([0-9]+)/g, 'Q. $1'], // Fix spacing in question numbering
  [/\bQuestion\s+([0-9]+)/g, 'Question $1'], // Fix spacing in question text
  [/\b([0-9]+)\.\s*\(/g, '$1. ('], // Fix spacing in numbered lists with parentheses

  // Enhanced formatting for marks/points
  [/\(([0-9]+)\s*marks?\)/gi, '($1 marks)'], // Standardize marks in parentheses
  [/\[([0-9]+)\s*marks?\]/gi, '[$1 marks]'], // Standardize marks in brackets
  [/\(([0-9]+)\s*points?\)/gi, '($1 points)'], // Standardize points in parentheses
  [/\[([0-9]+)\s*points?\]/gi, '[$1 points]'], // Standardize points in brackets

  // Enhanced whitespace handling
  [/\n{3,}/g, '\n\n'], // Replace multiple newlines with double newline
  [/\s{2,}/g, ' '], // Replace multiple spaces with single space

  // Education-specific corrections
  [/\btotal\s+marks\s*:\s*([0-9]+)/gi, 'Total Marks: $1'], // Standardize total marks format
  [/\btime\s+allowed\s*:\s*([0-9]+)/gi, 'Time Allowed: $1'], // Standardize time allowed format
  [/\btime\s+limit\s*:\s*([0-9]+)/gi, 'Time Limit: $1'], // Standardize time limit format
  [/\bmax(imum)?\s+marks\s*:\s*([0-9]+)/gi, 'Maximum Marks: $2'], // Standardize maximum marks format
  [/\bpass\s+marks\s*:\s*([0-9]+)/gi, 'Pass Marks: $1'], // Standardize pass marks format

  // Fix common MCQ option formatting
  [/\b([A-D])\)\s*/g, '$1) '],    // Normalize MCQ option formatting with parenthesis
  [/\b([A-D])\.\s*/g, '$1. '],    // Normalize MCQ option formatting with periods
  [/\b([A-D])\s*\-\s*/g, '$1) '], // Convert dash to parenthesis in MCQ options
];

/**
 * Applies domain-specific dictionary corrections to OCR text
 * @param text The OCR text to correct
 * @returns The corrected text
 */
export function applyDomainDictionaryCorrections(text: string): string {
  if (!text) return text;

  let correctedText = text;

  // Split text into words
  const words = correctedText.split(/\s+/);

  // Check each word against the dictionary
  const correctedWords = words.map(word => {
    // Skip very short words or words with special characters
    if (word.length <= 2 || /[^a-zA-Z0-9]/.test(word)) {
      return word;
    }

    // Convert to lowercase for dictionary lookup
    const lowerWord = word.toLowerCase();

    // Check if this word is in our domain dictionary
    if (EDUCATION_TERMS[lowerWord]) {
      // Preserve original capitalization
      if (word[0] === word[0].toUpperCase()) {
        const corrected = EDUCATION_TERMS[lowerWord];
        return corrected.charAt(0).toUpperCase() + corrected.slice(1);
      }
      return EDUCATION_TERMS[lowerWord];
    }

    return word;
  });

  // Rejoin the corrected words
  correctedText = correctedWords.join(' ');

  return correctedText;
}

/**
 * Applies common OCR error pattern corrections
 * @param text The OCR text to correct
 * @returns The corrected text
 */
export function applyOCRErrorPatternCorrections(text: string): string {
  if (!text) return text;

  let correctedText = text;

  // Apply each pattern correction
  OCR_ERROR_PATTERNS.forEach(([pattern, replacement]) => {
    correctedText = correctedText.replace(pattern, replacement);
  });

  return correctedText;
}

/**
 * Applies confidence-based corrections to OCR text
 * @param text The OCR text to correct
 * @param confidenceThreshold The confidence threshold for applying corrections (0-1)
 * @returns The corrected text and an array of applied corrections
 */
export function applyConfidenceBasedCorrections(
  text: string,
  confidenceThreshold: number = 0.7
): { text: string; corrections: OCRCorrection[] } {
  if (!text) return { text, corrections: [] };

  let correctedText = text;
  const corrections: OCRCorrection[] = [];

  // Split text into words
  const words = correctedText.split(/\s+/);

  // Check each word for potential corrections
  const correctedWords = words.map(word => {
    // Skip very short words or words with special characters
    if (word.length <= 2 || /[^a-zA-Z0-9]/.test(word)) {
      return word;
    }

    // Convert to lowercase for dictionary lookup
    const lowerWord = word.toLowerCase();

    // Check for high-confidence corrections in our domain dictionary
    if (EDUCATION_TERMS[lowerWord]) {
      const corrected = EDUCATION_TERMS[lowerWord];

      // Calculate confidence based on string similarity
      const confidence = calculateStringSimilarity(lowerWord, corrected);

      // Only apply correction if confidence is above threshold
      if (confidence >= confidenceThreshold) {
        // Preserve original capitalization
        let finalCorrected = corrected;
        if (word[0] === word[0].toUpperCase()) {
          finalCorrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
        }

        // Record the correction
        corrections.push({
          original: word,
          corrected: finalCorrected,
          confidence
        });

        return finalCorrected;
      }
    }

    return word;
  });

  // Rejoin the corrected words
  correctedText = correctedWords.join(' ');

  return { text: correctedText, corrections };
}

/**
 * Calculates string similarity using Levenshtein distance
 * @param a First string
 * @param b Second string
 * @returns Similarity score between 0 and 1
 */
export function calculateStringSimilarity(a: string, b: string): number {
  const distance = calculateLevenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  // Convert distance to similarity (0-1 range)
  return maxLength === 0 ? 1 : 1 - (distance / maxLength);
}

/**
 * Calculates the Levenshtein distance between two strings
 * @param a First string
 * @param b Second string
 * @returns The edit distance between the strings
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
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
