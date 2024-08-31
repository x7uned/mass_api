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
      this.clients.delete(userId);

      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastOnline: new Date() },
      });

      client.emit('contactStatus', { isOnline: false, lastOnline: new Date() });
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

      // Проверка, существует ли уже клиент с таким userId
      if (this.clients.has(userId)) {
        console.log(
          `Client with userId: ${userId} is already connected. Disconnecting the new connection.`,
        );
        client.disconnect();
        return;
      }

      client['userId'] = userId;

      // Обновление статуса пользователя в базе данных
      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: true },
      });

      // Сообщение клиенту о его статусе
      client.emit('contactStatus', { isOnline: true });

      // Добавление клиента в карту для дальнейшего использования
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
  async handleGetUserStatus(
    client: Socket,
    payload: { contactId: number },
  ): Promise<void> {
    const { contactId } = payload;

    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: { contact: true },
    });

    if (!contact) {
      console.error('Contact not found:', contactId);
      return;
    }

    const userId = contact.contactId;
    const isOnline = this.clients.has(userId);
    const status = {
      contactId,
      online: isOnline,
      lastOnline: !isOnline ? contact.contact.lastOnline : undefined,
    };

    client.emit('contactStatus', status);
  }

  @SubscribeMessage('message')
  async handleMessage(
    client: Socket,
    obj: { contactId: number; content: string },
  ): Promise<void> {
    const ownerId = client['userId'];
    const contactId = obj.contactId;

    if (!ownerId || !contactId) {
      console.log('No ownerId or contactId, disconnecting client');
      client.disconnect();
      return;
    }

    // Проверка существования контакта
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      console.error('Contact not found:', contactId);
      return;
    }

    // Проверка, существует ли `ownerId` как пользователь
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      console.error('Owner not found:', ownerId);
      client.disconnect();
      return;
    }

    try {
      console.log({
        content: obj.content,
        ownerId,
        contactId,
      });

      // Создание сообщения
      const message = await this.prisma.message.create({
        data: {
          content: obj.content,
          ownerId,
          contactId,
        },
      });

      // Обновление счетчика сообщений для контакта
      await this.prisma.contact.update({
        where: { id: contactId },
        data: {
          messageCount: {
            increment: 1,
          },
        },
      });

      // Отправка сообщения получателю
      const receiverClient = this.clients.get(
        contact.userId === ownerId ? contact.contactId : contact.userId,
      );
      if (receiverClient) {
        receiverClient.emit('message', message);
      }

      // Отправка сообщения отправителю
      client.emit('message', message);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  @SubscribeMessage('fetchMessages')
  async handleFetchMessages(
    client: Socket,
    msg: { contactId: number },
  ): Promise<void> {
    const senderId = client['userId'];
    const contactId = msg.contactId;

    if (!senderId || !contactId) {
      console.log('disconnecting client');
      client.disconnect();
      return;
    }

    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      console.error('Contact not found:', contactId);
      return;
    }

    try {
      const messages = await this.prisma.message.findMany({
        where: {
          contactId,
        },
        orderBy: { createdAt: 'asc' },
        take: 48,
      });

      client.emit('fetchMessages', messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      client.disconnect();
    }
  }
}
