import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { File } from 'node:buffer';
import { OpenAI } from 'openai';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export interface VideoTranscript {
  transcript: string;
}

async function convertVideoToWav(videoPath: string): Promise<string> {
  const outputFile = path.join(path.dirname(videoPath), `${randomUUID()}.wav`);
  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions('-ac', '1')
      .toFormat('wav')
      .on('end', () => resolve())
      .on('error', reject)
      .save(outputFile);
  });
  return outputFile;
}

async function transcribeWithWhisper(wavPath: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for transcription');
  }
  const client = new OpenAI({ apiKey });
  const fileBuffer = await fs.readFile(wavPath);
  const file = new File([fileBuffer], 'audio.wav', { type: 'audio/wav' });
  const result = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1'
  });
  return result.text;
}

export async function transcribeVideo(videoPath: string): Promise<VideoTranscript> {
  const wavPath = await convertVideoToWav(videoPath);
  try {
    const transcript = await transcribeWithWhisper(wavPath);
    return { transcript };
  } finally {
    try {
      await fs.unlink(wavPath);
    } catch {
      // ignore cleanup errors
    }
  }
}
