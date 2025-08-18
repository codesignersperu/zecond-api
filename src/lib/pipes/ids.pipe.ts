import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

/**
 * Configuration options for the IdsPipe.
 */
type IdsPipeOptions = {
  /** Whether the pipe should allow undefined/empty values without throwing an exception */
  optional?: boolean;
};

/**
 * A NestJS pipe that transforms comma-separated string values into an array of numbers.
 *
 * This pipe is useful for parsing query parameters or route parameters that contain
 * multiple IDs in a comma-separated format (e.g., "1,2,3,4").
 *
 * @example
 * ```
 * // In a controller
 * @Get('users')
 * getUsers(@Query('ids', new IdsPipe()) ids: number[]) {
 *   return this.userService.findByIds(ids);
 * }
 *
 * // With optional parameter
 * @Get('users')
 * getUsers(@Query('ids', new IdsPipe({ optional: true })) ids?: number[]) {
 *   return ids ? this.userService.findByIds(ids) : this.userService.findAll();
 * }
 * ```
 */
export class IdsPipe implements PipeTransform<string, number[] | undefined> {
  private readonly optional: boolean = false;

  /**
   * Creates a new instance of IdsPipe.
   *
   * @param params - Configuration options for the pipe
   * @param params.optional - If true, allows undefined/empty values without throwing exceptions
   */
  constructor(params?: IdsPipeOptions) {
    if (params) {
      this.optional = !!params.optional;
    }
  }

  transform(value: string, metadata: ArgumentMetadata): number[] | undefined {
    if (!value) {
      if (!this.optional) this.throwException(metadata.data);
      return undefined;
    }

    const arr = value.split(',');
    const res: number[] = [];

    for (let v of arr) {
      const isNumeric =
        ['string', 'number'].includes(typeof v) &&
        !isNaN(parseFloat(v)) &&
        isFinite(Number(v));

      if (isNumeric) {
        res.push(parseInt(v, 10));
      }
    }

    if (!res.length) {
      if (!this.optional) this.throwException(metadata.data);
      return undefined;
    }
    return res;
  }

  throwException(key: any) {
    throw new BadRequestException(
      'Please provide comma separated ids in string format for ' + key,
    );
  }
}
