import productController from '../controllers/product.controller'
import asyncHandler from '@/middleware/asyncHandler'
import { validationRequest } from '@/middleware/validationRequest'
import verifyJWT from '@/middleware/verifyJWT'
import verifyRole from '@/middleware/verifyRoles'
import { ProductValidation } from '@/validation/product.validation'
import { Router } from 'express'
import reviewController from '@/controllers/review.controller'
import upload from '@/storage/multerConfig'

const router = Router()

// Lấy danh sách biến thể sản phẩm (Admin)
router.get(
    '/admin',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(productController.getProductVariantsAdmin)
)

// Lấy danh sách review theo product_variant_id
router.get(
    '/:id/reviews',
    asyncHandler(reviewController.getReviewsByProductVariantId)
)

// Lấy biến thể sản phẩm theo id biến thể sản phẩm (Admin)
router.get(
    '/:id/admin',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(productController.getProductVariantByIdAdmin)
)

// Lấy danh sách biến thể sản phẩm (User)
router.get('/', asyncHandler(productController.getProductVariants))

// tải lên ảnh sản phẩm
router.post(
    '/upload',
    verifyJWT,
    verifyRole(['ADMIN']),
    upload.array('file'),
    asyncHandler(productController.uploadImage)
)

// Tạo biến thể sản phẩm
router.post(
    '/',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(ProductValidation.createProductVariant()),
    asyncHandler(productController.createProductVariant)
)

// Tìm kiếm biến thể sản phẩm theo tên, danh mục, thương hiệu (Admin)
router.get(
    '/search/admin',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(ProductValidation.searchProductVariant()),
    asyncHandler(productController.searchProductVariantAdmin)
)

// Tìm kiếm biến thể sản phẩm theo tên, danh mục, thương hiệu, khoảng giá, rating trung bình (User)
router.get(
    '/search',
    validationRequest(ProductValidation.searchProductVariant()),
    asyncHandler(productController.searchProductVariant)
)

// Lấy danh sách biến thể sản phẩm mới nhất
router.get('/newest', asyncHandler(productController.getNewestProductVariants))

// Lấy danh sách biến thể sản phẩm bán chạy nhất
router.get(
    '/best-seller',
    asyncHandler(productController.getBestSellingProductVariants)
)

// Lấy danh sách biến thể sản phẩm giảm giá
router.get(
    '/discount',
    asyncHandler(productController.getDiscountedProductVariants)
)

// Cập nhật biến thể sản phẩm
router.put(
    '/:id',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(ProductValidation.updateProductVariant()),
    asyncHandler(productController.updateProductVariant)
)

// Lấy biến thể sản phẩm theo id biến thể sản phẩm (User)
router.get('/:id', asyncHandler(productController.getProductVariantById))

// Xóa biến thể sản phẩm
router.delete(
    '/:id',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(productController.deleteProductVariant)
)

export default router
