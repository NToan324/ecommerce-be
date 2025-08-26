import asyncHandler from '@/middleware/asyncHandler'
import { Router } from 'express'
import { validationRequest } from '@/middleware/validationRequest'
import verifyJWT from '@/middleware/verifyJWT'
import verifyJWTOrder from '@/middleware/verifyJWTOrder'
import verifyRole from '@/middleware/verifyRoles'
import OrderValidation from '@/validation/order.validation'
import orderController from '@/controllers/order.controller'

const router = Router()

// Tìm kiếm đơn hàng theo tên khách hàng, order_id, status, payment_status, payment_method, from_date, to_date
router.get('/search',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(OrderValidation.searchOrder()),
    asyncHandler(orderController.searchOrder))

// Tao đơn hàng
router.post(
    '/',
    verifyJWTOrder,
    validationRequest(OrderValidation.createOrder()),
    asyncHandler(orderController.createOrder)
)

// Lấy danh sách order
router.get('/',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(orderController.getOrders))

// Lấy chi tiết đơn hàng theo order_id
router.get('/:id',
    verifyJWT,
    asyncHandler(orderController.getOrderById))

// Cập nhật trạng thái đơn hàng
router.patch('/:id/status',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(OrderValidation.updateOrderStatus()),
    asyncHandler(orderController.updateOrderStatus))

export default router
