import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/accessible-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ClipboardList, Clock, ArrowRight, Loader2 } from "lucide-react";
// No need for API_ENDPOINTS import as we're using sample data
import { useUser } from '@/contexts/UserContext';
import QuestionNavigationBox from './QuestionNavigationBox';
import DifficultySelector, { Difficulty } from './DifficultySelector';

// Define MCQ question type
interface MCQQuestion {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
  }[];
  difficulty: Difficulty;
  correctAnswer?: string; // Only available after submission
}

interface OnlineMCQTestProps {
  subject: string;
  onComplete: (result: MCQTestResult) => void;
  onBack: () => void;
}

export interface MCQTestResult {
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  questions: MCQQuestion[];
  userAnswers: Record<string, string>;
}

const OnlineMCQTest: React.FC<OnlineMCQTestProps> = ({ subject, onComplete }) => {
  // Initialize user context for future authentication features
  useUser();
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [isLoading, setIsLoading] = useState(false); // Start with false to show the difficulty selector
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [difficultyCounts, setDifficultyCounts] = useState<{easy: number; medium: number; hard: number}>({
    easy: 3,
    medium: 4,
    hard: 3
  });
  const [questionsGenerated, setQuestionsGenerated] = useState<boolean>(false);
  const TOTAL_QUESTIONS = 10; // Total number of questions to generate

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle answer selection
  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  // Navigate to next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  // Navigate to previous question
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Navigate to specific question
  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  // Submit test - using useCallback to prevent recreation on every render
  const handleSubmit = useCallback(async () => {
    if (Object.keys(userAnswers).length < questions.length) {
      const isConfirmed = window.confirm('You have unanswered questions. Are you sure you want to submit?');
      if (!isConfirmed) return;
    }

    setIsSubmitting(true);
    toast.loading('Evaluating your answers...', { id: 'evaluation-toast' });

    try {
      // In a real app, this would send answers to a backend API for evaluation
      // For now, we'll simulate the evaluation process

      // Generate correct answers (in a real app, these would come from the backend)
      const questionsWithAnswers = questions.map(q => ({
        ...q,
        correctAnswer: q.options[Math.floor(Math.random() * q.options.length)].id
      }));

      // Calculate score
      let correctCount = 0;
      questionsWithAnswers.forEach(q => {
        if (userAnswers[q.id] === q.correctAnswer) {
          correctCount++;
        }
      });

      const score = (correctCount / questions.length) * 100;

      // Prepare result
      const result: MCQTestResult = {
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        score,
        questions: questionsWithAnswers,
        userAnswers
      };

      console.log('Generated test result:', result);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.dismiss('evaluation-toast');
      toast.success('Test completed!');

      // Pass result to parent component
      if (onComplete && typeof onComplete === 'function') {
        onComplete(result);
      } else {
        console.error('onComplete is not a function or is undefined');
        toast.error('Failed to submit test results', {
          description: 'There was an error processing your results'
        });
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      toast.dismiss('evaluation-toast');
      toast.error('Failed to submit test', {
        description: 'Please try again'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [questions, userAnswers, onComplete]);

  // Fetch questions when the user clicks the "Generate Test" button
  // We use useCallback with a stable reference to avoid recreating this function
  // when difficultyCounts changes
  const generateTest = useCallback(async () => {
    // Capture the current difficulty counts at the time of function call
    // This ensures we use the latest values without adding them to the dependency array
    const currentDifficultyCounts = difficultyCounts;

    if (questionsGenerated) {
      return; // Don't regenerate questions if they've already been generated
    }

    setIsLoading(true);

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.error('Question generation timeout');
      setIsLoading(false);
      toast.error('Question generation took too long', {
        description: 'Please try again'
      });
    }, 10000); // 10 seconds timeout

    try {
      // In a real app, this would fetch from a backend API
      // For now, we'll generate questions for each difficulty level
      const easyQuestions = generateQuestionsForDifficulty(subject, currentDifficultyCounts.easy, 'easy');
      const mediumQuestions = generateQuestionsForDifficulty(subject, currentDifficultyCounts.medium, 'medium');
      const hardQuestions = generateQuestionsForDifficulty(subject, currentDifficultyCounts.hard, 'hard');

      // Combine all questions from different difficulty levels
      const combinedQuestions = [...easyQuestions, ...mediumQuestions, ...hardQuestions];

      // Verify we have exactly TOTAL_QUESTIONS questions
      if (combinedQuestions.length !== TOTAL_QUESTIONS) {
        console.error(`Expected ${TOTAL_QUESTIONS} questions but got ${combinedQuestions.length}`);
        toast.error('Error generating questions', {
          description: `Please try a different difficulty distribution`
        });
        setIsLoading(false);
        return;
      }

      // Shuffle the combined questions to mix difficulties
      const shuffledQuestions = [...combinedQuestions].sort(() => 0.5 - Math.random());

      // Ensure we only have exactly TOTAL_QUESTIONS questions
      const finalQuestions = shuffledQuestions.slice(0, TOTAL_QUESTIONS);
      setQuestions(finalQuestions);

      // Reset user state when questions change
      setCurrentQuestionIndex(0);
      setUserAnswers({});

      // Reset timer when new questions are loaded
      setTimeRemaining(600); // 10 minutes

      // Mark questions as generated to prevent regeneration
      setQuestionsGenerated(true);

      // Show notification about the mixed difficulty
      const easyText = currentDifficultyCounts.easy > 0 ? `${currentDifficultyCounts.easy} easy` : '';
      const mediumText = currentDifficultyCounts.medium > 0 ? `${currentDifficultyCounts.medium} medium` : '';
      const hardText = currentDifficultyCounts.hard > 0 ? `${currentDifficultyCounts.hard} hard` : '';

      // Combine the non-empty difficulty texts with commas
      const difficultyText = [easyText, mediumText, hardText]
        .filter(text => text !== '')
        .join(', ');

      toast.success(`Mixed difficulty test created`, {
        description: `${difficultyText} questions have been generated`
      });
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error('Failed to load questions', {
        description: 'Please try again later'
      });
    } finally {
      // Clear the timeout to prevent memory leaks
      clearTimeout(loadingTimeout);
      setIsLoading(false);
    }
    // Remove difficultyCounts from dependencies to prevent regeneration when they change
    // We capture the current values at the start of the function instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, TOTAL_QUESTIONS, questionsGenerated]);

  // Generate questions ONLY on initial component mount if we have a valid distribution
  // We use a ref to track if this is the first render
  const isFirstRender = React.useRef(true);

  useEffect(() => {
    // Only run this effect on the first render
    if (isFirstRender.current) {
      isFirstRender.current = false;

      // Check if we have a valid distribution
      const totalCount = difficultyCounts.easy + difficultyCounts.medium + difficultyCounts.hard;
      if (totalCount === TOTAL_QUESTIONS && !questionsGenerated) {
        // Automatically generate questions on component mount
        generateTest();
      }
    }
    // Only depend on generateTest to avoid regeneration when difficultyCounts change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateTest]);

  // Handle difficulty count changes
  const handleDifficultyCountsChange = (newCounts: {easy: number; medium: number; hard: number}) => {
    // Check if the counts have actually changed to avoid unnecessary updates
    const hasChanged =
      newCounts.easy !== difficultyCounts.easy ||
      newCounts.medium !== difficultyCounts.medium ||
      newCounts.hard !== difficultyCounts.hard;

    // Only proceed if the counts have changed
    if (hasChanged) {
      // Update the difficulty counts state
      setDifficultyCounts(newCounts);

      // If questions have already been generated, update their difficulty levels
      if (questionsGenerated && questions.length > 0) {
        // Calculate how many questions of each difficulty we need
        const totalCount = newCounts.easy + newCounts.medium + newCounts.hard;

        // Only proceed if the total count matches our expected total
        if (totalCount === TOTAL_QUESTIONS) {
          // Create a copy of the current questions
          const updatedQuestions = [...questions];

          // Create an array to track which questions should have which difficulty
          const difficultyAssignments: Difficulty[] = [
            ...Array(newCounts.easy).fill('easy'),
            ...Array(newCounts.medium).fill('medium'),
            ...Array(newCounts.hard).fill('hard')
          ];

          // Shuffle the difficulty assignments to randomize which questions get which difficulty
          const shuffledAssignments = [...difficultyAssignments].sort(() => 0.5 - Math.random());

          // Assign the new difficulties to the questions
          updatedQuestions.forEach((question, index) => {
            if (index < shuffledAssignments.length) {
              question.difficulty = shuffledAssignments[index];
            }
          });

          // Update the questions state with the new difficulty assignments
          setQuestions(updatedQuestions);

          // Show notification about the updated difficulty distribution
          const easyText = newCounts.easy > 0 ? `${newCounts.easy} easy` : '';
          const mediumText = newCounts.medium > 0 ? `${newCounts.medium} medium` : '';
          const hardText = newCounts.hard > 0 ? `${newCounts.hard} hard` : '';

          // Combine the non-empty difficulty texts with commas
          const difficultyText = [easyText, mediumText, hardText]
            .filter(text => text !== '')
            .join(', ');

          toast.success(`Question distribution updated`, {
            description: `Now showing ${difficultyText} questions`
          });
        }
      }
    }
  };

  // Reset the test to allow selecting a new difficulty distribution
  const handleResetTest = () => {
    setQuestionsGenerated(false);
    setQuestions([]);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
  };

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, handleSubmit]);

  // Generate questions for a specific difficulty
  const generateQuestionsForDifficulty = (subject: string, count: number, difficulty: Difficulty): MCQQuestion[] => {
    // If count is 0, return an empty array immediately
    if (count === 0) {
      return [];
    }

    const questions: MCQQuestion[] = [];

    const subjectQuestions = {
      // Science domain subjects
      'physics': [
        // Easy questions
        { question: 'What is Newton\'s First Law of Motion?', difficulty: 'easy' },
        { question: 'What is the SI unit of force?', difficulty: 'easy' },
        { question: 'What is the difference between mass and weight?', difficulty: 'easy' },
        { question: 'What is the unit of electric current?', difficulty: 'easy' },
        { question: 'What is the speed of light in vacuum?', difficulty: 'easy' },
        { question: 'What is the SI unit of energy?', difficulty: 'easy' },
        { question: 'What is the formula for kinetic energy?', difficulty: 'easy' },
        { question: 'What is the SI unit of power?', difficulty: 'easy' },
        { question: 'What is the law of conservation of energy?', difficulty: 'easy' },
        { question: 'What is the SI unit of pressure?', difficulty: 'easy' },
        { question: 'What is the formula for density?', difficulty: 'easy' },
        { question: 'What is the SI unit of temperature?', difficulty: 'easy' },

        // Medium questions
        { question: 'Which of the following is a vector quantity?', difficulty: 'medium' },
        { question: 'What is the formula for calculating work done?', difficulty: 'medium' },
        { question: 'Calculate the momentum of a 2kg object moving at 5m/s', difficulty: 'medium' },
        { question: 'What is the relationship between force, mass, and acceleration?', difficulty: 'medium' },
        { question: 'Explain the difference between elastic and inelastic collisions', difficulty: 'medium' },
        { question: 'What is the formula for centripetal force?', difficulty: 'medium' },
        { question: 'Calculate the potential energy of a 5kg object at a height of 10m', difficulty: 'medium' },
        { question: 'What is the relationship between wavelength and frequency?', difficulty: 'medium' },
        { question: 'Explain Ohm\'s law and its applications', difficulty: 'medium' },
        { question: 'What is the principle of superposition?', difficulty: 'medium' },
        { question: 'Calculate the acceleration of an object with a mass of 10kg when a force of 50N is applied', difficulty: 'medium' },

        // Hard questions
        { question: 'What is the principle behind a hydraulic press?', difficulty: 'hard' },
        { question: 'Explain Bernoulli\'s principle', difficulty: 'hard' },
        { question: 'Derive the equation for the period of a simple pendulum', difficulty: 'hard' },
        { question: 'Explain the concept of relativistic mass', difficulty: 'hard' },
        { question: 'Calculate the escape velocity from Earth\'s surface', difficulty: 'hard' },
        { question: 'Explain the quantum mechanical model of the atom', difficulty: 'hard' },
        { question: 'Derive the Schrödinger equation for a particle in a box', difficulty: 'hard' },
        { question: 'Explain the concept of wave-particle duality', difficulty: 'hard' },
        { question: 'Calculate the magnetic field at the center of a current-carrying loop', difficulty: 'hard' },
        { question: 'Explain the principles of nuclear fusion and fission', difficulty: 'hard' },
        { question: 'Derive the equation for the Doppler effect', difficulty: 'hard' }
      ],
      'chemistry': [
        // Easy questions
        { question: 'What is the chemical symbol for gold?', difficulty: 'easy' },
        { question: 'What is the pH of a neutral solution?', difficulty: 'easy' },
        { question: 'What is the difference between an exothermic and endothermic reaction?', difficulty: 'easy' },
        { question: 'What is the atomic number of oxygen?', difficulty: 'easy' },
        { question: 'What is the chemical formula for water?', difficulty: 'easy' },
        { question: 'What is the most abundant gas in Earth\'s atmosphere?', difficulty: 'easy' },
        { question: 'What is the chemical symbol for sodium?', difficulty: 'easy' },
        { question: 'What is the chemical formula for table salt?', difficulty: 'easy' },
        { question: 'What is the pH range of acidic solutions?', difficulty: 'easy' },
        { question: 'What is the chemical symbol for iron?', difficulty: 'easy' },
        { question: 'What is the chemical formula for carbon dioxide?', difficulty: 'easy' },

        // Medium questions
        { question: 'Which element has the atomic number 6?', difficulty: 'medium' },
        { question: 'What is the main component of natural gas?', difficulty: 'medium' },
        { question: 'What type of bond is formed when electrons are shared between atoms?', difficulty: 'medium' },
        { question: 'What is the difference between an acid and a base?', difficulty: 'medium' },
        { question: 'Explain the concept of electronegativity', difficulty: 'medium' },
        { question: 'What is the difference between a mixture and a compound?', difficulty: 'medium' },
        { question: 'What is the periodic law?', difficulty: 'medium' },
        { question: 'Explain the concept of oxidation and reduction', difficulty: 'medium' },
        { question: 'What is the difference between isotopes and isobars?', difficulty: 'medium' },
        { question: 'What is the role of a catalyst in a chemical reaction?', difficulty: 'medium' },
        { question: 'Explain the concept of chemical equilibrium', difficulty: 'medium' },

        // Hard questions
        { question: 'Explain the concept of resonance in organic chemistry', difficulty: 'hard' },
        { question: 'Calculate the molarity of a solution containing 4g of NaOH in 500ml of water', difficulty: 'hard' },
        { question: 'Explain the concept of hybridization in carbon compounds', difficulty: 'hard' },
        { question: 'Derive the Henderson-Hasselbalch equation', difficulty: 'hard' },
        { question: 'Explain the concept of chirality in organic molecules', difficulty: 'hard' },
        { question: 'Calculate the pH of a buffer solution containing 0.1M acetic acid and 0.1M sodium acetate', difficulty: 'hard' },
        { question: 'Explain the principles of chromatography', difficulty: 'hard' },
        { question: 'Derive the rate law for a second-order reaction', difficulty: 'hard' },
        { question: 'Explain the concept of molecular orbital theory', difficulty: 'hard' },
        { question: 'Calculate the standard cell potential for a galvanic cell', difficulty: 'hard' },
        { question: 'Explain the concept of coordination compounds', difficulty: 'hard' }
      ],
      'mathematics': [
        // Easy questions
        { question: 'What is the value of π (pi) to two decimal places?', difficulty: 'easy' },
        { question: 'What is the square root of 144?', difficulty: 'easy' },
        { question: 'If x + 5 = 12, what is the value of x?', difficulty: 'easy' },
        { question: 'What is 25% of 80?', difficulty: 'easy' },
        { question: 'What is the formula for the area of a rectangle?', difficulty: 'easy' },
        { question: 'What is the sum of angles in a triangle?', difficulty: 'easy' },
        { question: 'What is the value of 5²?', difficulty: 'easy' },
        { question: 'What is the formula for the perimeter of a square?', difficulty: 'easy' },
        { question: 'What is the value of 3 × 9?', difficulty: 'easy' },
        { question: 'What is the formula for the area of a triangle?', difficulty: 'easy' },
        { question: 'What is the value of 15 ÷ 3?', difficulty: 'easy' },

        // Medium questions
        { question: 'What is the formula for the area of a circle?', difficulty: 'medium' },
        { question: 'What is the sum of the interior angles of a hexagon?', difficulty: 'medium' },
        { question: 'Solve the equation: 2x + 3 = 7', difficulty: 'medium' },
        { question: 'What is the formula for the volume of a cylinder?', difficulty: 'medium' },
        { question: 'Calculate the slope of a line passing through the points (2,3) and (4,7)', difficulty: 'medium' },
        { question: 'What is the Pythagorean theorem?', difficulty: 'medium' },
        { question: 'Solve the inequality: 3x - 2 > 7', difficulty: 'medium' },
        { question: 'What is the formula for the area of a trapezoid?', difficulty: 'medium' },
        { question: 'Calculate the value of log₁₀(100)', difficulty: 'medium' },
        { question: 'What is the formula for the volume of a sphere?', difficulty: 'medium' },
        { question: 'Solve the system of equations: x + y = 5 and 2x - y = 1', difficulty: 'medium' },

        // Hard questions
        { question: 'Solve the quadratic equation: 2x² + 5x - 3 = 0', difficulty: 'hard' },
        { question: 'Find the derivative of f(x) = x³ + 2x² - 4x + 1', difficulty: 'hard' },
        { question: 'Calculate the integral of f(x) = 2x + 3 from x = 1 to x = 4', difficulty: 'hard' },
        { question: 'Solve the differential equation: dy/dx = 2xy', difficulty: 'hard' },
        { question: 'Find the eigenvalues of the matrix [[2, 1], [1, 3]]', difficulty: 'hard' },
        { question: 'Prove the binomial theorem using mathematical induction', difficulty: 'hard' },
        { question: 'Calculate the limit of (sin x)/x as x approaches 0', difficulty: 'hard' },
        { question: 'Find the general solution to the differential equation: d²y/dx² + 4y = 0', difficulty: 'hard' },
        { question: 'Prove that the set of real numbers is uncountable', difficulty: 'hard' },
        { question: 'Calculate the volume of a solid of revolution formed by rotating y = x² from x = 0 to x = 2 around the x-axis', difficulty: 'hard' },
        { question: 'Find the Fourier series expansion of f(x) = x for -π < x < π', difficulty: 'hard' }
      ]
    };

    // Use subject-specific questions or default ones
    const questionPool = subjectQuestions[subject as keyof typeof subjectQuestions] || [
      // Easy default questions
      { question: 'Sample easy question 1 for ' + subject, difficulty: 'easy' },
      { question: 'Sample easy question 2 for ' + subject, difficulty: 'easy' },
      { question: 'Sample easy question 3 for ' + subject, difficulty: 'easy' },
      { question: 'Sample easy question 4 for ' + subject, difficulty: 'easy' },
      { question: 'Sample easy question 5 for ' + subject, difficulty: 'easy' },
      { question: 'Sample easy question 6 for ' + subject, difficulty: 'easy' },
      { question: 'Sample easy question 7 for ' + subject, difficulty: 'easy' },
      { question: 'Sample easy question 8 for ' + subject, difficulty: 'easy' },
      { question: 'Sample easy question 9 for ' + subject, difficulty: 'easy' },
      { question: 'Sample easy question 10 for ' + subject, difficulty: 'easy' },
      { question: 'Sample easy question 11 for ' + subject, difficulty: 'easy' },
      { question: 'Sample easy question 12 for ' + subject, difficulty: 'easy' },

      // Medium default questions
      { question: 'Sample medium question 1 for ' + subject, difficulty: 'medium' },
      { question: 'Sample medium question 2 for ' + subject, difficulty: 'medium' },
      { question: 'Sample medium question 3 for ' + subject, difficulty: 'medium' },
      { question: 'Sample medium question 4 for ' + subject, difficulty: 'medium' },
      { question: 'Sample medium question 5 for ' + subject, difficulty: 'medium' },
      { question: 'Sample medium question 6 for ' + subject, difficulty: 'medium' },
      { question: 'Sample medium question 7 for ' + subject, difficulty: 'medium' },
      { question: 'Sample medium question 8 for ' + subject, difficulty: 'medium' },
      { question: 'Sample medium question 9 for ' + subject, difficulty: 'medium' },
      { question: 'Sample medium question 10 for ' + subject, difficulty: 'medium' },
      { question: 'Sample medium question 11 for ' + subject, difficulty: 'medium' },
      { question: 'Sample medium question 12 for ' + subject, difficulty: 'medium' },

      // Hard default questions
      { question: 'Sample hard question 1 for ' + subject, difficulty: 'hard' },
      { question: 'Sample hard question 2 for ' + subject, difficulty: 'hard' },
      { question: 'Sample hard question 3 for ' + subject, difficulty: 'hard' },
      { question: 'Sample hard question 4 for ' + subject, difficulty: 'hard' },
      { question: 'Sample hard question 5 for ' + subject, difficulty: 'hard' },
      { question: 'Sample hard question 6 for ' + subject, difficulty: 'hard' },
      { question: 'Sample hard question 7 for ' + subject, difficulty: 'hard' },
      { question: 'Sample hard question 8 for ' + subject, difficulty: 'hard' },
      { question: 'Sample hard question 9 for ' + subject, difficulty: 'hard' },
      { question: 'Sample hard question 10 for ' + subject, difficulty: 'hard' },
      { question: 'Sample hard question 11 for ' + subject, difficulty: 'hard' },
      { question: 'Sample hard question 12 for ' + subject, difficulty: 'hard' }
    ];

    // Filter questions by the requested difficulty
    const difficultyQuestions = questionPool.filter(q => q.difficulty === difficulty);

    // Function to get random questions from a pool
    const getRandomQuestions = (pool: { question: string; difficulty: string }[], count: number) => {
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, Math.min(count, pool.length));
    };

    // Get random questions of the specified difficulty
    const selectedQuestions = getRandomQuestions(difficultyQuestions, count);

    // Generate the requested number of questions
    for (let i = 0; i < selectedQuestions.length; i++) {
      questions.push({
        id: `${difficulty}-q${i+1}`, // Include difficulty in ID to ensure uniqueness
        question: `${selectedQuestions[i].question}`, // Remove numbering from question text
        difficulty: selectedQuestions[i].difficulty as Difficulty,
        options: [
          { id: 'A', text: `Option A for this question` },
          { id: 'B', text: `Option B for this question` },
          { id: 'C', text: `Option C for this question` },
          { id: 'D', text: `Option D for this question` }
        ]
      });
    }

    return questions;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-app-blue-600 mb-4" />
        <p className="text-app-blue-800">Loading questions...</p>
      </div>
    );
  }

  // Check if we have questions
  if (!questions.length) {
    const totalCount = difficultyCounts.easy + difficultyCounts.medium + difficultyCounts.hard;
    const isValidTotal = totalCount === TOTAL_QUESTIONS;

    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="bg-white border border-app-blue-100 rounded-md p-6 shadow-sm max-w-md">
          <h3 className="text-lg font-medium text-app-blue-900 mb-4">Select Question Distribution</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Please select how many questions of each difficulty level you want in your test.
            The total must equal exactly {TOTAL_QUESTIONS} questions.
          </p>

          <DifficultySelector
            difficultyCounts={difficultyCounts}
            onDifficultyCountsChange={handleDifficultyCountsChange}
            totalQuestions={TOTAL_QUESTIONS}
          />

          <div className="mt-6 flex justify-center">
            <Button
              onClick={generateTest}
              disabled={!isValidTotal || isLoading}
              className="bg-app-teal-500 hover:bg-app-teal-600 font-medium px-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Test...
                </>
              ) : (
                'Generate Test'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex gap-4">
        {/* Question Navigation Box and Difficulty Selector - Left Side */}
        <div className="hidden md:block w-48 sticky top-4 self-start">
          <QuestionNavigationBox
            totalQuestions={questions.length}
            currentQuestionIndex={currentQuestionIndex}
            userAnswers={userAnswers}
            onQuestionSelect={handleQuestionSelect}
            questions={questions}
          />

          {/* Difficulty Selector */}
          <div>
            <DifficultySelector
              difficultyCounts={difficultyCounts}
              onDifficultyCountsChange={handleDifficultyCountsChange}
              totalQuestions={TOTAL_QUESTIONS}
            />

            {questionsGenerated && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetTest}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  Reset Test
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Main Test Content - Right Side */}
        <div className="flex-1">
          <Card className="shadow-lg border-app-blue-100">
            <CardHeader className="bg-app-blue-50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-app-blue-900 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  {subject} MCQ Test
                </CardTitle>
                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-app-blue-200">
                  <Clock className="h-4 w-4 text-app-blue-600" />
                  <span className={`font-mono font-medium ${timeRemaining < 60 ? 'text-red-600' : 'text-app-blue-800'}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
              <CardDescription>
                Question {currentQuestionIndex + 1} of {questions.length} • {answeredCount} answered
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                  Mixed Difficulty
                </span>
              </CardDescription>

              {/* Mobile Question Navigation */}
              <div className="block md:hidden mt-2 overflow-x-auto pb-2">
                {/* Mobile Legend */}
                <div className="flex justify-center gap-3 mb-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-green-700">Easy</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="text-yellow-700">Medium</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-red-700">Hard</span>
                  </div>
                </div>

                <div className="flex gap-1 min-w-max">
                  {questions.map((question, index) => {
                    const isAnswered = userAnswers[question.id] !== undefined;
                    const isCurrent = index === currentQuestionIndex;
                    const difficulty = question.difficulty;

                    // Get difficulty-based styling
                    const getDifficultyStyles = () => {
                      if (!difficulty) return {};

                      switch (difficulty) {
                        case 'easy':
                          return {
                            border: 'border-green-300',
                            bg: 'bg-green-50',
                            text: 'text-green-700',
                            ring: 'ring-green-300'
                          };
                        case 'medium':
                          return {
                            border: 'border-yellow-300',
                            bg: 'bg-yellow-50',
                            text: 'text-yellow-700',
                            ring: 'ring-yellow-300'
                          };
                        case 'hard':
                          return {
                            border: 'border-red-300',
                            bg: 'bg-red-50',
                            text: 'text-red-700',
                            ring: 'ring-red-300'
                          };
                        default:
                          return {};
                      }
                    };

                    const diffStyles = getDifficultyStyles();

                    return (
                      <Button
                        key={question.id}
                        size="sm"
                        variant="outline"
                        className={`w-8 h-8 p-0 flex items-center justify-center text-xs font-medium
                          ${isCurrent ? 'border-app-blue-500 bg-app-blue-50 text-app-blue-700 ring-1 ring-app-blue-500' : ''}
                          ${isAnswered && !isCurrent ? 'border-green-200 bg-green-50 text-green-700' : ''}
                          ${!isAnswered && !isCurrent && !difficulty ? 'border-slate-200 bg-slate-50 text-slate-700' : ''}
                          ${!isAnswered && !isCurrent && difficulty ? `${diffStyles.border} ${diffStyles.bg} ${diffStyles.text}` : ''}
                        `}
                        onClick={() => handleQuestionSelect(index)}
                      >
                        {index + 1}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Difficulty Selector */}
              <div className="block md:hidden mt-2 bg-white border border-app-blue-100 rounded-md p-3 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-app-blue-900">Question Distribution</span>
                  <Badge variant={difficultyCounts.easy + difficultyCounts.medium + difficultyCounts.hard === TOTAL_QUESTIONS ? "outline" : "destructive"}
                         className={difficultyCounts.easy + difficultyCounts.medium + difficultyCounts.hard === TOTAL_QUESTIONS ? "bg-blue-50 text-blue-700" : ""}>
                    {difficultyCounts.easy + difficultyCounts.medium + difficultyCounts.hard}/{TOTAL_QUESTIONS}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Easy */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="mobile-easy-count" className="text-xs text-green-700">Easy</Label>
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                    <Input
                      id="mobile-easy-count"
                      type="number"
                      min="0"
                      max={TOTAL_QUESTIONS}
                      value={difficultyCounts.easy}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = Math.max(0, parseInt(e.target.value) || 0);
                        handleDifficultyCountsChange({
                          ...difficultyCounts,
                          easy: value
                        });
                      }}
                      className="h-8 text-sm text-center"
                    />
                  </div>

                  {/* Medium */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="mobile-medium-count" className="text-xs text-yellow-700">Medium</Label>
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    </div>
                    <Input
                      id="mobile-medium-count"
                      type="number"
                      min="0"
                      max={TOTAL_QUESTIONS}
                      value={difficultyCounts.medium}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = Math.max(0, parseInt(e.target.value) || 0);
                        handleDifficultyCountsChange({
                          ...difficultyCounts,
                          medium: value
                        });
                      }}
                      className="h-8 text-sm text-center"
                    />
                  </div>

                  {/* Hard */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="mobile-hard-count" className="text-xs text-red-700">Hard</Label>
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                    <Input
                      id="mobile-hard-count"
                      type="number"
                      min="0"
                      max={TOTAL_QUESTIONS}
                      value={difficultyCounts.hard}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = Math.max(0, parseInt(e.target.value) || 0);
                        handleDifficultyCountsChange({
                          ...difficultyCounts,
                          hard: value
                        });
                      }}
                      className="h-8 text-sm text-center"
                    />
                  </div>
                </div>

                {difficultyCounts.easy + difficultyCounts.medium + difficultyCounts.hard !== TOTAL_QUESTIONS && (
                  <div className="text-xs text-red-500 mt-2 text-center">
                    Total must equal {TOTAL_QUESTIONS} questions
                  </div>
                )}

                {questionsGenerated && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetTest}
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Reset Test
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-6 pb-4">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {currentQuestion.difficulty && (
                      <Badge className={`
                        ${currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700 border-green-200' : ''}
                        ${currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : ''}
                        ${currentQuestion.difficulty === 'hard' ? 'bg-red-100 text-red-700 border-red-200' : ''}
                      `}>
                        {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)} Difficulty
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-medium mb-4 break-words whitespace-normal overflow-hidden">
                    {currentQuestionIndex + 1}. {currentQuestion.question}
                  </h3>

                  <RadioGroup
                    value={userAnswers[currentQuestion.id] || ''}
                    onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
                    className="space-y-3"
                  >
                    {currentQuestion.options.map((option) => (
                      <div key={option.id} className="flex items-start space-x-2 border p-3 rounded-md hover:bg-slate-50">
                        <RadioGroupItem value={option.id} id={`option-${option.id}`} className="mt-1" />
                        <Label htmlFor={`option-${option.id}`} className="flex-1 cursor-pointer break-words whitespace-normal">
                          <span className="font-medium mr-2 inline-block">{option.id}.</span>
                          <span className="inline-block">{option.text}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </CardContent>

            <Separator />

            <CardFooter className="flex justify-between p-4 bg-slate-50">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="border-app-blue-200 text-app-blue-700 hover:bg-app-blue-50"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="border-app-blue-200 text-app-blue-700 hover:bg-app-blue-50"
                >
                  Next
                </Button>
              </div>

              <Button
                onClick={() => {
                  console.log('Submit button clicked');
                  handleSubmit();
                }}
                disabled={isSubmitting}
                className="bg-app-teal-500 hover:bg-app-teal-600 font-medium px-6"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Evaluating Answers...
                  </>
                ) : (
                  <>
                    Submit & View Results
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OnlineMCQTest;
