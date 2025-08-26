import asyncHandler from '@/middleware/asyncHandler'
import { Router } from 'express'
import { validationRequest } from '@/middleware/validationRequest'
import verifyJWT from '@/middleware/verifyJWT'
import verifyRole from '@/middleware/verifyRoles'
import statisticController from '@/controllers/statistic.controller'
import { StatisticValidation } from '@/validation/statistic.validation'

const router = Router()

// Lấy thống kê tổng quan
router.get('/overview',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(statisticController.getOverview))

// // Lấy thống kê nâng cao
router.get('/advanced',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(StatisticValidation.getAdvancedStatistics()),
    asyncHandler(statisticController.getAdvancedStatistics))

export default router
