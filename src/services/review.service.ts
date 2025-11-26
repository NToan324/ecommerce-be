import elasticsearchService from './elasticsearch.service'
import { OkResponse, CreatedResponse } from '@/core/success.response'
import { BadRequestError } from '@/core/error.response'
import productVariantModel from '@/models/productVariant.model'
import reviewModel, { Review } from '@/models/review.model'
import { number } from 'zod/v4'

class ReviewService {
    // Thêm review cho sản phẩm
    async addReview({
        productVariantId,
        userId,
        content,
        rating,
    }: {
        productVariantId: string
        userId?: string
        content: string
        rating?: number
    }) {
        // Kiểm tra xem productVariant có tồn tại và isActive hay không
        const productVariant = await productVariantModel.findOne({
            _id: productVariantId,
            isActive: true,
        })

        if (!productVariant) {
            throw new BadRequestError('Product variant not found or inactive')
        }

        const reviewData: any = {
            product_variant_id: productVariantId,
            content,
        }

        if (rating && !userId) {
            throw new BadRequestError(
                'User must be logged in to provide a rating'
            )
        }

        if (userId) {
            reviewData.user_id = userId
            if (rating) {
                reviewData.rating = Math.round(rating)
            }
        }

        let newReview

        try {
            newReview = await reviewModel.create(reviewData)
        } catch (error: any) {
            throw new BadRequestError(error.message)
        }

        // Cập nhật average_rating và số lượng review của product variant
        await this.updateProductVariantStats(productVariantId)

        const { _id, ...reviewWithoutId } = newReview.toObject()

        // Thêm review vào Elasticsearch
        await elasticsearchService.indexDocument(
            'reviews',
            _id.toString(),
            reviewWithoutId
        )

        if (userId) {
            const user: any = await elasticsearchService.getDocumentById(
                'users',
                userId
            )

            newReview = {
                ...newReview.toObject(),
                user: {
                    id: userId,
                    name: user.fullName,
                    avatar: user.avatar.url,
                },
            }
            return { ...newReview }
        }

        return { _id: _id, ...reviewWithoutId }
    }

    // Cập nhật average_rating và số lượng review của product variant
    async updateProductVariantStats(productVariantId: string) {
        // Lấy tất cả các review của product variant
        const reviews = await reviewModel.find({
            product_variant_id: productVariantId,
        })

        const ratingDistribution = {
            one_star: reviews.filter((r) => r.rating === 1).length,
            two_star: reviews.filter((r) => r.rating === 2).length,
            three_star: reviews.filter((r) => r.rating === 3).length,
            four_star: reviews.filter((r) => r.rating === 4).length,
            five_star: reviews.filter((r) => r.rating === 5).length,
        }

        const reviewsWithRating: number =
            ratingDistribution.one_star +
            ratingDistribution.two_star +
            ratingDistribution.three_star +
            ratingDistribution.four_star +
            ratingDistribution.five_star

        const averageRating =
            (5 * ratingDistribution.five_star +
                4 * ratingDistribution.four_star +
                3 * ratingDistribution.three_star +
                2 * ratingDistribution.two_star +
                1 * ratingDistribution.one_star) /
            (reviewsWithRating || 1)

        // Cập nhật số lượng review và average_rating trong MongoDB
        await productVariantModel.findByIdAndUpdate(productVariantId, {
            average_rating: averageRating,
            review_count: reviews.length,
            rating_distribution: ratingDistribution,
        })

        // Cập nhật average_rating và review_count trong Elasticsearch
        await elasticsearchService.updateDocument(
            'product_variants',
            productVariantId,
            {
                average_rating: averageRating,
                review_count: reviews.length,
                rating_distribution: ratingDistribution,
            }
        )
    }

    async deleteReview({ reviewId }: { reviewId: string }) {
        // Kiểm tra xem review có tồn tại hay không
        const review = await reviewModel.findById(reviewId)
        if (!review) {
            throw new BadRequestError('Review not found')
        }

        const deletedReview = await reviewModel.findByIdAndDelete(reviewId)
        if (!deletedReview) {
            throw new BadRequestError('Failed to delete review')
        }

        // Cập nhật average_rating và số lượng review của product variant
        await this.updateProductVariantStats(
            deletedReview.product_variant_id.toString()
        )

        try {
            // Xóa review khỏi Elasticsearch
            await elasticsearchService.deleteDocument('reviews', reviewId)
        } catch (error: any) {
            throw new BadRequestError(
                'Failed to delete review from Elasticsearch'
            )
        }
        return deletedReview.toObject()
    }

    async getReviewsByProductVariantId({
        productVariantId,
        page = 1,
        limit = 10,
    }: {
        productVariantId: string
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit

        // Kiểm tra xem productVariant có tồn tại và isActive hay không
        const productVariant = await productVariantModel.findOne({
            _id: productVariantId,
            isActive: true,
        })

        if (!productVariant) {
            throw new BadRequestError('Product variant not found or inactive')
        }

        // Lấy tất cả các review của product variant
        let total: any
        let response: any[]

        try {
            ;({ total, response } = await elasticsearchService.searchDocuments(
                'reviews',
                {
                    size: limit,
                    from: from,
                    query: {
                        bool: {
                            must: {
                                term: {
                                    product_variant_id: productVariantId,
                                },
                            },
                        },
                    },
                    sort: [
                        {
                            createdAt: {
                                order: 'desc',
                            },
                        },
                    ],
                }
            ))
        } catch (error: any) {
            return new OkResponse('No reviews found for this product variant', {
                total: 0,
                page: 1,
                limit: 10,
                average_rating: 0,
                review_count: 0,
                reviews_with_rating: 0,
                rating_distribution: {
                    one_star: 0,
                    two_star: 0,
                    three_star: 0,
                    four_star: 0,
                    five_star: 0,
                },
                totalPage: 0,
                data: [],
            })
        }

        const reviews = response.map((review: any) => {
            const { _id, ...reviewWithoutId } = review
            return {
                _id: _id,
                ...reviewWithoutId._source,
            }
        })

        const userIds = reviews
            .map((review: any) => review.user_id)
            .filter((userId: string) => userId !== undefined)

        // Get user details from Elasticsearch
        let users: any[] = []
        if (userIds.length > 0) {
            const { total, response } = await elasticsearchService.searchDocuments(
                'users',
                {
                    size: userIds.length,
                    query: {
                        bool: {
                            must: {
                                ids: {
                                    values: userIds,
                                },
                            },
                        },
                    },
                }
            )

            users = response.map((user: any) => {
                const source = user._source || {}
                const { fullName, avatar } = source
                return {
                    id: user._id,
                    name: fullName,
                    avatar: avatar.url? avatar.url : null,
                }
            })
        } else {
            users = []
        }

        // Map user details to reviews
        const userMap = new Map(users.map((user: any) => [user.id, user]))

        reviews.forEach((review: any) => {
            const user = userMap.get(review.user_id)
            if (user) {
                review.user = user
            }
        })

        const ratingDistribution: {
            one_star?: number
            two_star?: number
            three_star?: number
            four_star?: number
            five_star?: number
        } = (productVariant.rating_distribution as any) || {}

        const reviews_with_rating: number =
            (ratingDistribution.one_star || 0) +
            (ratingDistribution.two_star || 0) +
            (ratingDistribution.three_star || 0) +
            (ratingDistribution.four_star || 0) +
            (ratingDistribution.five_star || 0)

        return new OkResponse('Get reviews successfully', {
            total,
            page,
            limit,
            average_rating: productVariant.average_rating || 0,
            review_count: productVariant.review_count || 0,
            reviews_with_rating,
            rating_distribution: ratingDistribution,
            totalPage: Math.ceil((total ?? 0) / limit),
            data: reviews,
        })
    }
}
const reviewService = new ReviewService()
export default reviewService
