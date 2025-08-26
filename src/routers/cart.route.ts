import { Router } from 'express'
import cartController from '@/controllers/cart.controller'
import asyncHandler from '@/middleware/asyncHandler'
import verifyJWT from '@/middleware/verifyJWT'
import { validationRequest } from '@/middleware/validationRequest'
import CartValidation from '@/validation/cart.validation'

const router = Router()

// Add item to cart
router.post(
    '/',
    verifyJWT,
    validationRequest(CartValidation.addItemToCart()),
    asyncHandler(cartController.addItemToCart)
)

// Get cart by user ID
router.get('/', verifyJWT, asyncHandler(cartController.getCart))

// Update item quantity in cart
router.put(
    '/:productVariantId',
    verifyJWT,
    validationRequest(CartValidation.updateItemQuantity()),
    asyncHandler(cartController.updateItemQuantity)
)

// Clear cart
router.delete('/clear', verifyJWT, asyncHandler(cartController.clearCart))

// Remove item from cart
router.delete(
    '/:productVariantId',
    verifyJWT,
    asyncHandler(cartController.removeItemFromCart)
)

export default router
