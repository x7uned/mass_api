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

  async createContact(userId: number, body: any) {
    try {
      const { contactId } = body;

      const existingContact = await this.prisma.contact.findFirst({
        where: {
          AND: [
            { members: { some: { id: userId } } },
            { members: { some: { id: contactId } } },
          ],
          members: {
            every: {
              id: { in: [userId, contactId] },
            },
          },
        },
      });

      if (existingContact) {
        throw new UnauthorizedException('Contact already exists');
      }

      // Получаем ники пользователей
      const user1 = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, friends: true },
      });
      const user2 = await this.prisma.user.findUnique({
        where: { id: contactId },
        select: { username: true, friends: true },
      });

      if (!user1 || !user2) {
        throw new UnauthorizedException('User not found');
      }

      const contactName = `${user1.username} & ${user2.username}`;

      // Обновляем массив друзей для обоих пользователей
      if (!user1.friends.includes(contactId)) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            friends: { push: contactId }, // Добавляем контакт в массив друзей user1
          },
        });
      }

      if (!user2.friends.includes(userId)) {
        await this.prisma.user.update({
          where: { id: contactId },
          data: {
            friends: { push: userId }, // Добавляем контакт в массив друзей user2
          },
        });
      }

      // Создаем новый контакт
      const contact = await this.prisma.contact.create({
        data: {
          name: contactName,
          ownerId: userId,
          avatar: `https://ui-avatars.com/api/?background=random&length=3&name=${user1.username.slice(0, 1)}§${user2.username.slice(0, 1)}`,
          members: {
            connect: [{ id: userId }, { id: contactId }],
          },
        },
      });

      console.log(contact.avatar);

      return { success: true, contact };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Error creating contact');
    }
  }

  async createGroup(userId: number, body: any) {
    try {
      const { members, name, avatar } = body.params;

      console.log(body);

      if (!Array.isArray(members) || members.length === 0) {
        throw new UnauthorizedException('Invalid members');
      }

      const allParticipants = [...new Set([userId, ...members])];

      for (const contact of allParticipants) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { friends: true },
        });
        const contactId = contact;

        // Если контакт не находится в друзьях пользователя, добавляем его
        if (!user.friends.includes(contactId)) {
          user.friends.push(contactId); // Добавляем контакт в массив friends

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
          avatar: avatar
            ? avatar
            : `https://ui-avatars.com/api/?name=${name ? name : 'NC'}`,
          name: name ? name : 'New Chat',
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
