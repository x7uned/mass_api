import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from 'src/jwt/jwt.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginUserDto, RegisterUserDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(registerUserDto: RegisterUserDto) {
    if (
      !registerUserDto.username ||
      !registerUserDto.email ||
      !registerUserDto.password
    ) {
      throw new BadRequestException(
        'Username, email, and password are required',
      );
    }

    const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...registerUserDto,
        status: 'default',
        password: hashedPassword,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Something went wrong');
    }

    delete user.password;

    const notes = await this.prisma.contact.create({
      data: {
        ownerId: 1,
        name: 'Notes',
        avatar:
          'https://i.pinimg.com/236x/46/56/5b/46565b2e707b945bda72a0a2b072f7b6.jpg',
        members: { connect: [{ id: user.id }, { id: 1 }] },
      },
    });

    if (!notes) {
      throw new UnauthorizedException('Something went wrong NOTES');
    }

    return { success: true, user };
  }

  async login(loginUserDto: LoginUserDto) {
    const { username, password } = loginUserDto;
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }
    const payload = { id: user.id };
    const token = await this.jwtService.signPayload(payload);

    delete user.password;

    return { success: true, access_token: token, user };
  }

  async findUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    delete user.password;

    return { success: true, user };
  }

  async searchByUsername(username: string) {
    if (username.length <= 2) {
      return { success: true, users: [] };
    }

    const users = await this.prisma.user.findMany({
      where: {
        username: {
          contains: username,
        },
      },
      select: {
        username: true,
        avatar: true,
        id: true,
        isOnline: true,
      },
      take: 6,
    });

    return { users, success: true };
  }
}
