/**
 * Template service for fallback model answers
 * This is used when both the server and direct API calls fail
 */

// Common MCQ patterns
const MCQ_PATTERNS = [
  /\b([1-9][0-9]*)\s*\.\s*(?:(?:A|B|C|D|a|b|c|d)\s*\)|(?:\([A-Da-d]\)))\s*(.*?)(?=\b(?:[1-9][0-9]*)\s*\.\s*(?:(?:A|B|C|D|a|b|c|d)\s*\)|(?:\([A-Da-d]\)))|$)/g,
  /\b([1-9][0-9]*)\s*\.\s*(.*?)\s*(?:A|a)\s*\)\s*(.*?)\s*(?:B|b)\s*\)\s*(.*?)\s*(?:C|c)\s*\)\s*(.*?)\s*(?:D|d)\s*\)\s*(.*?)(?=\b(?:[1-9][0-9]*)\s*\.|$)/g,
  /\b([1-9][0-9]*)\s*\.\s*(.*?)\s*(?:A|a)\.\s*(.*?)\s*(?:B|b)\.\s*(.*?)\s*(?:C|c)\.\s*(.*?)\s*(?:D|d)\.\s*(.*?)(?=\b(?:[1-9][0-9]*)\s*\.|$)/g
];

// Default MCQ answers
const DEFAULT_MCQ_ANSWERS = ['A', 'B', 'C', 'D', 'A'];

// Map of question keywords to template answers (keyword lists only)
const templateAnswers: Record<string, string> = {
  // Science templates
  "photosynthesis": `chlorophyll, carbon dioxide, water, sunlight, glucose, oxygen, ATP, NADPH, thylakoid, Calvin cycle, light-dependent reactions, light-independent reactions, plants, algae, bacteria, energy conversion, photosystem I, photosystem II, stomata, autotroph, chloroplast, pigment, stroma, rubisco, photolysis`,

  "cell": `cell membrane, nucleus, cytoplasm, mitochondria, endoplasmic reticulum, Golgi apparatus, lysosomes, ribosomes, prokaryotic, eukaryotic, DNA, RNA, organelles, cell wall, chloroplast, vacuole, cytoskeleton, flagella, cilia, homeostasis, cell division, mitosis, meiosis, cell cycle, apoptosis, cellular respiration, ATP, protein synthesis, cell theory, bacteria, archaea, protists, fungi, plants, animals`,

  // Math templates
  "derivative": `rate of change, limit, differentiation, power rule, product rule, quotient rule, chain rule, implicit differentiation, slope, tangent line, velocity, acceleration, maxima, minima, critical points, inflection points, concavity, optimization, linear approximation, differential, partial derivative, gradient, directional derivative, second derivative, higher-order derivatives, continuity, differentiability, l'Hôpital's rule, related rates, marginal analysis`,

  "integral": `antiderivative, indefinite integral, definite integral, area under curve, Riemann sum, fundamental theorem of calculus, power rule, substitution method, integration by parts, partial fractions, trigonometric substitution, improper integrals, numerical integration, trapezoidal rule, Simpson's rule, volume of revolution, arc length, surface area, work, center of mass, moment of inertia, probability density function, differential equations, line integral, double integral, triple integral, Green's theorem, Stokes' theorem, divergence theorem`,

  // Computer Science templates
  "object-oriented programming": `class, object, encapsulation, inheritance, polymorphism, abstraction, method, attribute, instance, constructor, destructor, public, private, protected, interface, abstract class, virtual function, override, overload, static, dynamic, this, super, extends, implements, composition, aggregation, association, member variable, accessor, mutator, getter, setter, subclass, superclass, base class, derived class, multiple inheritance, method overriding, method overloading, instance variable, class variable`,

  "algorithm": `pseudocode, flowchart, complexity, time complexity, space complexity, Big O notation, recursion, iteration, sorting, searching, graph, tree, dynamic programming, greedy algorithm, divide and conquer, backtracking, heuristic, optimization, data structure, array, linked list, stack, queue, hash table, binary search, linear search, bubble sort, insertion sort, selection sort, merge sort, quick sort, heap sort, breadth-first search, depth-first search, Dijkstra's algorithm, minimum spanning tree, topological sort, NP-complete, approximation algorithm`,

  // General templates
  "climate change": `global warming, greenhouse gases, carbon dioxide, methane, nitrous oxide, fossil fuels, emissions, deforestation, sea level rise, extreme weather, melting ice caps, glaciers, ocean acidification, carbon footprint, renewable energy, sustainability, Paris Agreement, IPCC, climate models, adaptation, mitigation, carbon capture, carbon sequestration, climate refugees, biodiversity loss, drought, floods, hurricanes, wildfires, heat waves, coral bleaching, permafrost, tipping points, climate justice, carbon tax, cap and trade, climate policy, Kyoto Protocol`,

  "artificial intelligence": `machine learning, deep learning, neural networks, natural language processing, computer vision, robotics, expert systems, supervised learning, unsupervised learning, reinforcement learning, algorithms, data mining, pattern recognition, decision trees, random forests, support vector machines, clustering, classification, regression, feature extraction, training data, testing data, overfitting, underfitting, bias, variance, gradient descent, backpropagation, activation functions, convolutional neural networks, recurrent neural networks, transformers, generative adversarial networks, transfer learning, AI ethics, explainable AI, autonomous systems, intelligent agents`
};

/**
 * Check if a question is a multiple-choice question
 * @param question The question text
 * @returns True if the question is a multiple-choice question
 */
export function isTemplateMultipleChoiceQuestion(question: string): boolean {
  // Check if the question matches any of the MCQ patterns
  for (const pattern of MCQ_PATTERNS) {
    if (pattern.test(question)) {
      return true;
    }
  }

  // Check for common MCQ indicators
  const mcqIndicators = [
    /\b[A-Da-d]\s*\)/,
    /\b[A-Da-d]\s*\./,
    /\([A-Da-d]\)/,
    /choose\s+(?:the\s+)?(?:correct|right|appropriate)\s+(?:option|answer|alternative)/i,
    /select\s+(?:the\s+)?(?:correct|right|appropriate)\s+(?:option|answer|alternative)/i,
    /which\s+(?:of\s+the\s+following|one|option)\s+is\s+(?:correct|right|true)/i
  ];

  return mcqIndicators.some(pattern => pattern.test(question));
}

/**
 * Get a default MCQ answer based on question number
 * @param question The question text
 * @returns A default MCQ answer (A, B, C, or D)
 */
function getDefaultMcqAnswer(question: string): string {
  // Extract question number if possible
  const match = question.match(/\b([1-9][0-9]*)\s*\./);
  if (match && match[1]) {
    const questionNumber = parseInt(match[1]);
    // Use modulo to cycle through default MCQ answers
    return DEFAULT_MCQ_ANSWERS[(questionNumber - 1) % DEFAULT_MCQ_ANSWERS.length];
  }
  return 'B'; // Default if no question number found
}

/**
 * Generates a template answer based on keywords in the question
 * @param questionText The question to find a template for
 * @returns A template answer if found, or null if no matching template
 */
export const getTemplateAnswer = (questionText: string): string | null => {
  // Check if this is an MCQ question
  if (isTemplateMultipleChoiceQuestion(questionText)) {
    console.log('Found MCQ question, generating default answer');
    return getDefaultMcqAnswer(questionText);
  }

  // Convert question to lowercase for case-insensitive matching
  const lowerQuestion = questionText.toLowerCase();

  // Check each keyword to see if it appears in the question
  for (const [keyword, template] of Object.entries(templateAnswers)) {
    if (lowerQuestion.includes(keyword.toLowerCase())) {
      console.log(`Found template match for keyword: ${keyword}`);
      return template;
    }
  }

  // No matching template found
  return null;
};
