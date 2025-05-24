/**
 * Utility functions for image processing
 */

/**
 * Converts a data URL to a Blob
 * @param dataUrl The data URL to convert
 * @returns A Blob object
 */
export const dataURLtoBlob = (dataUrl: string): Blob => {
  // Split the data URL to get the content type and base64 data
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);

  // Create an array buffer from the base64 data
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  // Create a Blob from the array buffer
  return new Blob([u8arr], { type: mime });
};

/**
 * Interface for image segment information
 */
export interface ImageSegment {
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  error?: string; // Optional error message for this segment
}

/**
 * Segments an image into smaller parts for better OCR processing
 * @param imageUrl The URL of the image to segment
 * @param isQuestionPaper Whether the image is a question paper (true) or answer sheet (false)
 * @param maxSegmentWidth The maximum width of each segment
 * @param maxSegmentHeight The maximum height of each segment
 * @param overlapPercentage The percentage of overlap between segments (0-1)
 * @returns A Promise that resolves to an array of image segments
 */
export const segmentImage = (
  imageUrl: string,
  isQuestionPaper: boolean = false,
  maxSegmentWidth: number = 1000,
  maxSegmentHeight: number = 1000,
  overlapPercentage: number = 0.1
): Promise<ImageSegment[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Create segments array
      const segments: ImageSegment[] = [];

      // Determine if this is handwritten text (not a question paper)
      const isHandwritten = !isQuestionPaper;

      // Adjust segment size based on image type and content
      // For question papers (printed text), we can use larger segments
      // For handwritten text, use smaller segments for better accuracy
      // Reduced segment size for handwritten text to improve recognition accuracy
      let segmentWidth = isQuestionPaper ? maxSegmentWidth : Math.min(maxSegmentWidth, 600);
      let segmentHeight = isQuestionPaper ? maxSegmentHeight : Math.min(maxSegmentHeight, 600);

      // For very large images, use larger segments to reduce processing time
      if (img.width > 2500 || img.height > 2500) {
        segmentWidth = Math.min(1500, segmentWidth);
        segmentHeight = Math.min(1500, segmentHeight);
      }

      // For very small images, don't segment at all
      if (img.width < segmentWidth && img.height < segmentHeight) {
        console.log(`Image (${img.width}x${img.height}) is smaller than segment size, not segmenting`);
        segments.push({
          dataUrl: imageUrl,
          x: 0,
          y: 0,
          width: img.width,
          height: img.height
        });
        resolve(segments);
        return;
      }

      // Adjust overlap based on content type
      // More overlap for handwritten text to ensure no characters are cut off
      // Increased overlap for handwritten text to prevent cutting off characters
      const adjustedOverlapPercentage = isHandwritten ? Math.max(0.30, overlapPercentage) : overlapPercentage;

      // Calculate overlap in pixels
      const overlapX = Math.floor(segmentWidth * adjustedOverlapPercentage);
      const overlapY = Math.floor(segmentHeight * adjustedOverlapPercentage);

      // Calculate number of segments needed in each dimension
      const numSegmentsX = Math.ceil((img.width - overlapX) / (segmentWidth - overlapX));
      const numSegmentsY = Math.ceil((img.height - overlapY) / (segmentHeight - overlapY));

      console.log(`Segmenting image (${img.width}x${img.height}) into ${numSegmentsX}x${numSegmentsY} segments with ${adjustedOverlapPercentage * 100}% overlap`);

      // Create canvas for segment processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas size for segments
      canvas.width = segmentWidth;
      canvas.height = segmentHeight;

      // Enable high-quality image scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Create segments with overlap
      for (let y = 0; y < numSegmentsY; y++) {
        for (let x = 0; x < numSegmentsX; x++) {
          // Calculate segment position with overlap
          const segX = x * (segmentWidth - overlapX);
          const segY = y * (segmentHeight - overlapY);

          // Adjust segment dimensions for edge segments
          const actualWidth = Math.min(segmentWidth, img.width - segX);
          const actualHeight = Math.min(segmentHeight, img.height - segY);

          // Resize canvas if needed for edge segments
          if (actualWidth !== canvas.width || actualHeight !== canvas.height) {
            canvas.width = actualWidth;
            canvas.height = actualHeight;
          }

          // Clear canvas for new segment
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw segment from original image
          ctx.drawImage(
            img,
            segX, segY, actualWidth, actualHeight,
            0, 0, actualWidth, actualHeight
          );

          // Convert to data URL with appropriate quality
          // Higher quality for handwritten text to preserve fine details
          const quality = isHandwritten ? 0.99 : 0.95;
          const segmentDataUrl = canvas.toDataURL('image/jpeg', quality);

          // Add segment to array
          segments.push({
            dataUrl: segmentDataUrl,
            x: segX,
            y: segY,
            width: actualWidth,
            height: actualHeight
          });
        }
      }

      // For question papers, add special segments for potential headers and footers
      // This helps capture important information that might be in these areas
      if (isQuestionPaper) {
        // Reset canvas size for header/footer segments
        canvas.width = img.width;

        // Add a segment for the top of the page (header)
        const headerHeight = Math.min(300, img.height / 4);
        canvas.height = headerHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          img,
          0, 0, img.width, headerHeight,
          0, 0, canvas.width, headerHeight
        );
        segments.push({
          dataUrl: canvas.toDataURL('image/jpeg', 0.95),
          x: 0,
          y: 0,
          width: img.width,
          height: headerHeight
        });

        // Add a segment for the bottom of the page (footer)
        const footerY = Math.max(0, img.height - headerHeight);
        canvas.height = headerHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          img,
          0, footerY, img.width, headerHeight,
          0, 0, canvas.width, headerHeight
        );
        segments.push({
          dataUrl: canvas.toDataURL('image/jpeg', 0.95),
          x: 0,
          y: footerY,
          width: img.width,
          height: headerHeight
        });

        // For wide images, add segments for the left and right margins
        // This helps capture information that might be in the margins
        if (img.width > 1000) {
          const marginWidth = Math.min(300, img.width / 4);
          canvas.width = marginWidth;
          canvas.height = img.height;

          // Left margin
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            img,
            0, 0, marginWidth, img.height,
            0, 0, marginWidth, canvas.height
          );
          segments.push({
            dataUrl: canvas.toDataURL('image/jpeg', 0.95),
            x: 0,
            y: 0,
            width: marginWidth,
            height: img.height
          });

          // Right margin
          const rightMarginX = Math.max(0, img.width - marginWidth);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            img,
            rightMarginX, 0, marginWidth, img.height,
            0, 0, marginWidth, canvas.height
          );
          segments.push({
            dataUrl: canvas.toDataURL('image/jpeg', 0.95),
            x: rightMarginX,
            y: 0,
            width: marginWidth,
            height: img.height
          });
        }
      }

      resolve(segments);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for segmentation'));
    };

    img.src = imageUrl;
  });
};

/**
 * Compresses an image to reduce its size while optimizing for OCR
 * @param imageUrl The URL of the image to compress
 * @param maxWidth The maximum width of the compressed image
 * @param quality The quality of the compressed image (0-1)
 * @param documentType Optional document type for specialized compression
 * @returns A Promise that resolves to a compressed data URL
 */
export const compressImage = (
  imageUrl: string,
  maxWidth: number = 1200,
  quality: number = 0.8,
  documentType?: 'questionPaper' | 'mcqOptions' | 'handwritten' | 'standard'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Calculate the new dimensions
      let width = img.width;
      let height = img.height;

      // Determine optimal dimensions based on document type
      let targetWidth = maxWidth;
      let targetQuality = quality;

      // Optimize dimensions and quality based on document type
      if (documentType) {
        switch (documentType) {
          case 'questionPaper':
            // For question papers, maintain higher resolution for better text recognition
            targetWidth = Math.max(1600, maxWidth);
            targetQuality = Math.max(0.92, quality);
            break;
          case 'mcqOptions':
            // For MCQ options, optimize for clarity of options
            targetWidth = Math.max(1400, maxWidth);
            targetQuality = Math.max(0.90, quality);
            break;
          case 'handwritten':
            // For handwritten text, use highest resolution and quality
            targetWidth = Math.max(2000, maxWidth);
            targetQuality = Math.max(0.95, quality);
            break;
          default:
            // Use provided values for standard documents
            break;
        }
      }

      // Ensure minimum dimensions for OCR
      const minWidth = 800;
      if (width < minWidth) {
        // Scale up small images for better OCR
        const scaleFactor = minWidth / width;
        width = minWidth;
        height = Math.round(height * scaleFactor);
      } else if (width > targetWidth) {
        // Scale down large images
        height = Math.round((height * targetWidth) / width);
        width = targetWidth;
      }

      // Create a canvas to draw the compressed image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      // Draw the image on the canvas with high-quality settings
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Enable high-quality image scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill with white background to remove transparency (improves OCR)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Draw the image
      ctx.drawImage(img, 0, 0, width, height);

      // Apply subtle sharpening for better text recognition
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Simple sharpening filter
        const sharpeningFactor = 0.3; // Subtle sharpening

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;

            // Apply sharpening to RGB channels
            for (let c = 0; c < 3; c++) {
              const current = data[idx + c];
              const top = data[((y-1) * width + x) * 4 + c];
              const bottom = data[((y+1) * width + x) * 4 + c];
              const left = data[(y * width + (x-1)) * 4 + c];
              const right = data[(y * width + (x+1)) * 4 + c];

              // Simple Laplacian filter for sharpening
              const laplacian = current * 5 - top - bottom - left - right;

              // Apply sharpening with strength factor
              data[idx + c] = Math.min(255, Math.max(0, current + laplacian * sharpeningFactor));
            }
          }
        }

        // Put the sharpened image back
        ctx.putImageData(imageData, 0, 0);
      } catch (error) {
        console.warn('Sharpening filter could not be applied:', error);
        // Continue without sharpening if it fails
      }

      // Convert the canvas to a data URL with optimized quality
      const compressedDataUrl = canvas.toDataURL('image/jpeg', targetQuality);

      console.log(`Image compressed: ${img.width}x${img.height} → ${width}x${height}, Quality: ${targetQuality.toFixed(2)}`);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
};

/**
 * Prepares an image for OCR by enhancing its contrast and sharpness
 * @param imageUrl The URL of the image to enhance
 * @param isQuestionPaper Whether the image is a question paper (true) or answer sheet (false)
 * @returns A Promise that resolves to an enhanced data URL
 */
/**
 * Detects and corrects skew in an image with improved algorithm
 * @param imageUrl The URL of the image to deskew
 * @param isQuestionPaper Whether the image is a question paper (true) or answer sheet (false)
 * @returns A Promise that resolves to a deskewed data URL
 */
export const deskewImage = (imageUrl: string, isQuestionPaper: boolean = false): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Create a canvas to draw the image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0);

      // Get the image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale for skew detection using improved formula
      for (let i = 0; i < data.length; i += 4) {
        // Use ITU-R BT.601 formula for more accurate grayscale conversion
        const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        data[i] = data[i + 1] = data[i + 2] = avg;
      }

      // Apply adaptive thresholding for better binarization
      const blockSize = isQuestionPaper ? 15 : 25; // Larger block size for handwritten text
      const threshold = isQuestionPaper ? 10 : 15;  // Higher threshold for handwritten text

      // Create a copy of the grayscale data for thresholding
      const tempData = new Uint8ClampedArray(data.length);
      for (let i = 0; i < data.length; i++) {
        tempData[i] = data[i];
      }

      // Apply adaptive thresholding
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;

          // Calculate local mean (average of surrounding pixels)
          let sum = 0;
          let count = 0;

          // Define the local neighborhood
          const startY = Math.max(0, y - Math.floor(blockSize/2));
          const endY = Math.min(canvas.height - 1, y + Math.floor(blockSize/2));
          const startX = Math.max(0, x - Math.floor(blockSize/2));
          const endX = Math.min(canvas.width - 1, x + Math.floor(blockSize/2));

          // Calculate mean of the local neighborhood
          for (let ny = startY; ny <= endY; ny += 2) { // Skip pixels for performance
            for (let nx = startX; nx <= endX; nx += 2) {
              const nIdx = (ny * canvas.width + nx) * 4;
              sum += tempData[nIdx];
              count++;
            }
          }

          const mean = sum / count;

          // Apply threshold: if pixel is threshold value less than mean, it's considered foreground (text)
          if (tempData[idx] < mean - threshold) {
            data[idx] = data[idx + 1] = data[idx + 2] = 0; // Black (text)
          } else {
            data[idx] = data[idx + 1] = data[idx + 2] = 255; // White (background)
          }
        }
      }

      // Put the binary image back on the canvas
      ctx.putImageData(imageData, 0, 0);

      // Detect skew angle using improved Hough transform approach
      let skewAngle = 0;
      const documentType = isQuestionPaper ? 'questionPaper' : 'handwritten';

      // Use different approaches based on document type
      if (documentType === 'questionPaper') {
        // For printed text, use horizontal line detection
        const sampleLines = 30; // Increased sample lines for better accuracy
        const lineAngles = [];

        // Sample at different heights of the image
        for (let i = 1; i < sampleLines; i++) {
          const y = Math.floor(canvas.height * i / sampleLines);

          // Find black pixel runs in this line
          let runStart = -1;
          const runs = [];

          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const isBlack = data[idx] === 0;

            if (isBlack && runStart === -1) {
              runStart = x;
            } else if (!isBlack && runStart !== -1) {
              runs.push({ start: runStart, end: x });
              runStart = -1;
            }
          }

          // If this is the end of the line and we have a run in progress, add it
          if (runStart !== -1) {
            runs.push({ start: runStart, end: canvas.width });
          }

          // If we have enough runs, try to detect the angle
          if (runs.length > 3) {
            // Find the longest runs (likely text lines)
            runs.sort((a, b) => (b.end - b.start) - (a.end - a.start));

            // Use the top 3 longest runs for more reliable angle detection
            const topRuns = runs.slice(0, Math.min(3, runs.length));

            for (const run of topRuns) {
              // Only consider runs that are long enough to be text lines
              if (run.end - run.start > canvas.width * 0.15) {
                const lineLength = run.end - run.start;
                const midPoint = Math.floor((run.start + run.end) / 2);

                // Check multiple distances above and below
                const checkDistances = [5, 10, 15]; // Check at different distances

                for (const checkDistance of checkDistances) {
                  let aboveBlack = 0;
                  let belowBlack = 0;

                  // Sample points along the run
                  const samplePoints = 20; // Increased sample points
                  const stepSize = Math.max(1, Math.floor(lineLength / samplePoints));

                  for (let x = run.start; x < run.end; x += stepSize) {
                    // Check above
                    if (y - checkDistance >= 0) {
                      const idxAbove = ((y - checkDistance) * canvas.width + x) * 4;
                      if (data[idxAbove] === 0) aboveBlack++;
                    }

                    // Check below
                    if (y + checkDistance < canvas.height) {
                      const idxBelow = ((y + checkDistance) * canvas.width + x) * 4;
                      if (data[idxBelow] === 0) belowBlack++;
                    }
                  }

                  // If we have enough black pixels above or below, estimate the angle
                  const totalSamples = Math.floor((run.end - run.start) / stepSize);
                  if (aboveBlack > totalSamples * 0.1 || belowBlack > totalSamples * 0.1) {
                    // Calculate angle using the difference in black pixels
                    const angle = Math.atan2(aboveBlack - belowBlack, lineLength) * (180 / Math.PI);
                    lineAngles.push(angle);
                  }
                }
              }
            }
          }
        }

        // Calculate the median angle if we have enough samples
        if (lineAngles.length > 5) {
          lineAngles.sort((a, b) => a - b);
          // Use median for robustness against outliers
          skewAngle = lineAngles[Math.floor(lineAngles.length / 2)];

          // Apply a weighted average around the median for more stability
          let weightedSum = skewAngle * 3; // Give the median 3x weight
          let weightSum = 3;

          // Use angles close to the median
          const medianIndex = Math.floor(lineAngles.length / 2);
          const range = Math.min(2, Math.floor(lineAngles.length / 4));

          for (let i = Math.max(0, medianIndex - range); i <= Math.min(lineAngles.length - 1, medianIndex + range); i++) {
            if (i !== medianIndex) { // Skip the median which we've already counted
              weightedSum += lineAngles[i];
              weightSum++;
            }
          }

          skewAngle = weightedSum / weightSum;
        }
      } else {
        // For handwritten text, use a different approach focusing on text blocks
        // Detect connected components (text blocks)
        const blockAngles = [];

        // Sample the image at different positions
        const sampleStepX = Math.max(10, Math.floor(canvas.width / 30));
        const sampleStepY = Math.max(10, Math.floor(canvas.height / 30));

        // Find text blocks and their orientations
        for (let y = sampleStepY; y < canvas.height - sampleStepY; y += sampleStepY) {
          for (let x = sampleStepX; x < canvas.width - sampleStepX; x += sampleStepX) {
            const idx = (y * canvas.width + x) * 4;

            // If we found a black pixel (potential text)
            if (data[idx] === 0) {
              // Look for the extent of this text block
              let minX = x, maxX = x, minY = y, maxY = y;
              const visited = new Set<string>();
              const queue: [number, number][] = [[x, y]];
              visited.add(`${x},${y}`);

              // Simple flood fill to find connected component
              while (queue.length > 0 && visited.size < 1000) { // Limit size to avoid huge blocks
                const [cx, cy] = queue.shift()!;

                // Update bounds
                minX = Math.min(minX, cx);
                maxX = Math.max(maxX, cx);
                minY = Math.min(minY, cy);
                maxY = Math.max(maxY, cy);

                // Check neighbors
                const neighbors = [
                  [cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]
                ];

                for (const [nx, ny] of neighbors) {
                  const key = `${nx},${ny}`;
                  if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height &&
                      !visited.has(key)) {
                    const nIdx = (ny * canvas.width + nx) * 4;
                    if (data[nIdx] === 0) {
                      queue.push([nx, ny]);
                      visited.add(key);
                    }
                  }
                }
              }

              // If we found a reasonably sized text block
              const width = maxX - minX;
              const height = maxY - minY;

              if (width > 20 && height > 5 && width > height) {
                // Calculate the orientation of this text block
                // For simplicity, we'll use the bounding box orientation

                // Find the top and bottom edges of the block
                let topEdgeSum = 0, topEdgeCount = 0;
                let bottomEdgeSum = 0, bottomEdgeCount = 0;

                // Sample points along the top and bottom edges
                const edgeSamples = Math.min(20, width);
                const edgeStep = Math.max(1, Math.floor(width / edgeSamples));

                for (let sx = minX; sx <= maxX; sx += edgeStep) {
                  // Find the top-most black pixel in this column
                  for (let sy = minY; sy <= maxY; sy++) {
                    const sIdx = (sy * canvas.width + sx) * 4;
                    if (data[sIdx] === 0) {
                      topEdgeSum += sy;
                      topEdgeCount++;
                      break;
                    }
                  }

                  // Find the bottom-most black pixel in this column
                  for (let sy = maxY; sy >= minY; sy--) {
                    const sIdx = (sy * canvas.width + sx) * 4;
                    if (data[sIdx] === 0) {
                      bottomEdgeSum += sy;
                      bottomEdgeCount++;
                      break;
                    }
                  }
                }

                // Calculate average y-position of top and bottom edges
                if (topEdgeCount > 0 && bottomEdgeCount > 0) {
                  const topEdgeAvg = topEdgeSum / topEdgeCount;
                  const bottomEdgeAvg = bottomEdgeSum / bottomEdgeCount;

                  // Calculate the slope of the text line
                  const angle = Math.atan2(bottomEdgeAvg - topEdgeAvg, width) * (180 / Math.PI);
                  blockAngles.push(angle);
                }
              }

              // Skip ahead to avoid reprocessing the same block
              x = maxX + sampleStepX;
            }
          }
        }

        // Calculate the median angle if we have enough blocks
        if (blockAngles.length > 3) {
          blockAngles.sort((a, b) => a - b);
          skewAngle = blockAngles[Math.floor(blockAngles.length / 2)];
        }
      }

      // Limit the correction to reasonable angles
      skewAngle = Math.max(-7, Math.min(7, skewAngle));

      // If the skew is significant, correct it
      if (Math.abs(skewAngle) > 0.5) {
        console.log(`Correcting image skew: ${skewAngle.toFixed(2)} degrees`);

        // Create a new canvas for the rotated image
        const rotatedCanvas = document.createElement('canvas');

        // Calculate the size needed for the rotated image to avoid cropping
        const radians = Math.abs(skewAngle * Math.PI / 180);
        const newWidth = Math.ceil(canvas.width * Math.cos(radians) + canvas.height * Math.sin(radians));
        const newHeight = Math.ceil(canvas.height * Math.cos(radians) + canvas.width * Math.sin(radians));

        rotatedCanvas.width = newWidth;
        rotatedCanvas.height = newHeight;
        const rotatedCtx = rotatedCanvas.getContext('2d');

        if (!rotatedCtx) {
          reject(new Error('Could not get canvas context for rotation'));
          return;
        }

        // Fill with white background to avoid transparency
        rotatedCtx.fillStyle = '#FFFFFF';
        rotatedCtx.fillRect(0, 0, newWidth, newHeight);

        // Rotate around the center
        rotatedCtx.translate(newWidth / 2, newHeight / 2);
        rotatedCtx.rotate(-skewAngle * Math.PI / 180);
        rotatedCtx.translate(-canvas.width / 2, -canvas.height / 2);

        // Draw the original image onto the rotated canvas
        rotatedCtx.drawImage(img, 0, 0);

        // Return the rotated image with high quality
        resolve(rotatedCanvas.toDataURL('image/jpeg', 0.98));
      } else {
        // No significant skew detected, return the original image
        console.log('No significant skew detected, using original image');
        resolve(imageUrl);
      }
    };

    img.onerror = () => {
      console.error('Failed to load image for deskewing');
      // Return the original image if deskewing fails
      resolve(imageUrl);
    };

    img.src = imageUrl;
  });
};

/**
 * Enhanced image preprocessing for OCR with advanced techniques
 * @param imageUrl The URL of the image to enhance
 * @param isQuestionPaper Whether the image is a question paper
 * @param isMCQOptions Whether the image contains MCQ options
 * @param isHandwritten Whether the image contains handwritten text (for student answers)
 * @returns A Promise that resolves to an enhanced data URL
 */
export const enhanceImageForOCR = async (
  imageUrl: string,
  isQuestionPaper: boolean = false,
  isMCQOptions: boolean = false,
  isHandwritten: boolean = false
): Promise<string> => {
  // Log the document type for debugging
  console.log(`Enhancing image for OCR - Document type: ${
    isQuestionPaper ? 'Question Paper' :
    isMCQOptions ? 'MCQ Options' :
    isHandwritten ? 'Handwritten Text' :
    'Standard Document'
  }`);

  try {
    // First, try to deskew the image with improved algorithm
    const deskewedImageUrl = await deskewImage(imageUrl, isQuestionPaper);

    // Process the deskewed image
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          // Create a canvas to draw the enhanced image
          const canvas = document.createElement('canvas');

          // Ensure the image is not too large or too small for optimal OCR
          let width = img.width;
          let height = img.height;

          // Optimize dimensions based on document type
          const maxDimension = isHandwritten ? 4000 :
                              isQuestionPaper ? 3800 :
                              isMCQOptions ? 3500 : 3200;

          const minDimension = isHandwritten ? 800 :
                              isQuestionPaper ? 700 :
                              isMCQOptions ? 650 : 600;

          // Calculate the aspect ratio to maintain proportions
          const aspectRatio = width / height;

          if (Math.max(width, height) > maxDimension) {
            // Scale down if too large
            if (width > height) {
              width = maxDimension;
              height = Math.round(width / aspectRatio);
            } else {
              height = maxDimension;
              width = Math.round(height * aspectRatio);
            }
          } else if (Math.max(width, height) < minDimension) {
            // Scale up if too small - use a higher scaling factor for very small images
            if (width > height) {
              width = minDimension;
              height = Math.round(width / aspectRatio);
            } else {
              height = minDimension;
              width = Math.round(height * aspectRatio);
            }

            // Apply additional scaling for extremely small images
            if (Math.max(img.width, img.height) < 300) {
              width = Math.round(width * 1.8);
              height = Math.round(height * 1.8);
            } else if (Math.max(img.width, img.height) < 450) {
              width = Math.round(width * 1.5);
              height = Math.round(height * 1.5);
            }
          }

          // For handwritten text, ensure dimensions are even higher for better recognition
          if (isHandwritten && Math.max(width, height) < 1500) {
            if (width > height) {
              const newWidth = 1500;
              height = Math.round(newWidth / aspectRatio);
              width = newWidth;
            } else {
              const newHeight = 1500;
              width = Math.round(newHeight * aspectRatio);
              height = newHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw the image on the canvas with proper scaling
          const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Fill with white background first to remove transparency
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // Use high-quality image scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Get the image data for enhancement
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Apply advanced image enhancement based on document type
          if (isQuestionPaper || isMCQOptions) {
            // For question papers or MCQ options (printed text), use specialized processing

            // Step 1: Analyze image characteristics
            let totalBrightness = 0;
            let darkPixels = 0;
            let lightPixels = 0;

            for (let i = 0; i < data.length; i += 4) {
              const pixelBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
              totalBrightness += pixelBrightness;

              if (pixelBrightness < 50) darkPixels++;
              if (pixelBrightness > 200) lightPixels++;
            }

            const avgBrightness = totalBrightness / (data.length / 4);
            const darkRatio = darkPixels / (data.length / 4);
            const lightRatio = lightPixels / (data.length / 4);

            // Step 2: Determine optimal parameters based on image analysis
            let contrast: number, brightness: number, denoisingStrength: number, sharpeningStrength: number;

            // Adjust parameters based on image characteristics
            if (avgBrightness < 100) {
              // Dark image
              contrast = isMCQOptions ? 3.5 : 3.0;
              brightness = isMCQOptions ? 40 : 35;
              denoisingStrength = 0.6;
              sharpeningStrength = 0.8;
            } else if (avgBrightness > 200) {
              // Light image
              contrast = isMCQOptions ? 4.0 : 3.5;
              brightness = isMCQOptions ? 10 : 5;
              denoisingStrength = 0.8;
              sharpeningStrength = 1.0;
            } else {
              // Balanced image
              contrast = isMCQOptions ? 3.2 : 2.8;
              brightness = isMCQOptions ? 25 : 20;
              denoisingStrength = 0.5;
              sharpeningStrength = 0.7;
            }

            // Step 3: Apply contrast enhancement
            const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

            // Create temporary arrays for multi-stage processing
            const tempData1 = new Uint8ClampedArray(data.length); // For denoising
            const tempData2 = new Uint8ClampedArray(data.length); // For sharpening
            const tempData3 = new Uint8ClampedArray(data.length); // For thresholding

            // First pass: Apply contrast enhancement and convert to grayscale
            for (let i = 0; i < data.length; i += 4) {
              // Apply contrast to RGB channels
              data[i] = Math.min(255, Math.max(0, contrastFactor * (data[i] - 128) + 128 + brightness)); // Red
              data[i + 1] = Math.min(255, Math.max(0, contrastFactor * (data[i + 1] - 128) + 128 + brightness)); // Green
              data[i + 2] = Math.min(255, Math.max(0, contrastFactor * (data[i + 2] - 128) + 128 + brightness)); // Blue

              // Convert to grayscale for better OCR using improved formula
              const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114); // Weighted grayscale conversion
              data[i] = data[i + 1] = data[i + 2] = avg;

              // Copy to temp arrays
              tempData1[i] = tempData2[i] = tempData3[i] = data[i];
              tempData1[i+1] = tempData2[i+1] = tempData3[i+1] = data[i+1];
              tempData1[i+2] = tempData2[i+2] = tempData3[i+2] = data[i+2];
              tempData1[i+3] = tempData2[i+3] = tempData3[i+3] = data[i+3];
            }

            // Step 4: Apply denoising (simple Gaussian blur)
            if (denoisingStrength > 0) {
              const kernelSize = Math.max(3, Math.min(7, Math.round(denoisingStrength * 7)));
              const sigma = denoisingStrength * 1.5;

              // Apply Gaussian blur directly without pre-computing kernel

              for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                  const idx = (y * canvas.width + x) * 4;

                  // Skip alpha channel
                  if ((idx + 3) % 4 !== 0) {
                    let sum = 0;
                    let weightSum = 0;

                    // Apply kernel
                    for (let ky = -Math.floor(kernelSize/2); ky <= Math.floor(kernelSize/2); ky++) {
                      for (let kx = -Math.floor(kernelSize/2); kx <= Math.floor(kernelSize/2); kx++) {
                        const ny = y + ky;
                        const nx = x + kx;

                        if (ny >= 0 && ny < canvas.height && nx >= 0 && nx < canvas.width) {
                          const nIdx = (ny * canvas.width + nx) * 4;
                          const weight = Math.exp(-(kx*kx + ky*ky) / (2 * sigma * sigma));

                          sum += data[nIdx] * weight;
                          weightSum += weight;
                        }
                      }
                    }

                    if (weightSum > 0) {
                      tempData1[idx] = tempData1[idx+1] = tempData1[idx+2] = Math.round(sum / weightSum);
                    }
                  }
                }
              }

              // Copy denoised data back
              for (let i = 0; i < data.length; i++) {
                if (i % 4 !== 3) { // Skip alpha channel
                  data[i] = tempData1[i];
                }
              }
            }

            // Step 5: Apply sharpening (unsharp mask)
            if (sharpeningStrength > 0) {
              // Copy current data to tempData2 for sharpening
              for (let i = 0; i < data.length; i++) {
                tempData2[i] = data[i];
              }

              for (let y = 1; y < canvas.height - 1; y++) {
                for (let x = 1; x < canvas.width - 1; x++) {
                  const idx = (y * canvas.width + x) * 4;

                  // Skip alpha channel
                  if ((idx + 3) % 4 !== 0) {
                    // Apply simple Laplacian kernel for sharpening
                    const center = data[idx];
                    const top = data[((y-1) * canvas.width + x) * 4];
                    const bottom = data[((y+1) * canvas.width + x) * 4];
                    const left = data[(y * canvas.width + (x-1)) * 4];
                    const right = data[(y * canvas.width + (x+1)) * 4];

                    // Calculate Laplacian
                    const laplacian = center * 4 - top - bottom - left - right;

                    // Apply sharpening with strength factor
                    tempData2[idx] = tempData2[idx+1] = tempData2[idx+2] =
                      Math.min(255, Math.max(0, center + laplacian * sharpeningStrength));
                  }
                }
              }

              // Copy sharpened data back
              for (let i = 0; i < data.length; i++) {
                if (i % 4 !== 3) { // Skip alpha channel
                  data[i] = tempData2[i];
                }
              }
            }

            // Step 6: Apply adaptive thresholding for better text detection
            // Determine optimal block size based on image characteristics
            let blockSize = 15; // Default block size

            // Adjust block size based on image content
            if (isMCQOptions) {
              blockSize = 11; // Smaller block size for MCQ options (more detail)
            } else if (darkRatio > 0.4 || lightRatio > 0.7) {
              blockSize = 21; // Larger block size for extreme contrast images
            }

            const threshold = isMCQOptions ? 8 : 10; // Threshold value to use

            // Apply adaptive thresholding
            for (let y = 0; y < canvas.height; y++) {
              for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;

                // Calculate local mean (average of surrounding pixels)
                let sum = 0;
                let count = 0;

                // Define the local neighborhood
                const startY = Math.max(0, y - Math.floor(blockSize/2));
                const endY = Math.min(canvas.height - 1, y + Math.floor(blockSize/2));
                const startX = Math.max(0, x - Math.floor(blockSize/2));
                const endX = Math.min(canvas.width - 1, x + Math.floor(blockSize/2));

                // Calculate mean of the local neighborhood
                for (let ny = startY; ny <= endY; ny++) {
                  for (let nx = startX; nx <= endX; nx++) {
                    const nIdx = (ny * canvas.width + nx) * 4;
                    sum += data[nIdx];
                    count++;
                  }
                }

                const mean = sum / count;

                // Apply threshold: if pixel is threshold value less than mean, it's considered foreground (text)
                if (data[idx] < mean - threshold) {
                  tempData3[idx] = tempData3[idx + 1] = tempData3[idx + 2] = 0; // Black (text)
                } else {
                  tempData3[idx] = tempData3[idx + 1] = tempData3[idx + 2] = 255; // White (background)
                }
              }
            }

            // Copy back the adaptively thresholded data
            for (let i = 0; i < data.length; i++) {
              if (i % 4 !== 3) { // Skip alpha channel
                data[i] = tempData3[i];
              }
            }
          } else {
            // For answer sheets (handwritten text), use specialized processing for handwritten content
            // This is a completely different approach optimized for handwriting recognition

            // Step 1: Analyze image characteristics
            let totalBrightness = 0;
            let darkPixels = 0;
            let lightPixels = 0;
            let edgePixels = 0;

            // First pass to calculate brightness statistics
            for (let i = 0; i < data.length; i += 4) {
              const pixelBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
              totalBrightness += pixelBrightness;

              if (pixelBrightness < 50) darkPixels++;
              if (pixelBrightness > 200) lightPixels++;
            }

            const avgBrightness = totalBrightness / (data.length / 4);
            const darkRatio = darkPixels / (data.length / 4);
            const lightRatio = lightPixels / (data.length / 4);

            // Step 2: Edge detection to identify handwriting strokes
            // Create temporary arrays for multi-stage processing
            const tempData1 = new Uint8ClampedArray(data.length); // For grayscale
            const tempData2 = new Uint8ClampedArray(data.length); // For edge detection
            const tempData3 = new Uint8ClampedArray(data.length); // For final thresholding

            // Copy original data to temp arrays
            for (let i = 0; i < data.length; i++) {
              tempData1[i] = tempData2[i] = tempData3[i] = data[i];
            }

            // Step 3: Determine optimal parameters based on image analysis
            let contrast: number, brightness: number, edgeThreshold: number, strokeWidth: number;

            // Enhanced parameters specifically for handwritten student answers with improved detection
            if (isHandwritten) {
              // Calculate additional image statistics for better parameter selection
              let edgeCount = 0;
              let darkEdgeCount = 0;
              let lightEdgeCount = 0;

              // Sample the image to detect edge characteristics (simplified edge detection)
              const sampleStep = 4; // Sample every 4th pixel for performance
              for (let y = sampleStep; y < canvas.height - sampleStep; y += sampleStep) {
                for (let x = sampleStep; x < canvas.width - sampleStep; x += sampleStep) {
                  const idx = (y * canvas.width + x) * 4;
                  const up = ((y - sampleStep) * canvas.width + x) * 4;
                  const down = ((y + sampleStep) * canvas.width + x) * 4;
                  const left = (y * canvas.width + (x - sampleStep)) * 4;
                  const right = (y * canvas.width + (x + sampleStep)) * 4;

                  // Calculate gradient magnitude (simplified)
                  const gx = Math.abs(data[right] - data[left]);
                  const gy = Math.abs(data[down] - data[up]);
                  const gradient = Math.sqrt(gx*gx + gy*gy);

                  if (gradient > 30) { // Edge detection threshold
                    edgeCount++;
                    if (data[idx] < 100) darkEdgeCount++;
                    if (data[idx] > 200) lightEdgeCount++;
                  }
                }
              }

              // Calculate edge density (percentage of edge pixels)
              const totalSampled = (canvas.width * canvas.height) / (sampleStep * sampleStep);
              const edgeDensity = edgeCount / totalSampled;

              console.log(`Handwriting analysis - Edge density: ${(edgeDensity * 100).toFixed(2)}%, Dark edges: ${(darkEdgeCount/edgeCount * 100).toFixed(2)}%, Light edges: ${(lightEdgeCount/edgeCount * 100).toFixed(2)}%`);

              // Adaptive parameters based on comprehensive image analysis
              if (avgBrightness < 100) {
                // Dark image with handwriting
                contrast = 2.8;
                brightness = 60; // Increased brightness for dark images
                edgeThreshold = edgeDensity < 0.05 ? 10 : 15; // Lower threshold for sparse handwriting
                strokeWidth = edgeDensity < 0.05 ? 1.8 : 1.5; // Thicker strokes for sparse handwriting
              } else if (avgBrightness > 200) {
                // Light image with handwriting
                contrast = 3.2;
                brightness = 5; // Minimal brightness adjustment for light images
                edgeThreshold = edgeDensity < 0.05 ? 15 : 22; // Higher threshold for light backgrounds
                strokeWidth = edgeDensity < 0.05 ? 2.0 : 1.7; // Thicker strokes for light backgrounds
              } else {
                // Balanced image with handwriting
                contrast = 2.7;
                brightness = 35;
                edgeThreshold = edgeDensity < 0.05 ? 12 : 18;
                strokeWidth = edgeDensity < 0.05 ? 1.7 : 1.4;
              }

              // Further adjust based on edge color characteristics
              if (darkEdgeCount > lightEdgeCount * 3) {
                // Predominantly dark handwriting
                contrast += 0.3;
                brightness += 10;
                strokeWidth += 0.2;
              } else if (lightEdgeCount > darkEdgeCount * 3) {
                // Predominantly light handwriting (unusual, but possible with light pen on dark background)
                contrast += 0.5;
                brightness -= 5;
                strokeWidth += 0.3;
              }
            } else {
              // Standard parameters for other handwritten content
              if (avgBrightness < 100) {
                // Dark image with handwriting
                contrast = 2.6;
                brightness = 50;
                edgeThreshold = 15;
                strokeWidth = 1.4;
              } else if (avgBrightness > 200) {
                // Light image with handwriting
                contrast = 3.0;
                brightness = 8;
                edgeThreshold = 25;
                strokeWidth = 1.7;
              } else {
                // Balanced image with handwriting
                contrast = 2.5;
                brightness = 30;
                edgeThreshold = 20;
                strokeWidth = 1.5;
              }
            }

            // Step 4: Apply contrast enhancement optimized for handwriting
            const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

            // Apply contrast enhancement and convert to grayscale
            for (let i = 0; i < data.length; i += 4) {
              // Apply contrast to RGB channels
              data[i] = Math.min(255, Math.max(0, contrastFactor * (data[i] - 128) + 128 + brightness)); // Red
              data[i + 1] = Math.min(255, Math.max(0, contrastFactor * (data[i + 1] - 128) + 128 + brightness)); // Green
              data[i + 2] = Math.min(255, Math.max(0, contrastFactor * (data[i + 2] - 128) + 128 + brightness)); // Blue

              // Convert to grayscale using improved formula for handwriting
              // This formula gives more weight to the blue channel which often contains more handwriting detail
              const avg = (data[i] * 0.25 + data[i + 1] * 0.35 + data[i + 2] * 0.4); // Weighted grayscale for handwriting
              tempData1[i] = tempData1[i + 1] = tempData1[i + 2] = avg;
            }

            // Step 5: Apply Stroke Width Transform (SWT) inspired technique for handwriting
            // This is a simplified version that enhances handwritten strokes

            // First detect edges using Sobel operator
            for (let y = 1; y < canvas.height - 1; y++) {
              for (let x = 1; x < canvas.width - 1; x++) {
                const idx = (y * canvas.width + x) * 4;

                // Apply simplified Sobel operator for edge detection
                const top = tempData1[((y-1) * canvas.width + x) * 4];
                const bottom = tempData1[((y+1) * canvas.width + x) * 4];
                const left = tempData1[(y * canvas.width + (x-1)) * 4];
                const right = tempData1[(y * canvas.width + (x+1)) * 4];
                const topLeft = tempData1[((y-1) * canvas.width + (x-1)) * 4];
                const topRight = tempData1[((y-1) * canvas.width + (x+1)) * 4];
                const bottomLeft = tempData1[((y+1) * canvas.width + (x-1)) * 4];
                const bottomRight = tempData1[((y+1) * canvas.width + (x+1)) * 4];

                // Compute gradient magnitude using Sobel
                const gx = topRight + 2*right + bottomRight - topLeft - 2*left - bottomLeft;
                const gy = bottomLeft + 2*bottom + bottomRight - topLeft - 2*top - topRight;
                const g = Math.sqrt(gx*gx + gy*gy);

                // Apply threshold to identify edges
                if (g > edgeThreshold) {
                  tempData2[idx] = tempData2[idx+1] = tempData2[idx+2] = 0; // Edge pixel (black)
                  edgePixels++;
                } else {
                  tempData2[idx] = tempData2[idx+1] = tempData2[idx+2] = 255; // Non-edge pixel (white)
                }
              }
            }

            // Step 6: Enhance handwritten strokes by dilating edges
            // This makes thin handwriting more visible to OCR
            if (strokeWidth > 1.0 && edgePixels > 0) {
              const dilationSize = Math.round(strokeWidth);

              // Create a copy for dilation
              const dilatedData = new Uint8ClampedArray(tempData2.length);
              for (let i = 0; i < tempData2.length; i++) {
                dilatedData[i] = tempData2[i];
              }

              // Apply dilation to enhance stroke width
              for (let y = dilationSize; y < canvas.height - dilationSize; y++) {
                for (let x = dilationSize; x < canvas.width - dilationSize; x++) {
                  const idx = (y * canvas.width + x) * 4;

                  // Check if any pixel in neighborhood is an edge
                  let hasEdge = false;

                  for (let dy = -dilationSize; dy <= dilationSize && !hasEdge; dy++) {
                    for (let dx = -dilationSize; dx <= dilationSize && !hasEdge; dx++) {
                      const nIdx = ((y+dy) * canvas.width + (x+dx)) * 4;
                      if (tempData2[nIdx] === 0) { // If edge pixel found
                        hasEdge = true;
                      }
                    }
                  }

                  // If edge found in neighborhood, make this pixel an edge too
                  if (hasEdge) {
                    dilatedData[idx] = dilatedData[idx+1] = dilatedData[idx+2] = 0;
                  }
                }
              }

              // Copy dilated data back
              for (let i = 0; i < tempData2.length; i++) {
                tempData2[i] = dilatedData[i];
              }
            }

            // Step 7: Apply adaptive thresholding for final handwriting enhancement
            // Determine optimal block size based on image characteristics
            let blockSize = 25; // Default larger block size for handwritten text
            let threshold = 8;  // Default threshold value

            // Adjust parameters based on handwriting type and image content
            if (isHandwritten) {
              // Enhanced parameters specifically for student handwritten answers
              if (darkRatio > 0.4 || lightRatio > 0.7) {
                blockSize = 35; // Even larger block size for extreme contrast images
                threshold = 10; // Higher threshold for extreme contrast
              } else if (edgePixels / (data.length / 4) < 0.05) {
                blockSize = 13; // Smaller block size for sparse handwriting
                threshold = 6;  // Lower threshold to catch more details in sparse handwriting
              } else {
                blockSize = 21; // Moderate block size for typical handwriting
                threshold = 7;  // Slightly lower threshold for better detail capture
              }
            } else {
              // Standard parameters for other handwritten content
              if (darkRatio > 0.4 || lightRatio > 0.7) {
                blockSize = 35; // Even larger block size for extreme contrast images
              } else if (edgePixels / (data.length / 4) < 0.05) {
                blockSize = 15; // Smaller block size for sparse handwriting
              }
              // Use a lower threshold for handwritten text to capture more details
              threshold = 8;
            }

            // Apply adaptive thresholding to the original grayscale image
            for (let y = 0; y < canvas.height; y++) {
              for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;

                // Calculate local mean (average of surrounding pixels)
                let sum = 0;
                let count = 0;

                // Define the local neighborhood
                const startY = Math.max(0, y - Math.floor(blockSize/2));
                const endY = Math.min(canvas.height - 1, y + Math.floor(blockSize/2));
                const startX = Math.max(0, x - Math.floor(blockSize/2));
                const endX = Math.min(canvas.width - 1, x + Math.floor(blockSize/2));

                // Calculate mean of the local neighborhood
                for (let ny = startY; ny <= endY; ny++) {
                  for (let nx = startX; nx <= endX; nx++) {
                    const nIdx = (ny * canvas.width + nx) * 4;
                    sum += tempData1[nIdx];
                    count++;
                  }
                }

                const mean = sum / count;

                // Apply threshold: if pixel is threshold value less than mean, it's considered foreground (text)
                if (tempData1[idx] < mean - threshold) {
                  tempData3[idx] = tempData3[idx + 1] = tempData3[idx + 2] = 0; // Black (text)
                } else {
                  tempData3[idx] = tempData3[idx + 1] = tempData3[idx + 2] = 255; // White (background)
                }

                // If this pixel was identified as an edge in the edge detection step,
                // make it black (text) regardless of thresholding result
                if (tempData2[idx] === 0) {
                  tempData3[idx] = tempData3[idx + 1] = tempData3[idx + 2] = 0; // Black (text)
                }
              }
            }

            // Step 8: Final noise removal for handwritten text
            // Remove isolated pixels that are likely noise
            for (let y = 1; y < canvas.height - 1; y++) {
              for (let x = 1; x < canvas.width - 1; x++) {
                const idx = (y * canvas.width + x) * 4;

                // Only process black pixels (text)
                if (tempData3[idx] === 0) {
                  // Count black neighbors
                  let blackNeighbors = 0;

                  for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                      if (dx === 0 && dy === 0) continue; // Skip center pixel

                      const nIdx = ((y+dy) * canvas.width + (x+dx)) * 4;
                      if (tempData3[nIdx] === 0) { // If neighbor is black
                        blackNeighbors++;
                      }
                    }
                  }

                  // Adjust noise removal threshold based on handwriting type
                  let noiseThreshold = 2; // Default threshold (less than 2 neighbors = noise)

                  if (isHandwritten) {
                    // For student handwritten answers, be more conservative with noise removal
                    // to preserve more of the handwriting details
                    noiseThreshold = 1; // Only remove completely isolated pixels

                    // For very sparse handwriting, be even more conservative
                    if (edgePixels / (data.length / 4) < 0.03) {
                      // Check a wider neighborhood before removing
                      if (blackNeighbors === 0) {
                        // For completely isolated pixels, check a wider area (5x5)
                        for (let dy2 = -2; dy2 <= 2 && blackNeighbors === 0; dy2++) {
                          for (let dx2 = -2; dx2 <= 2 && blackNeighbors === 0; dx2++) {
                            // Skip the already checked 3x3 area
                            if (Math.abs(dx2) <= 1 && Math.abs(dy2) <= 1) continue;

                            const nIdx2 = ((y+dy2) * canvas.width + (x+dx2)) * 4;
                            if (nIdx2 >= 0 && nIdx2 < tempData3.length && tempData3[nIdx2] === 0) {
                              // Found a black pixel in the wider neighborhood
                              blackNeighbors = 1; // Just enough to keep this pixel
                            }
                          }
                        }
                      }
                    }
                  }

                  // If isolated (less than threshold black neighbors), consider it noise and remove
                  if (blackNeighbors < noiseThreshold) {
                    tempData3[idx] = tempData3[idx+1] = tempData3[idx+2] = 255; // White (background)
                  }
                }
              }
            }

            // Copy the final enhanced handwriting data back to the original array
            for (let i = 0; i < data.length; i++) {
              if (i % 4 !== 3) { // Skip alpha channel
                data[i] = tempData3[i];
              }
            }
          }

          // Put the enhanced image data back on the canvas
          ctx.putImageData(imageData, 0, 0);

          // Convert the canvas to a data URL with appropriate quality
          // Use higher quality for handwritten text to preserve more details
          let quality = 0.98; // Default quality

          if (isHandwritten) {
            quality = 0.99; // Highest quality for handwritten text
          } else if (isQuestionPaper) {
            quality = 0.99; // High quality for question papers
          } else if (isMCQOptions) {
            quality = 0.99; // High quality for MCQ options
          }

          const enhancedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(enhancedDataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load deskewed image'));
      };

      // Set the source to the deskewed image
      img.src = deskewedImageUrl;
    });
  } catch (error) {
    console.error('Error during image deskewing:', error);

    // Fall back to regular enhancement without deskewing
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          // Create a canvas to draw the enhanced image
          const canvas = document.createElement('canvas');

          // Ensure the image is not too large or too small for optimal OCR
          let width = img.width;
          let height = img.height;

          // Resize if necessary for better OCR results
          const maxDimension = 3000; // Maximum dimension for optimal OCR
          const minDimension = 800;  // Minimum dimension for optimal OCR

          if (Math.max(width, height) > maxDimension) {
            // Scale down if too large
            const scaleFactor = maxDimension / Math.max(width, height);
            width = Math.round(width * scaleFactor);
            height = Math.round(height * scaleFactor);
          } else if (Math.max(width, height) < minDimension) {
            // Scale up if too small
            const scaleFactor = minDimension / Math.max(width, height);
            width = Math.round(width * scaleFactor);
            height = Math.round(height * scaleFactor);
          }

          canvas.width = width;
          canvas.height = height;

          // Draw the image on the canvas with proper scaling
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Use high-quality image scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Get the image data for enhancement
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Apply enhanced fallback mode with better parameters
          // This is a simplified version of the full enhancement but with better parameters

          // Apply contrast enhancement and convert to grayscale
          const data = imageData.data;

          // Analyze image characteristics for better parameter selection
          let totalBrightness = 0;
          let darkPixels = 0;
          let lightPixels = 0;

          // First pass to calculate brightness statistics
          for (let i = 0; i < data.length; i += 4) {
            const pixelBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            totalBrightness += pixelBrightness;

            if (pixelBrightness < 50) darkPixels++;
            if (pixelBrightness > 200) lightPixels++;
          }

          const avgBrightness = totalBrightness / (data.length / 4);

          // Select optimal parameters based on image characteristics and document type
          let contrast: number, brightness: number;

          if (isHandwritten) {
            // Enhanced parameters for handwritten text with better recognition
            if (avgBrightness < 100) {
              // Dark image with handwriting
              contrast = 3.0;
              brightness = 60; // Increased brightness for better visibility
            } else if (avgBrightness > 200) {
              // Light image with handwriting
              contrast = 3.5;
              brightness = 8; // Slightly increased brightness for light images
            } else {
              // Balanced image with handwriting
              contrast = 2.8;
              brightness = 35; // Increased brightness for better visibility
            }
          } else if (isQuestionPaper) {
            // Parameters for printed question papers
            if (avgBrightness < 100) {
              // Dark image
              contrast = 3.0;
              brightness = 35;
            } else if (avgBrightness > 200) {
              // Light image
              contrast = 3.5;
              brightness = 5;
            } else {
              // Balanced image
              contrast = 2.8;
              brightness = 20;
            }
          } else if (isMCQOptions) {
            // Parameters for MCQ options
            if (avgBrightness < 100) {
              // Dark image
              contrast = 3.5;
              brightness = 40;
            } else if (avgBrightness > 200) {
              // Light image
              contrast = 4.0;
              brightness = 10;
            } else {
              // Balanced image
              contrast = 3.2;
              brightness = 25;
            }
          } else {
            // Default parameters
            contrast = 2.5;
            brightness = 20;
          }

          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

          // Create a temporary array for adaptive thresholding
          const tempData = new Uint8ClampedArray(data.length);

          // First pass: Apply contrast enhancement and convert to grayscale
          for (let i = 0; i < data.length; i += 4) {
            // Apply contrast to RGB channels
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128 + brightness)); // Red
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128 + brightness)); // Green
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128 + brightness)); // Blue

            // Convert to grayscale with appropriate weights based on document type
            let avg: number;
            if (isHandwritten) {
              // For handwriting, give more weight to blue channel which often contains more detail
              avg = (data[i] * 0.25 + data[i + 1] * 0.35 + data[i + 2] * 0.4);
            } else {
              // Standard grayscale conversion for printed text
              avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            }

            data[i] = data[i + 1] = data[i + 2] = avg;
            tempData[i] = tempData[i+1] = tempData[i+2] = avg;
            tempData[i+3] = data[i+3]; // Copy alpha
          }

          // For handwritten text, apply enhanced adaptive thresholding
          if (isHandwritten) {
            // Determine optimal block size based on image characteristics
            let blockSize = 15; // Default block size
            let threshold = 7;  // Default threshold value

            // Adjust parameters based on image brightness
            if (avgBrightness < 100) {
              // For dark images, use larger block size and higher threshold
              blockSize = 21;
              threshold = 9;
            } else if (avgBrightness > 200) {
              // For light images, use smaller block size and lower threshold
              blockSize = 11;
              threshold = 5;
            } else {
              // For balanced images, use moderate parameters
              blockSize = 15;
              threshold = 7;
            }

            // Apply adaptive thresholding
            for (let y = 0; y < canvas.height; y++) {
              for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;

                // Calculate local mean (average of surrounding pixels)
                let sum = 0;
                let count = 0;

                // Define the local neighborhood
                const startY = Math.max(0, y - Math.floor(blockSize/2));
                const endY = Math.min(canvas.height - 1, y + Math.floor(blockSize/2));
                const startX = Math.max(0, x - Math.floor(blockSize/2));
                const endX = Math.min(canvas.width - 1, x + Math.floor(blockSize/2));

                // Calculate mean of the local neighborhood
                for (let ny = startY; ny <= endY; ny++) {
                  for (let nx = startX; nx <= endX; nx++) {
                    const nIdx = (ny * canvas.width + nx) * 4;
                    sum += tempData[nIdx];
                    count++;
                  }
                }

                const mean = sum / count;

                // Apply threshold: if pixel is threshold value less than mean, it's considered foreground (text)
                if (tempData[idx] < mean - threshold) {
                  data[idx] = data[idx + 1] = data[idx + 2] = 0; // Black (text)
                } else {
                  data[idx] = data[idx + 1] = data[idx + 2] = 255; // White (background)
                }
              }
            }
          }

          // Put the enhanced image data back on the canvas
          ctx.putImageData(imageData, 0, 0);

          // Return the enhanced image with appropriate quality
          // Use higher quality for handwritten text to preserve more details
          let quality = 0.98; // Default quality

          if (isHandwritten) {
            quality = 0.99; // Highest quality for handwritten text
          } else if (isQuestionPaper) {
            quality = 0.99; // High quality for question papers
          } else if (isMCQOptions) {
            quality = 0.99; // High quality for MCQ options
          }

          const enhancedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(enhancedDataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Set the source to the original image
      img.src = imageUrl;
    });
  }
};
