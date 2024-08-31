import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthMiddleware } from './auth/auth.middleware';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { ChatGateway } from './chat/chat.gateway';
import { ChatModule } from './chat/chat.module';
import { ContactsController } from './contacts/contacts.controller';
import { ContactsModule } from './contacts/contacts.module';
import { ContactsService } from './contacts/contacts.service';
import { JwtModule } from './jwt/jwt.module';
import { JwtService } from './jwt/jwt.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule, ChatModule, JwtModule, ContactsModule],
  controllers: [AppController],
  providers: [
    AppService,
    AuthService,
    ChatGateway,
    JwtService,
    ContactsService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('/auth/me', ContactsController);
  }
}
