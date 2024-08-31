import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  controllers: [ContactsController],
  providers: [PrismaService, ContactsService],
})
export class ContactsModule {}
