import { Server } from 'socket.io'
import { Request, Response } from 'express'
import chatService from '@/services/chat.service';
import { OkResponse } from '@/core/success.response';

class ChatController {
    // Setup WebSocket cho chat
    async setupChatWebSocket(socket: any, io: Server) {
        // Nhận tin nhắn
        socket.on('send_message', async (data: any) => {
            try {
                const { content, receiverId } = data

                const senderId = socket.user.id
                const senderRole = socket.user.role

                const roomId = [senderId, receiverId].sort().join('_')

                const message: any = await chatService.sendMessage({ senderId, receiverId, senderRole, content })

                const { _id, ...messageWithoutId } = message

                io.of('/chat').to(roomId).emit('new_message', { _id, ...messageWithoutId })

                const conversations = await chatService.getConversations({ page: 1, limit: 10 });

                io.of('/chat').emit('new_conversations', conversations)
            } catch (err: any) {
                console.error('Send message error:', err);
                socket.emit('chat_error', { message: err.message })
            }
        });
    }

    async getConversations(req: Request, res: Response) {
        const { page = '1', limit = '10' } = req.query as {
            page?: string
            limit?: string
        }

        const pageNumber = parseInt(page, 10)
        const limitNumber = parseInt(limit, 10)

        const conversations = await chatService.getConversations({
            page: pageNumber,
            limit: limitNumber,
        })

        res.send(new OkResponse("Lấy danh sách trò chuyện thành công", conversations))
    }

    async getMessages(req: Request, res: Response) {
        const { conversationId } = req.params
        const { page = '1', limit = '10' } = req.query as {
            page?: string
            limit?: string
        }

        const pageNumber = parseInt(page, 10)
        const limitNumber = parseInt(limit, 10)

        res.send(await chatService.getMessages({
            conversationId,
            page: pageNumber,
            limit: limitNumber,
        }))
    }

}

const chatController = new ChatController()
export default chatController
