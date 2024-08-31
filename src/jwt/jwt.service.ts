import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';

@Injectable()
export class JwtService {
  constructor(private readonly jwtService: NestJwtService) {}

  async signPayload(payload: any): Promise<string> {
    try {
      return this.jwtService.sign(payload);
    } catch (error) {
      console.error(error);
    }
  }

  async verifyToken(token: string): Promise<any> {
    return this.jwtService.verify(token);
  }
}
