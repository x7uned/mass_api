import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async getContact(userId: number) {
    try {
      const contacts = await this.prisma.contact.findMany({
        where: {
          OR: [{ userId }, { contactId: userId }],
        },
        take: 12,
      });

      const contactResults = await Promise.all(
        contacts.map(async (contact) => {
          const user = await this.prisma.user.findUnique({
            where: {
              id:
                contact.userId === userId ? contact.contactId : contact.userId,
            },
          });

          if (user) {
            delete user.password;
          }

          return {
            user,
            ...contact,
            contactId:
              contact.userId === userId ? contact.contactId : contact.userId,
          };
        }),
      );

      return { success: true, contactResults };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Error find contacts');
    }
  }

  async getContactInfo(userId: number, contactId: number) {
    try {
      const contact = await this.prisma.contact.findUnique({
        where: {
          id: contactId,
        },
      });

      const user = await this.prisma.user.findUnique({
        where: {
          id: contact.userId === userId ? contact.contactId : contact.userId,
        },
      });

      if (user) {
        delete user.password;
      } else {
        throw new UnauthorizedException('Error find user');
      }

      return { success: true, contact, user };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Error find contacts');
    }
  }

  async addContact(userId: number, body: any) {
    try {
      if (!body.contactId && body.contactId == userId) {
        throw new UnauthorizedException('Invalid contactId');
      }

      const existingContact = await this.prisma.contact.findFirst({
        where: {
          OR: [
            { userId, contactId: body.contactId },
            { userId: body.contactId, contactId: userId },
          ],
        },
      });

      if (existingContact) {
        throw new UnauthorizedException('Contact already exists');
      }

      const contact = await this.prisma.contact.create({
        data: {
          userId: userId,
          contactId: body.contactId,
        },
      });

      return { success: true, id: contact.id };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Error creating contact');
    }
  }
}
