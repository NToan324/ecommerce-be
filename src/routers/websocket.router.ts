import { Server } from 'socket.io'
import reviewController from '@/controllers/review.controller'
import jwt from 'jsonwebtoken'
import { UnauthorizedError } from '@/core/error.response'
import verifyJWTSocket from '@/middleware/verifySocket'
import chatController from '@/controllers/chat.controller'

declare module 'socket.io' {
    interface Socket {
        user?: any // Thêm thuộc tính user vào Socket
    }
}

const websocketRoutes = (io: Server) => {

    // ====================================== Review ====================================== //
    // Tạo namespace cho review
    const reviewNamespace = io.of('/review')

    // Middleware xác thực JWT cho namespace review
    reviewNamespace.use((socket, next) => {
        const token = socket.handshake.headers.authorization

        if (!token) {
            next()
        }

        if (token) {
            try {
                // Kiểm tra token
                const decoded = jwt.verify(
                    token,
                    process.env.ACCESS_TOKEN_SECRETE as string
                )
                socket.user = decoded // Lưu thông tin người dùng vào socket

                next()
            } catch (error) {
                return next(new UnauthorizedError('Invalid token'))
            }
        }
    })

    // Connect sự kiện cho namespace review
    reviewNamespace.on('connection', (socket) => {
        console.log('User connected to review namespace:', socket.id)

        // Lắng nghe sự kiện join room
        socket.on('join_room', ({ product_variant_id }) => {
            socket.join(product_variant_id)
            console.log(`User ${socket.id} joined room ${product_variant_id}`)
        })

        // Connect controller xử lý các sự kiện liên quan đến review
        reviewController.setupReviewWebSocket(socket, io)

        // Lắng nghe sự kiện leave room
        socket.on('leave_room', (product_variant_id: string) => {
            socket.leave(product_variant_id)
            console.log(`User ${socket.id} left room ${product_variant_id}`)
        })

        // Xử lý sự kiện ngắt kết nối
        socket.on('disconnect', () => {
            console.log('User disconnected from review namespace:', socket.id)
        })
    })

    // ====================================== Chat ====================================== //
    // Tạo namespace cho chat
    const chatNamespace = io.of('/chat')

    // Middleware xác thực JWT cho namespace chat
    chatNamespace.use(verifyJWTSocket)

    // Connect sự kiện cho namespace chat
    chatNamespace.on('connection', (socket) => {
        console.log('User connected to chat namespace:', socket.id)

        // Lắng nghe sự kiện join room
        socket.on('join_room', ({ senderId, receiverId }) => {
            const roomId = [senderId, receiverId].sort().join('_')

            socket.join(roomId)
            console.log(`User ${socket.id} joined room ${roomId}`)
        })

        chatController.setupChatWebSocket(socket, io)

        // Lắng nghe sự kiện leave room
        socket.on('leave_room', ({ user_id }) => {
            if (!user_id) {
                console.log('User ID is required to leave room')
                socket.emit('chat_error', 'User ID is required to leave room')
                return
            }

            if (user_id !== socket.user.id) {
                console.log('User ID does not match socket user ID')
                socket.emit('chat_error', 'User ID does not match socket user ID')
                return
            }
            const roomId = `user_${user_id}_admin`
            socket.leave(roomId)
            console.log(`User ${socket.id} left room ${roomId}`)
        })

        // Lắng nghe sự kiện gửi tin nhắn

        // Xử lý sự kiện ngắt kết nối
        socket.on('disconnect', () => {
            console.log('User disconnected from chat namespace:', socket.id)
        })
    })

}

export default websocketRoutes
