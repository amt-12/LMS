#!/usr/bin/env node
/**
 * resyncRecording.js
 * 
 * Re-syncs a Zoom recording that suffers from Variable Frame Rate (VFR) audio/video drift.
 * Transcodes the video to Constant Frame Rate (CFR 30fps) with audio timestamp resynchronization.
 * 
 * Usage:
 *   node scripts/resyncRecording.js <input_file_path> <output_name_or_key>
 * 
 * Example:
 *   node scripts/resyncRecording.js ./raw_lecture.mp4 lecture_7
 * 
 * The output will be saved into LMS-backend/fixed_recordings/<output_name_or_key>.mp4
 * and automatically registered in LMS-backend/fixed_recordings/map.json.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputKey = process.argv[3];

if (!inputPath || !outputKey) {
  console.log('Usage: node scripts/resyncRecording.js <input_video_path> <key_or_filename_in_fixed_recordings>');
  console.log('Example: node scripts/resyncRecording.js ~/Downloads/meeting123.mp4 my_lecture_sync');
  process.exit(1);
}

const resolvedInput = path.resolve(inputPath);
if (!fs.existsSync(resolvedInput)) {
  console.error(`[Error] Input file not found: ${resolvedInput}`);
  process.exit(1);
}

const fixedRecordingsDir = path.join(__dirname, '../fixed_recordings');
if (!fs.existsSync(fixedRecordingsDir)) {
  fs.mkdirSync(fixedRecordingsDir, { recursive: true });
}

const cleanKey = outputKey.replace(/\.mp4$/i, '');
const outputFileName = `${cleanKey}.mp4`;
const outputPath = path.join(fixedRecordingsDir, outputFileName);

console.log(`[Re-sync] Starting CFR transcode for: ${resolvedInput}`);
console.log(`[Re-sync] Destination: ${outputPath}`);

// ffmpeg command to enforce CFR 30fps and align audio timestamps:
// -vf "fps=30" -> Enforce 30 constant frames per second
// -vsync cfr   -> Duplicate or drop frames to maintain exact frame timing
// -async 1     -> Align audio stream to start time of video
// -c:v libx264 -preset fast -crf 22 -> High quality H.264
// -c:a aac -b:a 128k -ar 48000 -> 48kHz AAC audio
// -movflags +faststart -> Move moov atom to start for web streaming
const ffmpegArgs = [
  '-y',
  '-i', resolvedInput,
  '-vf', 'fps=30',
  '-vsync', 'cfr',
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '22',
  '-c:a', 'aac',
  '-b:a', '128k',
  '-ar', '48000',
  '-async', '1',
  '-movflags', '+faststart',
  outputPath
];

const result = spawnSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' });

if (result.status !== 0) {
  console.error(`[Error] ffmpeg failed with code ${result.status}`);
  process.exit(result.status || 1);
}

console.log(`[Success] Video successfully re-synced: ${outputPath}`);

// Update map.json so proxy serves this fixed recording
const mapFilePath = path.join(fixedRecordingsDir, 'map.json');
let currentMap = {};
if (fs.existsSync(mapFilePath)) {
  try {
    currentMap = JSON.parse(fs.readFileSync(mapFilePath, 'utf8'));
  } catch (e) {
    currentMap = {};
  }
}

currentMap[cleanKey] = outputFileName;
fs.writeFileSync(mapFilePath, JSON.stringify(currentMap, null, 2), 'utf8');

console.log(`[Success] Registered in fixed_recordings/map.json under key: "${cleanKey}"`);

