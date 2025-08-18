import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiResponse } from 'src/lib/types';
import { ApiStatus } from 'src/lib/enums';
import { POSTAL_ADDRESS_DATA, ADDRESS_DATA } from 'src/lib/assets';

@Injectable()
export class AddressService {
  async postcode(code: string): ApiResponse<string[]> {
    let data = [];
    if (code in POSTAL_ADDRESS_DATA) {
      data = POSTAL_ADDRESS_DATA[code];
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Postal data retrieved successfully',
      data: data,
    };
  }

  async states(): ApiResponse<string[]> {
    const states = Object.keys(ADDRESS_DATA.Estados);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'States retrieved successfully',
      data: states,
    };
  }

  async municipalities(state: string): ApiResponse<string[]> {
    let municipalities: string[] = [];

    if (state in ADDRESS_DATA.Estados) {
      municipalities = Object.keys(ADDRESS_DATA.Estados[state].Municipios);
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: `Municipalities for ${state} retrieved successfully`,
      data: municipalities,
    };
  }

  async cities(state: string, municipality: string): ApiResponse<string[]> {
    let cities: string[] = [];

    if (state in ADDRESS_DATA.Estados) {
      let municipalities = ADDRESS_DATA.Estados[state].Municipios;

      if (municipality in municipalities) {
        cities = Object.keys(municipalities[municipality].Ciudades);
      }
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: `Cities for ${municipality}, ${state} retrieved successfully`,
      data: cities,
    };
  }

  async neighborhoods(
    state: string,
    municipality: string,
    city: string,
  ): ApiResponse<string[]> {
    let neighborhoods: string[] = [];

    if (state in ADDRESS_DATA.Estados) {
      let municipalities = ADDRESS_DATA.Estados[state].Municipios;

      if (municipality in municipalities) {
        let cities = municipalities[municipality].Ciudades;

        if (city in cities) {
          neighborhoods = cities[city].Colonias;
        }
      }
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: `Neighborhoods for ${city}, ${municipality}, ${state} retrieved successfully`,
      data: neighborhoods,
    };
  }
}
