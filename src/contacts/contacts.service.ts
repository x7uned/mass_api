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

      const allParticipants = [...new Set([userId, ...contactIds])];

      for (const contact of allParticipants) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { friends: true },
        });
        console.log('sos1', contact);
        const contactId = contact;

        // Если контакт не находится в друзьях пользователя, добавляем его
        if (!user.friends.includes(contactId)) {
          user.friends.push(contactId); // Добавляем контакт в массив friends
          console.log('sos2', contactId);

          // Обновляем массив друзей
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              friends: user.friends, // Перезаписываем весь массив
            },
          });
        }

        // Получаем контактного пользователя
        const contactUser = await this.prisma.user.findUnique({
          where: { id: contactId },
          select: { friends: true },
        });

        // Если пользователя нет в друзьях контакта, добавляем
        if (contactUser && !contactUser.friends.includes(userId)) {
          contactUser.friends.push(userId); // Добавляем пользователя в массив друзей контакта

          // Обновляем массив друзей контактного пользователя
          await this.prisma.user.update({
            where: { id: contactId },
            data: {
              friends: contactUser.friends, // Перезаписываем весь массив
            },
          });
        }
      }

      // Создаем новый контакт (группу)
      const contact = await this.prisma.contact.create({
        data: {
          ownerId: userId,
          avatar: 'https://ui-avatars.com/api/?name=NewChat',
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
