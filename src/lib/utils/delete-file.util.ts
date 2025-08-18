import * as fs from 'fs/promises';

export async function deleteFile(filePath: string): Promise<void> {
  try {
    const pathExists = await fs.stat(filePath);
    if (pathExists) {
      await fs.unlink(filePath);
    }
  } catch (error) {
    // TODO: Log the error
  }
}
