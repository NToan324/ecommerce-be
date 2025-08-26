import CouponModel from '@/models/coupon.model';
import { BadRequestError, NotFoundError } from '@/core/error.response';
import { OkResponse, CreatedResponse } from '@/core/success.response';
import elasticsearchService from './elasticsearch.service';

class CouponService {
    // Tạo mã phiếu giảm giá mới
    async createCoupon({
        code,
        discount_amount,
        usage_limit,
    }: {
        code: string;
        discount_amount: number;
        usage_limit: number;
    }) {
        // Kiểm tra xem mã coupon đã tồn tại chưa
        const existingCoupon = await CouponModel.findOne({ code });
        if (existingCoupon) {
            throw new BadRequestError('Coupon code already exists');
        }

        // Tạo coupon mới
        const newCoupon = await CouponModel.create({
            code,
            discount_amount,
            usage_limit,
        });

        if (!newCoupon) {
            throw new BadRequestError('Failed to create coupon');
        }

        const { _id, code: createdCode, ...couponWithoutId } = newCoupon.toObject();

        // Lưu coupon vào Elasticsearch
        await elasticsearchService.indexDocument(
            'coupons',
            (createdCode as string).toString(),
            couponWithoutId
        );

        return new CreatedResponse('Coupon created successfully', { code: createdCode, ...couponWithoutId });
    }

    // Cập nhật mã phiếu giảm giá
    async updateCoupon({
        code,
        discount_amount,
        usage_limit,
        isActive,
    }: {
        code: string; // Sử dụng `code` để tìm coupon
        discount_amount?: number;
        usage_limit?: number;
        isActive?: boolean;
    }) {
        // Tìm và cập nhật coupon dựa trên `code`
        const updatedCoupon = await CouponModel.findOneAndUpdate(
            { code },
            {
                discount_amount,
                usage_limit,
                isActive,
            },
            { new: true }
        );

        if (!updatedCoupon) {
            throw new NotFoundError('Coupon not found');
        }

        const { _id, code: updatedCode, ...couponWithoutId } = updatedCoupon.toObject();

        // Cập nhật Elasticsearch
        await elasticsearchService.updateDocument(
            'coupons',
            updatedCode as string, // Sử dụng `code` làm chỉ mục
            couponWithoutId
        );

        return new OkResponse('Coupon updated successfully', { code: updatedCode, ...couponWithoutId });
    }

    // Lấy danh sách mã phiếu giảm giá
    async getCoupons({
        page = 1,
        limit = 10,
    }: {
        page?: number;
        limit?: number;
    }) {
        const from = (page - 1) * limit;

        // Tìm kiếm mã phiếu giảm giá trong Elasticsearch
        let total: any
        let response: any[] = []
        try {
            ({ total, response } = await elasticsearchService.searchDocuments(
                'coupons',
                {
                    from,
                    size: limit,
                    query: {
                        match_all: {},
                    },
                    sort: [
                        {
                            createdAt: {
                                order: 'desc',
                            },
                        },
                    ],
                }
            ));
        } catch (error) {
            return new OkResponse('No coupons found', []);
        }

        const coupons = response.map((hit) => ({
            _id: hit._id,
            ...hit._source,
        }));

        return new OkResponse('Coupons retrieved successfully', {
            total,
            page,
            limit,
            totalPage: Math.ceil((total ?? 0) / limit),
            data: coupons,
        });
    }

    // Lấy chi tiết mã phiếu giảm giá theo code (USER)
    async getCouponByCode(code: string) {
        // Tìm kiếm mã phiếu giảm giá trong Elasticsearch
        const { total, response } = await elasticsearchService.searchDocuments(
            'coupons',
            {
                query: {
                    bool: {
                        must: {
                            term: {
                                _id: code,
                            },
                        },
                        filter: {
                            term: {
                                isActive: true,
                            },
                        },
                    },
                },
            }
        );

        if (total === 0) {
            throw new NotFoundError('Coupon not found');
        }

        const coupon = { code: response[0]._id, ...(response[0]._source || {}) }

        return new OkResponse('Coupon retrieved successfully', coupon);
    }

    async getCouponByCodeAdmin(code: string) {
        // Tìm kiếm mã phiếu giảm giá trong Elasticsearch
        const coupon: any = await elasticsearchService.getDocumentById('coupons', code);

        if (!coupon) {
            throw new NotFoundError('Coupon not found');
        }

        if (coupon.isActive === false) {
            throw new BadRequestError('Coupon is not available');
        }

        return new OkResponse('Coupon retrieved successfully', coupon);
    }

    // Xóa mã phiếu giảm giá
    async deleteCoupon(code: string) {
        // Tìm và xóa mã phiếu giảm giá
        const existingCoupon = await CouponModel.findOne({ code });

        if (!existingCoupon) {
            throw new NotFoundError('Coupon not found');
        }

        if ((existingCoupon as any).usage_count > 0) {
            throw new BadRequestError('Cannot delete coupon that has been used');
        }

        // Xóa mã phiếu giảm giá khỏi MongoDB
        const deletedCoupon = await CouponModel.findOneAndDelete({ code });

        if (!deletedCoupon) {
            throw new NotFoundError('Coupon not found');
        }

        const { code: deletedCode, ...couponWithoutId } = deletedCoupon.toObject();

        // Xóa mã phiếu giảm giá khỏi Elasticsearch
        await elasticsearchService.deleteDocument('coupons', code);

        return new OkResponse('Coupon deleted successfully', { code: deletedCode });
    }
}

export default new CouponService();