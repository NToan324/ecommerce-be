import ConversationModel from "@/models/conversation.model"
import MessageModel from "@/models/message.model"
import elasticsearchService from "./elasticsearch.service"
import UserModel from "@/models/user.model"
import { BadRequestError } from "@/core/error.response"
import { OkResponse } from "@/core/success.response"

class ChatService {
    async sendMessage({
        senderId,
        receiverId,
        senderRole,
        content
    }: {
        senderId: string
        receiverId: string
        senderRole: string
        content: string
    }) {
        let conversationId

        // Kiểm tra xem senderId có tồn tại không
        const sender = await UserModel.findById(senderId)
        if (!sender) {
            throw new BadRequestError('Người gửi không tồn tại')
        }

        // Kiểm tra xem receiverId có tồn tại không
        const receiver = await UserModel.findById(receiverId)
        if (!receiver) {
            throw new BadRequestError('Người nhận không tồn tại')
        }

        // Kiểm tra xem người dùng đã có cuộc trò chuyện chưa
        const conversation = await ConversationModel.findOne({
            user_id: senderRole === 'CUSTOMER' ? senderId : receiverId,
            admin_id: senderRole === 'ADMIN' ? senderId : receiverId,
        })

        conversationId = conversation ? conversation._id : null

        // Nếu chưa có cuộc trò chuyện, tạo mới
        if (!conversation) {
            const newConversation = await ConversationModel.create({
                user_id: senderRole === 'CUSTOMER' ? senderId : receiverId,
                admin_id: senderRole === 'ADMIN' ? senderId : receiverId,
            })

            if (!newConversation) {
                throw new BadRequestError('Tạo cuộc trò chuyện thất bại')
            }

            const { _id, ...conversationWithoutId } = newConversation.toObject()

            // Tạo conversation trong elasticsearch
            await elasticsearchService.indexDocument('conversations', _id.toString(), conversationWithoutId)

            conversationId = _id
        }

        // Tạo tin nhắn
        const message = await MessageModel.create({
            conversationId: conversationId,
            senderId,
            content,
            imageUrl: (sender.avatar as any).url,
        })

        if (!message) {
            throw new BadRequestError('Tạo tin nhắn thất bại')
        }

        const { _id, ...messageWithoutId } = message.toObject()

        // Tạo tin nhắn trong elasticsearch
        await elasticsearchService.indexDocument('messages', _id.toString(), messageWithoutId)

        // Cập nhật lại cuộc trò chuyện trong mongoDB
        const updatedConversation = await ConversationModel.findByIdAndUpdate(
            conversationId,
            {
                last_message: content,
                imageUrl: senderRole === 'CUSTOMER' ? (sender.avatar as any).url : (receiver.avatar as any).url,
            },
            { new: true }
        )

        if (!updatedConversation) {
            throw new BadRequestError('Cập nhật cuộc trò chuyện thất bại')
        }

        const { _id: updatedConversationId, ...conversationWithoutId } = updatedConversation.toObject()

        // Cập nhật lại cuộc trò chuyện trong elasticsearch
        await elasticsearchService.updateDocument('conversations', updatedConversationId.toString(), {
            conversationWithoutId
        })

        return message
    }

    async getConversations({
        page = 1,
        limit = 10,
    }: {
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit

        let total: any
        let response: any

        try {
            const { total, response } = await elasticsearchService.searchDocuments(
                'conversations',
                {
                    from,
                    size: limit,
                    sort: [
                        {
                            updatedAt: {
                                order: 'desc'
                            }
                        }
                    ],
                }
            )
        } catch (error) {
            return new OkResponse('Không có danh sách trò chuyện', [])
        }

        const conversations = response.map((item: any) => {
            const { _id, ...conversationWithoutId } = item

            return {
                _id: _id.toString(),
                ...conversationWithoutId._source,
            }
        })

        // Lấy danh sách user_id từ conversations
        const userIds = conversations.map((conversation: any) => {
            return conversation.user_id
        })

        // Lấy danh sách user tương ứng với user_id từ elasticsearch
        let users: any[] = []
        if (userIds.length > 0) {
            users = await Promise.all(
                userIds.map(async (userId: any) => {
                    const user: any =
                        await elasticsearchService.getDocumentById(
                            'users',
                            userId
                        )
                    return {
                        id: userId,
                        name: user.fullName,
                        avatar: user.avatar.url,
                    }
                })
            )
        } else {
            users = []
        }

        // Gán thông tin user vào conversations
        const userMap = new Map(users.map((user: any) => [user.id, user]))

        conversations.forEach((conversation: any) => {
            const user = userMap.get(conversation.user_id)
            if (user) {
                conversation.user = user
            }
        })

        return {
            total: total,
            page: page,
            limit: limit,
            totalPage: Math.ceil((total ?? 0) / limit),
            data: conversations,
        }
    }

    async getMessages({
        conversationId,
        page = 1,
        limit = 10,
    }: {
        conversationId: string
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit

        let total: any
        let response: any

        try {
            const { total, response } = await elasticsearchService.searchDocuments(
                'messages',
                {
                    from,
                    size: limit,
                    query: {
                        match: {
                            conversationId: conversationId,
                        },
                    },
                    sort: [
                        {
                            createdAt: {
                                order: 'desc'
                            }
                        }
                    ],
                }
            )
        } catch (error) {
            return new OkResponse('Không có danh sách tin nhắn', [])
        }

        const messages = response.map((item: any) => {
            const { _id, ...messageWithoutId } = item

            return {
                _id: _id.toString(),
                ...messageWithoutId._source,
            }
        })

        return new OkResponse(
            'Lấy danh sách tin nhắn thành công',
            {
                total: total,
                page: page,
                limit: limit,
                totalPage: Math.ceil((total ?? 0) / limit),
                data: messages,
            }
        )
    }
}
const chatService = new ChatService()
export default chatService