import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['authorization'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clients = new Map<number, Socket>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async handleDisconnect(client: Socket) {
    const userId = client['userId'];
    if (userId) {
      console.log(userId, 'Disconnecting');
      this.clients.delete(userId);

      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastOnline: new Date() },
      });
    }
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.headers.authorization;
    console.log('Client connected:', client.id);

    if (!token) {
      console.log('No token provided, disconnecting client:', client.id);
      client.disconnect();
      return;
    }

    try {
      const actualToken = token.replace('Bearer ', '');
      const decoded = this.jwtService.verify(actualToken);
      const userId = decoded.id;

      client['userId'] = userId;

      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: true },
      });

      client.emit('contactStatus', { isOnline: true });

      this.clients.set(userId, client);
      console.log(
        `Client ${client.id} authenticated and added to map with userId: ${userId}`,
      );
    } catch (e) {
      console.error(
        'Error verifying token for client:',
        client.id,
        'Error:',
        e,
      );
      client.disconnect();
    }
  }

  @SubscribeMessage('getStatus')
  async handleGetUserStatus(client: Socket): Promise<void> {
    const userId = client['userId'];

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error('User not found:', user);
      return;
    }

    const statuses = [];

    user.friends.forEach((id) => {
      const friendSocket = this.clients.get(id);
      if (friendSocket) {
        statuses.push(id);
      }
    });

    client.emit('userStatuses', statuses);
  }

  @SubscribeMessage('message')
  async handleMessage(
    client: Socket,
    obj: { contactId: number; content: string },
  ): Promise<void> {
    const ownerId = client['userId'];
    const contactId = obj.contactId;

    if (!ownerId || contactId == undefined) {
      console.log('No ownerId or contactId, disconnecting client');
      client.disconnect();
      return;
    }

    let contact;

    if (contactId === 0) {
      contact = await this.prisma.contact.findFirst({
        where: {
          ownerId: 1,
          members: { some: { id: ownerId } },
        },
        include: { members: true },
      });
    } else {
      contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        include: { members: true },
      });
    }

    if (!contact) {
      console.error('Contact not found:', contactId);
      return;
    }

    try {
      const message = await this.prisma.message.create({
        data: {
          content: obj.content,
          ownerId,
          contactId: contact.id,
        },
      });

      await this.prisma.contact.update({
        where: { id: contact.id },
        data: {
          messageCount: {
            increment: 1,
          },
          lastMessage: obj.content,
        },
      });

      console.log(message);

      for (let i = 0; i < contact.members.length; i++) {
        const receiverClient = this.clients.get(contact.members[i].id);
        if (receiverClient) {
          receiverClient.emit('message', message);
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  @SubscribeMessage('fetchContacts')
  async handleFetchContacts(client: Socket): Promise<void> {
    const userId = client['userId'];

    try {
      const contacts = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { contactOf: { take: 12 } },
      });

      const result = [...contacts.contactOf];
      console.log(result);
      client.emit('fetchContacts', result);
    } catch (error) {
      console.error('Error fetching messages:', error);
      client.disconnect();
    }
  }

  @SubscribeMessage('fetchMessages')
  async handleFetchMessages(
    client: Socket,
    msg: { contactId: number },
  ): Promise<void> {
    const userId = client['userId'];
    const contactId = msg.contactId;

    if (!userId && contactId == undefined) {
      console.log('disconnecting client');
      client.disconnect();
      return;
    }

    try {
      let contact;

      if (contactId === 0) {
        contact = await this.prisma.contact.findFirst({
          where: {
            ownerId: 1,
            members: { some: { id: userId } },
          },
          include: { members: true, messages: true },
        });
      } else {
        contact = await this.prisma.contact.findUnique({
          where: { id: contactId },
          include: { members: true, messages: true },
        });
      }

      if (!contact.members.some((member) => member.id === userId)) {
        console.error('Access Denied:', userId);
      }

      client.emit('fetchMessages', contact.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      client.disconnect();
    }
  }
}
