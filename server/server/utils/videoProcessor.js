import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

/**
 * Convert video to MP4 format using FFmpeg
 * @param {string} inputPath - Path to input video file
 * @param {string} outputPath - Path for output MP4 file
 * @returns {Promise<string>} - Promise that resolves with output file path
 */
export const convertVideoToMp4 = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .format('mp4')
      .videoBitrate('1500k')
      .maxBitrate('2000k')
      .bufsize('3000k')
      .audioBitrate('128k')
      .audioChannels(2)
      .outputOptions([
        `-crf ${28}`,
        `-preset ${'slow'}`,
        `-movflags +faststart`, // For streaming
        `-g ${30 * 2}`, // GOP size
        `-keyint_min ${30 * 2}`,
        `-vf scale=${'1280x720'}`, // Resize
        `-r ${30}` // Frame rate
      ])
      .on('start', (commandLine) => {
        console.log('FFmpeg process started:', commandLine);
      })
      .on('progress', (progress) => {
        console.log('Processing: ' + progress.percent + '% done');
      })
      .on('end', () => {
        console.log('Video conversion completed');
        // Clean up original file
        try {
          if (fs.existsSync(inputPath) && inputPath !== outputPath) {
            fs.unlinkSync(inputPath);
          }
        } catch (cleanupError) {
          console.warn('Could not clean up input file:', cleanupError.message);
        }
        resolve(outputPath);
      })
      .on('error', (error) => {
        console.error('FFmpeg error:', error);
        // Clean up output file if it exists
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        } catch (cleanupError) {
          console.warn('Could not clean up output file:', cleanupError.message);
        }
        reject(error);
      })
      .run();
  });
};

/**
 * Fallback video processing when FFmpeg is not available
 * Simply renames the file to .mp4 extension
 * @param {string} inputPath - Path to input video file
 * @param {string} outputPath - Path for output file
 * @returns {Promise<string>} - Promise that resolves with output file path
 */
export const fallbackVideoProcessing = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Simply rename/move the file
      fs.renameSync(inputPath, outputPath);
      console.log('Video file renamed to MP4 (fallback processing)');
      resolve(outputPath);
    } catch (error) {
      console.error('Fallback video processing error:', error);
      reject(error);
    }
  });
};

/**
 * Get video metadata
 * @param {string} videoPath - Path to video file
 * @returns {Promise} - Promise that resolves with video metadata
 */
export const getVideoMetadata = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (error, metadata) => {
      if (error) {
        reject(error);
      } else {
        resolve(metadata);
      }
    });
  });
};

/**
 * Check if FFmpeg is available
 * @returns {Promise<boolean>} - Promise that resolves to true if FFmpeg is available
 */
export const checkFFmpegAvailability = () => {
  return new Promise((resolve) => {
    try {
      const command = ffmpeg();
      
      // Set a timeout to avoid hanging
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);
      
      command
        .on('error', (error) => {
          clearTimeout(timeout);
          console.log('FFmpeg not available:', error.message);
          resolve(false);
        })
        .on('start', () => {
          clearTimeout(timeout);
          resolve(true);
        })
        .input('dummy')
        .format('null')
        .run();
    } catch (error) {
      console.log('FFmpeg check failed:', error.message);
      resolve(false);
    }
  });
};