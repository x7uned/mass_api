import { Module } from '@nestjs/common';
import { JwtModule } from 'src/jwt/jwt.module';
import { JwtService } from 'src/jwt/jwt.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [JwtModule],
  providers: [ChatGateway, PrismaService, JwtService],
})
export class ChatModule {}
