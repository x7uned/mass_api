import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { LoginUserDto, RegisterUserDto } from './auth.dto';
import { AuthService } from './auth.service';

export interface QueryFindUser {
  id: string;
}

export interface QueryFindUsers {
  username: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.registerUser(registerUserDto);
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Get('me')
  async me(@Req() req: Request) {
    const userId = req['user'].id;
    return this.authService.findUser(userId);
  }

  @Get('friends')
  async friends(@Req() req: Request) {
    const userId = req['user'].id;
    return this.authService.getFriends(userId);
  }

  @Get('many')
  async findMany(@Query() query: QueryFindUsers) {
    const username = query.username;
    return this.authService.searchByUsername(username);
  }

  @Get('find')
  async findUser(@Query() query: QueryFindUser) {
    const userId = Number(query.id);
    return this.authService.findUser(userId);
  }
}
