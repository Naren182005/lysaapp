/**
 * Simple test script for the improved OCR functionality
 */

import { extractTextFromImage } from '../utils/evaluationService';
import { segmentImage } from '../utils/imageUtils';
import { reconstructTextFromSegments } from '../utils/textUtils';

/**
 * Test the OCR functionality with a sample image
 * @param imageUrl The URL of the image to test
 * @param isQuestionPaper Whether the image is a question paper (true) or answer sheet (false)
 */
async function testOCR(imageUrl: string, isQuestionPaper: boolean = false) {
  console.log(`Testing OCR with ${isQuestionPaper ? 'question paper' : 'answer sheet'} image:`, imageUrl);
  
  try {
    // Test the full OCR pipeline
    console.log('Testing full OCR pipeline...');
    const extractedText = await extractTextFromImage(imageUrl, isQuestionPaper);
    console.log('Extracted text:', extractedText);
    
    // Test image segmentation
    console.log('Testing image segmentation...');
    const segments = await segmentImage(
      imageUrl,
      isQuestionPaper,
      isQuestionPaper ? 1200 : 800,
      isQuestionPaper ? 1200 : 800,
      0.1
    );
    console.log(`Image segmented into ${segments.length} parts`);
    
    // Display the first segment for inspection
    if (segments.length > 0) {
      console.log('First segment:', {
        x: segments[0].x,
        y: segments[0].y,
        width: segments[0].width,
        height: segments[0].height
      });
    }
    
    console.log('OCR test completed successfully');
  } catch (error) {
    console.error('OCR test failed:', error);
  }
}

// Export the test function
export { testOCR };

// If this script is run directly, test with a sample image
if (typeof window !== 'undefined') {
  // Get a sample image from the user
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  
  fileInput.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;
        if (imageUrl) {
          // Ask if this is a question paper or answer sheet
          const isQuestionPaper = confirm('Is this a question paper? (OK for question paper, Cancel for answer sheet)');
          
          // Run the test
          await testOCR(imageUrl, isQuestionPaper);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Trigger the file input
  fileInput.click();
}
