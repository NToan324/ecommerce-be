import productController from '../controllers/product.controller'
import asyncHandler from '@/middleware/asyncHandler'
import { validationRequest } from '@/middleware/validationRequest'
import verifyJWT from '@/middleware/verifyJWT'
import verifyRole from '@/middleware/verifyRoles'
import { ProductValidation } from '@/validation/product.validation'
import { Router } from 'express'
import upload from '@/storage/multerConfig'

const router = Router()

router.get('/search', asyncHandler(productController.searchProduct))

router.get(
    '/',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(productController.getProducts)
)

// Tìm kiếm sản phẩm theo tên, danh mục, thương hiệu
router.get('/search',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(productController.searchProduct)
)

// tải lên ảnh sản phẩm
router.post(
    '/upload',
    verifyJWT,
    verifyRole(['ADMIN']),
    upload.single('file'),
    asyncHandler(productController.uploadImage)
)

// Tạo sản phẩm
router.post(
    '/',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(ProductValidation.createProduct()),
    asyncHandler(productController.createProduct)
)

// Cập nhật sản phẩm theo id
router.put(
    '/:id',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(ProductValidation.updateProduct()),
    asyncHandler(productController.updateProduct)
)

// Xóa sản phẩm theo id
router.delete(
    '/:id',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(productController.deleteProduct)
)

// Lấy danh sách biến thể sản phẩm theo id sản phẩm cha
router.get(
    '/:id/variants',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(productController.getProductVariantsByProductId)
)

// Lấy sản phẩm theo id sản phẩm
router.get(
    '/:id',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(productController.getProductById)
)

export default router
