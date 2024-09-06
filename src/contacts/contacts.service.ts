import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Contact } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async getContact(userId: number) {
    try {
      const contacts = await this.prisma.user.findMany({
        where: { id: userId },
        select: { contacts: true },
        take: 12,
      });

      console.log(contacts);
      return { success: true, contacts };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Error find contacts');
    }
  }

  async getContactInfo(userId: number, contactId: number) {
    try {
      let contact: Contact;

      if (contactId === 0) {
        contact = await this.prisma.contact.findFirst({
          where: {
            ownerId: 1,
            members: { some: { id: userId } },
          },
          include: { members: true },
        });
      } else {
        contact = await this.prisma.contact.findUnique({
          where: { id: contactId },
          include: { members: true },
        });
      }

      return { success: true, contact };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Error find contacts');
    }
  }

  async addContact(userId: number, body: any) {
    try {
      const { contactIds } = body;

      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        throw new UnauthorizedException('Invalid contactIds');
      }

      // Включаем текущего пользователя в список участников
      const allParticipants = [...new Set([userId, ...contactIds])];

      // Проверяем, не существует ли уже контакт (группы или чата с таким участником)
      const existingContact = await this.prisma.contact.findFirst({
        where: {
          OR: [{ ownerId: userId }, { members: { some: { id: userId } } }],
        },
      });

      if (existingContact) {
        throw new UnauthorizedException('Contact already exists');
      }

      // Добавляем каждого участника в друзья, если его нет
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { friends: true },
      });

      for (const contactId of allParticipants) {
        if (!user.friends.includes(contactId)) {
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              friends: {
                push: contactId,
              },
            },
          });
        }

        const contactUser = await this.prisma.user.findUnique({
          where: { id: contactId },
          select: { friends: true },
        });

        if (contactUser && !contactUser.friends.includes(userId)) {
          await this.prisma.user.update({
            where: { id: contactId },
            data: {
              friends: {
                push: userId,
              },
            },
          });
        }
      }

      // Создаем контакт (группу) с указанными участниками
      const contact = await this.prisma.contact.create({
        data: {
          ownerId: userId,
          members: {
            connect: allParticipants.map((id: number) => ({ id })),
          },
        },
      });

      return { success: true, id: contact.id };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Error creating contact');
    }
  }
}
