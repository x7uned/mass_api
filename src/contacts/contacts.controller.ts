import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ContactsService } from './contacts.service';

interface GetInfoInterface {
  contactId: string;
}

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post('create')
  async create(@Body() body: any, @Req() req: Request) {
    const userId = Number(req['user'].id);
    return this.contactsService.createContact(userId, body);
  }

  @Post('group')
  async group(@Body() body: any, @Req() req: Request) {
    const userId = Number(req['user'].id);
    return this.contactsService.createGroup(userId, body);
  }

  @Get('getInfo')
  async getInfo(@Req() req: Request, @Query() query: GetInfoInterface) {
    const userId = Number(req['user'].id);
    const contactId = Number(query.contactId);
    return this.contactsService.getContactInfo(userId, contactId);
  }

  @Get('get')
  async get(@Req() req: Request) {
    const userId = Number(req['user'].id);
    return this.contactsService.getContact(userId);
  }
}
