import { Router } from 'express';
import CouponController from '@/controllers/coupon.controller';
import { validationRequest } from '@/middleware/validationRequest';
import verifyJWT from '@/middleware/verifyJWT';
import verifyRole from '@/middleware/verifyRoles';
import CouponValidation from '@/validation/coupon.validation';
import asyncHandler from '@/middleware/asyncHandler';

const router = Router();

// Tạo mã phiếu giảm giá mới
router.post(
    '/',
    verifyJWT,
    verifyRole(['ADMIN']),
    validationRequest(CouponValidation.createCoupon()),
    asyncHandler(CouponController.createCoupon)
);

// Cập nhật mã phiếu giảm giá
router.put(
    '/:code',
    verifyJWT,
    verifyRole(['ADMIN']), // Chỉ ADMIN có quyền cập nhật coupon
    validationRequest(CouponValidation.updateCoupon()),
    asyncHandler(CouponController.updateCoupon)
);

// Lấy danh sách mã phiếu giảm giá
router.get(
    '/',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(CouponController.getCoupons)
);

// Lấy chi tiết mã phiếu giảm giá theo code (USER)
router.get(
    '/:code',
    asyncHandler(CouponController.getCouponByCode)
);

// Lấy chi tiết mã phiếu giảm giá theo code (ADMIN)
router.get(
    '/admin/:code',
    verifyJWT,
    verifyRole(['ADMIN']),
    asyncHandler(CouponController.getCouponByCode)
);

// // Xóa mã phiếu giảm giá
// router.delete(
//     '/delete/:code',
//     verifyJWT,
//     verifyRole(['ADMIN']), // Chỉ ADMIN có quyền xóa coupon
//     async (req, res) => {
//         const { code } = req.params;
//         const result = await CouponService.deleteCoupon(code);
//         res.status(result.statusCode).json(result);
//     }
// );

export default router;