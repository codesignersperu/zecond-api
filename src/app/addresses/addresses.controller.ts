import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  HttpCode,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards';
import { AddressesService } from './addresses.service';
import {
  CreateAddressDto,
  CreateAddressOpenAPI,
  GetAddressesQueryDTO,
  UpdateAddressDto,
  UpdateAddressOpenAPI,
} from './DTOs';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { ActiveUserOnly, User } from 'src/auth/decorators';

@Controller('addresses')
@UseGuards(AuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ActiveUserOnly()
  @ApiOperation({
    summary: 'Lets users add new address',
  })
  @ApiBody({
    schema: CreateAddressOpenAPI,
  })
  create(
    @User('id') userId: string,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    return this.addressesService.create(+userId, createAddressDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Returns all addresses of a user',
  })
  findAll(@User('id') userId: string, @Query() query: GetAddressesQueryDTO) {
    return this.addressesService.findAll(+userId, query.id, query.primary);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Returns one address of a user',
  })
  findOne(@User('id') userId: string, @Param('id', ParseIntPipe) id: number) {
    return this.addressesService.findOne(+userId, id);
  }

  @Get('primary')
  @ApiOperation({
    summary: 'Returns primary address of a user',
  })
  findPrimary(@User('id') userId: string) {
    return this.addressesService.findPrimary(+userId);
  }

  @Patch()
  @HttpCode(200)
  @ActiveUserOnly()
  @ApiOperation({
    summary: 'Lets users update an address',
  })
  @ApiBody({
    schema: UpdateAddressOpenAPI,
  })
  update(
    @User('id') userId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressesService.update(+userId, updateAddressDto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ActiveUserOnly()
  @ApiOperation({
    summary: 'Lets users delete an address',
  })
  delete(@User('id') userId: string, @Param('id', ParseIntPipe) id: number) {
    return this.addressesService.delete(+userId, id);
  }
}
