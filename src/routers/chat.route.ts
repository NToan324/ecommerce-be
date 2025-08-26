import chatController from '@/controllers/chat.controller'
import asyncHandler from '@/middleware/asyncHandler'
import verifyJWT from '@/middleware/verifyJWT'
import verifyRole from '@/middleware/verifyRoles'
import { Router } from 'express'

const router = Router()

// Lấy danh sách cuộc trò chuyện
router.get('/',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(chatController.getConversations))

// Lấy danh sách tin nhắn của cuộc trò chuyện
router.get('/:conversationId',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(chatController.getMessages))

export default router