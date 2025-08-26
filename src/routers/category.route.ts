import categoryController from '../controllers/category.controller'
import asyncHandler from '@/middleware/asyncHandler'
import { Router } from 'express'
import { CategoryValidation } from '@/validation/category.validation'
import { validationRequest } from '@/middleware/validationRequest'
import verifyJWT from '@/middleware/verifyJWT'
import verifyRole from '@/middleware/verifyRoles'
import upload from '@/storage/multerConfig'

const router = Router()

// upload ảnh danh mục
router.post('/upload',
  verifyJWT,
  verifyRole(['ADMIN']),
  upload.single('file'),
  asyncHandler(categoryController.uploadImage))


// Tìm kiếm danh mục theo tên
router.get('/search',
  verifyJWT,
  verifyRole(['ADMIN']),
  validationRequest(CategoryValidation.searchCategory()),
  asyncHandler(categoryController.searchCategories))

// Tao danh mục
router.post(
  '/',
  verifyJWT,
  verifyRole(['ADMIN']),
  validationRequest(CategoryValidation.createCategory()),
  asyncHandler(categoryController.createCategory)
)

// Lấy danh sách danh mục (User)
router.get('/',
  asyncHandler(categoryController.getCategories))

// Lấy danh sách danh mục (Admin)
router.get('/admin',
  verifyJWT,
  verifyRole(['ADMIN']),
  asyncHandler(categoryController.getCategoriesAdmin))

// Lấy chi tiết danh mục theo id
router.get('/:id',
  // verifyJWT,
  // verifyRole(['ADMIN']),
  asyncHandler(categoryController.getCategoryById))

// Cập nhật danh mục
router.put(
  '/:id',
  verifyJWT,
  verifyRole(['ADMIN']),
  validationRequest(CategoryValidation.updateCategory()),
  asyncHandler(categoryController.updateCategory)
)

// Xóa danh mục
router.delete('/:id',
  verifyJWT,
  verifyRole(['ADMIN']),
  asyncHandler(categoryController.deleteCategory))

export default router
