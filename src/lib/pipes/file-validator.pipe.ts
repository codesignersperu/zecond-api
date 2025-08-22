import { HttpStatus, ParseFilePipeBuilder } from '@nestjs/common';
import 'dotenv/config';

/**
 * `FileValidatorPipe` function returns the nestjs ParseFilePipeBuilder instance with file validation options.
 * it validates the file type and size. Supported file types & max file size are from .env file.
 * @param {boolean} fileIsRequired - Indicates whether a file is required. Defaults to true.
 * @param {number} maxFileSize - Indicates the maximum allowed file size in bytes. Defaults to the value of MAX_FILE_SIZE from .env.
 * @returns {ParseFilePipeBuilder} - The ParseFilePipeBuilder instance with file validation options.
 */
export function FileValidatorPipe(
  fileIsRequired: boolean = true,
  maxFileSize: number = Number(process.env.MAX_FILE_SIZE),
) {
  const spf = process.env.SUPPORTED_FILE_TYPES;
  const fileTypeRegex = new RegExp(
    `^image\/(${spf ? spf.split(',').join('|') : 'png'})$`,
  );

  return new ParseFilePipeBuilder()
    .addFileTypeValidator({
      fileType: fileTypeRegex,
    })
    .addMaxSizeValidator({
      maxSize: maxFileSize * 1024 * 1024,
      message: `Individual File size must be less than ${maxFileSize} MB`,
    })
    .build({
      fileIsRequired,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
}
