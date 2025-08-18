import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

type ExpectedValues = 'string' | 'number' | 'boolean';

type ParseAnythingPipeOptions<T> = {
  expectedValue?: ExpectedValues;
  expectedEnum?: T[];
  optional?: boolean;
};

/**
 * `ParseAnythingPipe` parses any given value in string form
 *
 * - Numeric Strings -> integers/floats
 * - Booleans -> true/false
 * - "undefined" -> undefined
 * - "null" -> null
 * - Remaining -> string
 *
 * @param {string} expectedEnum - pass the expectedEnum & it'll check if the value is one of them. It'll not check the expectedValue param if expectedEnum is provided
 * @param {string} expectedValue - you can pass the expected value & if the value
 * type isn't received, it can either throw or return undefined depending on `optional` param
 * @param {boolean} optional - set to true will not throw a BadRequestException on expected value mismatch. default `false`
 */
export class ParseAnythingPipe<T extends string>
  implements PipeTransform<string, number | string | boolean | null | undefined>
{
  private readonly expectedValue?: ExpectedValues;
  private readonly expectedEnum: T[];
  private readonly optional: boolean = false;

  constructor(params?: ParseAnythingPipeOptions<T>) {
    if (params) {
      this.expectedValue = params.expectedValue;
      this.expectedEnum = params.expectedEnum || [];
      this.optional = !!params.optional;
    }
  }

  transform(
    value: string,
    metadata: ArgumentMetadata,
  ): number | string | boolean | null | undefined {
    // Convert to string if not already
    const stringValue = String(value);

    // Parse based on content
    const parsedValue = this.parseValue(stringValue);
    // Validate againts the enum values if provided
    if (this.expectedEnum.length) {
      if (!this.expectedEnum.includes(parsedValue as any)) {
        if (!this.optional) {
          throw new BadRequestException(
            `Expected one '${this.expectedEnum.join("', '")}' for '${metadata.data}' but received ${value}`,
          );
        }
        return undefined;
      }
    } // Validate against expected type if specified
    else if (this.expectedValue && this.expectedValue !== 'string') {
      const actualType = typeof parsedValue;
      if (actualType !== this.expectedValue) {
        if (!this.optional) {
          throw new BadRequestException(
            `Expected ${this.expectedValue} for '${metadata.data}' but received ${actualType}`,
          );
        }
        return undefined;
      }
    }

    return parsedValue;
  }

  private parseValue(
    value: string,
  ): number | string | boolean | null | undefined {
    // Handle special string values
    if (value === 'undefined') return undefined;
    if (value === 'null') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Check if it's a numeric string
    const isNumeric = this.isNumericString(value);
    if (isNumeric) {
      const parsed = parseFloat(value);
      // Return integer if it's a whole number, otherwise float
      return Number.isInteger(parsed) ? parseInt(value, 10) : parsed;
    }

    // Return as string
    return value;
  }

  private isNumericString(value: string): boolean {
    if (value.trim() === '') return false;
    const num = Number(value);
    return !isNaN(num) && isFinite(num);
  }
}
