import { Request, Response } from 'express';
import CouponService from '@/services/coupon.service';

class CouponController {
    // Tạo mã phiếu giảm giá mới
    async createCoupon(req: Request, res: Response) {
        const { code, discount_amount, usage_limit } = req.body;

        res.send(await CouponService.createCoupon({
            code,
            discount_amount,
            usage_limit,
        }));
    }

    // Cập nhật mã phiếu giảm giá
    async updateCoupon(req: Request, res: Response) {
        const { code } = req.params;
        const { discount_amount, usage_limit, isActive } = req.body;

        res.send(await CouponService.updateCoupon({
            code,
            discount_amount,
            usage_limit,
            isActive,
        }));
    }

    // Lấy danh sách mã phiếu giảm giá
    async getCoupons(req: Request, res: Response) {
        const { page = '1', limit = '10' } = req.query as {
            page?: string
            limit?: string
        }

        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);

        res.send(await CouponService.getCoupons({
            page: pageNumber,
            limit: limitNumber
        }));
    }

    // Lấy chi tiết mã phiếu giảm giá theo code (USER)
    async getCouponByCode(req: Request, res: Response) {
        const { code } = req.params;

        res.send(await CouponService.getCouponByCode(code));
    }

    // // Lấy chi tiết mã phiếu giảm giá theo code (ADMIN)
    async getCouponByCodeAdmin(req: Request, res: Response) {
        const { code } = req.params;

        res.send(await CouponService.getCouponByCodeAdmin(code));
    }

    // // Xóa mã phiếu giảm giá
    // async deleteCoupon(req: Request, res: Response) {
    //     const { code } = req.params;

    //     const result = await CouponService.deleteCoupon(code);

    //     return res.status(result.statusCode).json(result);
    // }
}

export default new CouponController();