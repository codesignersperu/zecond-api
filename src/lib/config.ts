import { generateRandomHex } from 'src/lib/utils';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';

export function multerOptions({
  destination,
}: {
  destination: string;
}): MulterOptions {
  return {
    storage: diskStorage({
      destination,
      filename: (req, file, cb) => {
        cb(
          null,
          generateRandomHex(32) + '.' + file.originalname.split('.').pop(),
        );
      },
    }),
  };
}
