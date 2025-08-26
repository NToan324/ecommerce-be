import userController from '../controllers/user.controller'
import asyncHandler from '@/middleware/asyncHandler'
import { validationRequest } from '@/middleware/validationRequest'
import verifyJWT from '@/middleware/verifyJWT'
import { UserValidation } from '@/validation/user.validation'
import { Router } from 'express'
import upload from '@/storage/multerConfig'
import verifyRole from '@/middleware/verifyRoles'

const router = Router()

// Lấy danh sách người dùng
router.get(
    '/',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(userController.getUsers)
)

// Xem danh sách đơn hàng của bản thân (USER)
router.get('/orders', verifyJWT, asyncHandler(userController.getOrders))

// Lấy hồ sơ người dùng
router.get('/profile', verifyJWT, asyncHandler(userController.getUserProfile))

// Đổi mật khẩu
router.put(
    '/change-password',
    verifyJWT,
    validationRequest(UserValidation.changePassword()),
    asyncHandler(userController.changePassword)
)

// Cập nhật thông tin người dùng (bản thân) với quyền USER
router.put(
    '/profile',
    verifyJWT,
    validationRequest(UserValidation.updateUserInfo()),
    asyncHandler(userController.updateProfile)
)

// Cập nhật thông tin người dùng với quyền ADMIN
router.put(
    '/:id',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(UserValidation.updateUserInfo()),
    asyncHandler(userController.updateUserInfo)
)

// Lấy orders theo user_id (ADMIN)
router.get('/:id/orders',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(userController.getOrdersByUserId)
)

// Xem chi tiết người dùng (ADMIN)
router.get(
    '/:id',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(userController.getUserProfileById)
)

// tải lên avatar
router.post(
    '/upload',
    verifyJWT,
    upload.single('file'),
    asyncHandler(userController.uploadImage)
)

// search user
router.get(
    '/search',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(UserValidation.searchUser()),
    asyncHandler(userController.searchUser)
)

export default router
