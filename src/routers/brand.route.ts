import brandController from '../controllers/brand.controller'
import asyncHandler from '@/middleware/asyncHandler'
import { validationRequest } from '@/middleware/validationRequest'
import verifyJWT from '@/middleware/verifyJWT'
import verifyRole from '@/middleware/verifyRoles'
import { BrandValidation } from '@/validation/brand.validation'
import { Router } from 'express'

const router = Router()

// upload ảnh thương hiệu
router.post('/upload',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(brandController.uploadImage))

// Tìm kiếm thương hiệu theo tên
router.get('/search',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(BrandValidation.searchBrand()),
    asyncHandler(brandController.searchBrands))

// Tạo thương hiệu
router.post('/',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(BrandValidation.createBrand()),
    asyncHandler(brandController.createBrand))

// Lấy danh sách thương hiệu (User)
router.get('/', asyncHandler(brandController.getBrands))

// Lấy danh sách thương hiệu (Admin)
router.get('/admin',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(brandController.getBrandsAdmin))

// Lấy chi tiết thương hiệu theo id
router.get('/:id',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(brandController.getBrandById))

// Cập nhật thương hiệu
router.put('/:id',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(BrandValidation.updateBrand()), asyncHandler(brandController.updateBrand))

// Xóa thương hiệu
router.delete('/:id',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(brandController.deleteBrand))

export default router
