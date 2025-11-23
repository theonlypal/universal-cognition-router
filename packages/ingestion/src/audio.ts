import fs from 'node:fs/promises';
import { File } from 'node:buffer';
import { OpenAI } from 'openai';

export interface AudioTranscript {
  transcript: string;
}

export async function transcribeAudio(audioPath: string): Promise<AudioTranscript> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for transcription');
  }
  const client = new OpenAI({ apiKey });
  const buffer = await fs.readFile(audioPath);
  const file = new File([buffer], 'audio.wav', { type: 'audio/wav' });
  const result = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1'
  });
  return { transcript: result.text };
}
