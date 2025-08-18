import * as heifConvert from 'heic-convert';
import * as fs from 'fs/promises';

export async function convertHeicToJpeg(path: string): Promise<string> {
  const inputBuffer = await fs.readFile(path);
  const outputUrl = path.split('.')[0] + '.jpg';
  const outputBuffer = await heifConvert({
    buffer: inputBuffer as any,
    format: 'JPEG',
    quality: 0.75,
  });
  // @ts-ignore
  await fs.writeFile(outputUrl, outputBuffer);
  return outputUrl;
}
