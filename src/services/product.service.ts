import { CreatedResponse, OkResponse } from '@/core/success.response'
import { convertToObjectId } from '@/helpers/convertObjectId'
import { BadRequestError } from '@/core/error.response'
import productModel, { Product } from '@/models/product.model'
import elasticsearchService from './elasticsearch.service'
import ProductVariantModel, {
    ProductVariant,
} from '@/models/productVariant.model'

class ProductService {
    // ========================Product========================
    //Thêm sản phẩm
    async createProduct(payload: Partial<Product>) {
        const { brand_id, category_id } = payload
        // Kiểm tra xem brand_id và category_id có tồn tại
        if (!brand_id || !category_id) {
            throw new BadRequestError(
                'Thiếu thông tin brand_id hoặc category_id'
            )
        }

        // Kiểm tra xem brand_id và category_id có tồn tại
        try {
            const brandExists = await elasticsearchService.getDocumentById(
                'brands',
                brand_id.toString()
            )

            const categoryExists = await elasticsearchService.getDocumentById(
                'categories',
                category_id.toString()
            )
        } catch (error) {
            throw new BadRequestError('Thương hiệu hoặc danh mục không tồn tại')
        }

        var newProduct = await productModel.create({
            ...payload,
        })

        if (!newProduct) {
            throw new BadRequestError('Tạo sản phẩm thất bại')
        }

        const { _id, ...productWithoutId } = newProduct.toObject()

        await elasticsearchService.indexDocument(
            'products',
            _id.toString(),
            productWithoutId
        )

        return new CreatedResponse('Tạo sản phẩm thành công', {
            _id,
            ...productWithoutId,
        })
    }

    //Lấy danh sách sản phẩm
    async getProducts({
        page = 1,
        limit = 10,
    }: {
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit // Tính toán vị trí bắt đầu

        // Tìm kiếm sản phẩm trong Elasticsearch
        const { total, response } = await elasticsearchService.searchDocuments(
            'products',
            {
                from,
                size: limit,
                query: {
                    match_all: {},
                },
            }
        )

        if (total === 0) {
            return new OkResponse('No products found', [])
        }

        const products = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse('Get products successfully', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil((total ?? 0) / limit),
            data: products,
        })
    }

    //Lấy sản phẩm theo id
    async getProductById(id: string) {
        const { total, response } = await elasticsearchService.searchDocuments(
            'products',
            {
                query: {
                    bool: {
                        must: {
                            term: {
                                _id: id,
                            },
                        },
                    },
                },
            }
        )

        if (total === 0) {
            throw new BadRequestError('Sản phẩm không tồn tại')
        }

        const product = { _id: response[0]._id, ...(response[0]._source || {}) }
        return new OkResponse('Get product successfully', product)
    }

    //Xóa sản phẩm theo id
    async deleteProduct(id: string) {
        // Kiểm tra trong Elasticsearch index product_variants
        const { total, response } = await elasticsearchService.searchDocuments(
            'product_variants',
            {
                size: 1,
                query: {
                    bool: {
                        must: {
                            term: {
                                product_id: id, // Tìm các biến thể có product_id khớp với id sản phẩm
                            },
                        },
                    },
                },
            }
        )

        // Nếu tồn tại ít nhất một biến thể, không cho phép xóa sản phẩm
        if (!(total === 0)) {
            throw new BadRequestError(
                'Không thể xóa sản phẩm vì tồn tại biến thể sản phẩm liên quan'
            )
        }

        // Tiến hành xóa sản phẩm khỏi MongoDB
        const deletedProduct = await productModel.findByIdAndDelete(
            convertToObjectId(id)
        )

        if (!deletedProduct) throw new BadRequestError('Sản phẩm không tồn tại')

        // Xóa sản phẩm khỏi Elasticsearch index
        await elasticsearchService.deleteDocument('products', id)

        return new OkResponse('Xóa sản phẩm thành công', { _id: id })
    }

    //Cập nhật sản phẩm theo id
    async updateProduct({
        payload,
        productId,
    }: {
        payload: Product
        productId: string
    }) {
        const { brand_id, category_id } = payload
        // Kiểm tra xem brand_id và category_id có tồn tại

        if (brand_id) {
            try {
                const brandExists = await elasticsearchService.getDocumentById(
                    'brands',
                    brand_id.toString()
                )
            } catch (error) {
                throw new BadRequestError('Thương hiệu không tồn tại')
            }
        }
        if (category_id) {
            try {
                const categoryExists =
                    await elasticsearchService.getDocumentById(
                        'categories',
                        category_id.toString()
                    )
            } catch (error) {
                throw new BadRequestError('Danh mục không tồn tại')
            }
        }

        const updatedProduct = await productModel.findByIdAndUpdate(
            { _id: convertToObjectId(productId), isActive: true },
            {
                ...payload,
            },
            { new: true }
        )

        if (!updatedProduct) throw new BadRequestError('Sản phẩm không tồn tại')

        const { _id, ...productWithoutId } = updatedProduct.toObject()

        // Update the product in Elasticsearch
        await elasticsearchService.indexDocument(
            'products',
            _id.toString(),
            productWithoutId
        )

        return new OkResponse('Cập nhật sản phẩm thành công', {
            _id,
            ...productWithoutId,
        })
    }

    //Tìm kiếm sản phẩm theo tên, danh mục, thương hiệu
    async searchProduct({
        name,
        category_id,
        brand_id,
        page = 1,
        limit = 10,
    }: {
        name?: string
        category_id?: string
        brand_id?: string
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit // Tính toán vị trí bắt đầu

        const must: any[] = []

        // Add filters dynamically based on the provided parameters
        if (name) {
            must.push({
                wildcard: {
                    'product_name.keyword': {
                        value: `*${name}*`,
                        case_insensitive: true,
                    },
                },
            })
        }

        if (category_id) {
            must.push({
                term: {
                    'category_id.keyword': category_id,
                },
            })
        }

        if (brand_id) {
            must.push({
                term: {
                    'brand_id.keyword': brand_id,
                },
            })
        }

        const { total, response } = await elasticsearchService.searchDocuments(
            'products',
            {
                from,
                size: limit,
                query: {
                    bool: {
                        must,
                    },
                },
            }
        )

        if (total === 0) {
            return new OkResponse('No products found', [])
        }

        const products = response.map((hit: any) => {
            return { _id: hit._id, ...hit._source }
        })

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse('Tìm kiếm sản phẩm thành công', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil((total ?? 0) / limit),
            data: products,
        })
    }

    // ========================Product Variant========================
    //Thêm biến thể sản phẩm
    async createProductVariant(payload: Partial<ProductVariant>) {
        const product = await productModel.findById(payload.product_id)

        if (!product) {
            throw new BadRequestError('Sản phẩm gốc không tồn tại')
        }

        // Gộp thêm brand_id và category_id từ sản phẩm gốc
        var newProductVariant = await ProductVariantModel.create({
            ...payload,
            brand_id: product.brand_id,
            category_id: product.category_id,
        })

        if (!newProductVariant) {
            throw new BadRequestError('Tạo biến thể sản phẩm thất bại')
        }

        const { _id, ...productVariantWithoutId } = newProductVariant.toObject()

        // Thêm vào Elasticsearch
        await elasticsearchService.indexDocument(
            'product_variants',
            _id.toString(),
            productVariantWithoutId
        )

        return new CreatedResponse('Tạo biến thể sản phẩm thành công', {
            _id,
            ...productVariantWithoutId,
        })
    }

    //Lấy danh sách biến thể sản phẩm (Admin)
    async getProductVariantsAdmin({
        page = 1,
        limit = 10,
    }: {
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit // Tính toán vị trí bắt đầu

        // Tìm kiếm biến thể sản phẩm trong Elasticsearch
        const { total, response } = await elasticsearchService.searchDocuments(
            'product_variants',
            {
                from,
                size: limit,
                query: {
                    match_all: {},
                },
            }
        )

        if (total === 0) {
            return new OkResponse('No product variants found', [])
        }

        const productVariants = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)
        return new OkResponse('Get product variants successfully', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil((total ?? 0) / limit),
            data: productVariants,
        })
    }

    //Lấy danh sách biến thể sản phẩm (User)
    async getProductVariants({
        page = 1,
        limit = 10,
    }: {
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit // Tính toán vị trí bắt đầu

        // Tìm kiếm biến thể sản phẩm trong Elasticsearch
        const { total, response } = await elasticsearchService.searchDocuments(
            'product_variants',
            {
                from,
                size: limit,
                query: {
                    bool: {
                        must: {
                            term: {
                                isActive: true,
                            },
                        },
                    },
                },
            }
        )

        if (total === 0) {
            return new OkResponse('No product variants found', [])
        }

        const productVariants = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)
        return new OkResponse('Get product variants successfully', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil((total ?? 0) / limit),
            data: productVariants,
        })
    }

    //Lấy biến thể sản phẩm theo id (Admin)
    async getProductVariantByIdAdmin(id: string) {
        const { total, response } = await elasticsearchService.searchDocuments(
            'product_variants',
            {
                query: {
                    bool: {
                        must: {
                            term: {
                                _id: id,
                            },
                        },
                    },
                },
            }
        )

        if (total === 0) {
            throw new BadRequestError('Biến thể sản phẩm không tồn tại')
        }

        // Lấy thông tin của biến thể sản phẩm được tìm thấy
        const productVariant = {
            _id: response[0]._id,
            ...(response[0]._source || {}),
        }

        return new OkResponse(
            'Get product variant successfully',
            productVariant
        )
    }

    //Lấy biến thể sản phẩm theo id (User)
    async getProductVariantById(id: string) {
        // Bước 1: Tìm biến thể sản phẩm theo ID
        const { total, response } = await elasticsearchService.searchDocuments(
            'product_variants',
            {
                query: {
                    bool: {
                        must: {
                            term: {
                                _id: id,
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
        )

        if (total === 0) {
            throw new BadRequestError('Biến thể sản phẩm không tồn tại')
        }

        // Lấy thông tin của biến thể sản phẩm được tìm thấy
        const productVariant = {
            _id: response[0]._id,
            ...(response[0]._source || {}),
        } as unknown as ProductVariant

        // Bước 2: Tìm các biến thể khác có cùng product_id
        const relatedVariantsResponse =
            await elasticsearchService.searchDocuments('product_variants', {
                size: 5,
                query: {
                    bool: {
                        must: {
                            term: {
                                product_id: productVariant.product_id,
                            },
                        },
                        filter: {
                            term: {
                                isActive: true,
                            },
                        },
                    },
                },
            })

        // Lọc bỏ biến thể hiện tại khỏi danh sách các biến thể liên quan
        const { total: relatedTotal, response: relatedResponse } =
            relatedVariantsResponse

        const relatedVariants = relatedResponse
            .filter((variant: any) => variant._id !== id)
            .map((hit: any) => ({
                _id: hit._id,
                ...hit._source,
            }))

        return new OkResponse('Get product variant successfully', {
            productVariant,
            relatedVariants,
        })
    }

    //Xóa biến thể sản phẩm theo id
    async deleteProductVariant(id: string) {
        // Bước 1: Kiểm tra xem biến thể sản phẩm đã được bán hay chưa
        let orderResponse: any
        try {
            orderResponse = await elasticsearchService.searchDocuments(
                'orders',
                {
                    size: 1,
                    query: {
                        nested: {
                            path: 'items',
                            query: {
                                bool: {
                                    must: [
                                        {
                                            term: {
                                                'items.product_variant_id.keyword':
                                                    id,
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                }
            )
        } catch (error) {
            orderResponse = []
        }

        // Nếu tồn tại ít nhất một đơn hàng chứa biến thể sản phẩm, không cho phép xóa
        if (orderResponse.length > 0) {
            throw new BadRequestError(
                'Không thể xóa biến thể sản phẩm vì đã được bán trong đơn hàng'
            )
        }

        // Bước 2: Xóa biến thể sản phẩm khỏi MongoDB
        const deletedProductVariant =
            await ProductVariantModel.findByIdAndDelete(id)

        if (!deletedProductVariant) {
            throw new BadRequestError('Biến thể sản phẩm không tồn tại')
        }

        // Bước 3: Xóa biến thể sản phẩm khỏi Elasticsearch
        await elasticsearchService.deleteDocument('product_variants', id)

        return new OkResponse('Xóa biến thể sản phẩm thành công', { _id: id })
    }

    //Cập nhật biến thể sản phẩm theo id
    async updateProductVariant({
        payload,
        productVariantId,
    }: {
        payload: ProductVariant
        productVariantId: string
    }) {
        const updatedProductVariant =
            await ProductVariantModel.findByIdAndUpdate(
                { _id: convertToObjectId(productVariantId), isActive: true },
                {
                    ...payload,
                },
                { new: true }
            )

        if (!updatedProductVariant)
            throw new BadRequestError('Biến thể sản phẩm không tồn tại')

        const { _id, ...productVariantWithoutId } =
            updatedProductVariant.toObject()

        // Update the product variant in Elasticsearch
        await elasticsearchService.indexDocument(
            'product_variants',
            _id.toString(),
            productVariantWithoutId
        )

        return new OkResponse('Cập nhật biến thể sản phẩm thành công', {
            _id,
            ...productVariantWithoutId,
        })
    }

    //Lấy danh sách biến thể sản phẩm mới nhất
    async getNewestProductVariants({
        page = 1,
        limit = 10,
    }: {
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit

        // Tìm kiếm biến thể sản phẩm mới nhất trong Elasticsearch

        let total: any
        let response: any[] = []
        try {
            ({ total, response } = await elasticsearchService.searchDocuments(
                'product_variants',
                {
                    from,
                    size: limit,
                    query: {
                        term: {
                            isActive: true,
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
            return new OkResponse('No new products found', [])
        }

        const products = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse('Get new products successfully', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil((total ?? 0) / limit),
            data: products,
        })
    }

    //Lấy danh sách biến thể sản phẩm theo id sản phẩm
    async getProductVariantsByProductId({
        page = 1,
        limit = 10,
        productId,
    }: {
        page?: number
        limit?: number
        productId: string
    }) {
        const from = (page - 1) * limit

        const { total, response } = await elasticsearchService.searchDocuments(
            'product_variants',
            {
                from,
                size: limit,
                query: {
                    bool: {
                        must: {
                            term: {
                                product_id: productId,
                            },
                        },
                    },
                },
            }
        )

        if (total === 0) {
            return new OkResponse(
                'No product variants found for this product ID',
                []
            )
        }

        const productVariants = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)
        return new OkResponse(
            'Get product variants by product ID successfully',
            {
                total,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil((total ?? 0) / limit),
                data: productVariants,
            }
        )
    }

    //Lấy danh sách sản phẩm bán chạy nhất
    async getBestSellingProductVariants({
        page = 1,
        limit = 10,
    }: {
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit

        // Bước 1: Lấy danh sách các sản phẩm bán chạy từ chỉ mục orders
        const bestSellingProducts: any =
            await elasticsearchService.searchAggregations('orders', {
                size: 0,
                aggs: {
                    best_selling_products: {
                        terms: {
                            field: 'items.product_variant_id.keyword',
                            size: limit,
                            order: { totalSold: 'desc' },
                        },
                        aggs: {
                            totalSold: {
                                sum: {
                                    field: 'items.quantity',
                                },
                            },
                        },
                    },
                },
            })

        console.log('Best Selling Products:', bestSellingProducts)

        // Lấy danh sách product_variant_id từ kết quả aggregation
        const buckets =
            bestSellingProducts?.aggregations?.best_selling_products?.buckets ||
            []
        const productVariantIds = buckets.map((bucket: any) => bucket.key)

        if (productVariantIds.length === 0) {
            return new OkResponse('No best-selling product variants found', [])
        }



        // Bước 2: Tìm kiếm thông tin chi tiết từ chỉ mục product_variants
        const { total, response } = await elasticsearchService.searchDocuments(
            'product_variants',
            {
                from,
                size: limit,
                query: {
                    bool: {
                        must: [
                            {
                                terms: {
                                    _id: productVariantIds, // Tìm kiếm theo danh sách product_variant_id
                                },
                            },
                        ],
                        filter: [
                            {
                                term: {
                                    isActive: true,
                                },
                            },
                        ],
                    },
                },
            }
        )

        if (total === 0) {
            return new OkResponse('No product variants found', [])
        }

        // Kết hợp dữ liệu
        const productVariants = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
            totalSold:
                buckets.find((bucket: any) => bucket.key === hit._id)?.totalSold
                    .value || 0,
        }))

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse(
            'Get best-selling product variants successfully',
            {
                total: productVariants.length,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil((total ?? 0) / limit),
                data: productVariants,
            }
        )
    }

    //Lấy danh sách sản phẩm khuyến mãi
    async getDiscountedProductVariants({
        page = 1,
        limit = 10,
    }: {
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit

        // Tìm kiếm biến thể sản phẩm trong Elasticsearch
        const { total, response } = await elasticsearchService.searchDocuments(
            'product_variants',
            {
                from,
                size: limit,
                query: {
                    bool: {
                        must: {
                            range: {
                                discount: {
                                    gt: 0,
                                },
                            },
                        },
                        filter: {
                            term: {
                                isActive: true,
                            },
                        },
                    },
                },
                sort: [
                    {
                        discount: {
                            order: 'desc',
                        },
                    },
                ],
            }
        )

        if (total === 0) {
            return new OkResponse('No discounted product variants found', [])
        }

        const productVariants = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse('Get discounted product variants successfully', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil((total ?? 0) / limit),
            data: productVariants,
        })
    }

    //Tìm kiếm biến thể sản phẩm theo tên, danh mục, thương hiệu, khoảng giá, xếp hạng rating trung bình, sort theo giá, sort theo tên (User)
    async searchProductVariant({
        name,
        category_ids,
        brand_ids,
        min_price,
        max_price,
        ratings,
        sort_price, // "asc" for low to high, "desc" for high to low
        sort_name, // "asc" for A-Z, "desc" for Z-A
        page = 1, // Trang hiện tại (mặc định là 1)
        limit = 10, // Số lượng kết quả mỗi trang (mặc định là 10)
    }: {
        name?: string
        category_ids?: string[] // Danh sách ID danh mục
        brand_ids?: string[] // Danh sách ID thương hiệu
        min_price?: number
        max_price?: number
        ratings?: number
        sort_price?: 'asc' | 'desc'
        sort_name?: 'asc' | 'desc'
        page?: number // Trang hiện tại
        limit?: number // Số lượng kết quả mỗi trang
    }) {
        const must: any[] = []

        // Tìm kiếm theo tên
        if (name) {
            must.push({
                wildcard: {
                    'variant_name.keyword': {
                        value: `*${name}*`,
                        case_insensitive: true,
                    },
                },
            })
        }

        // Lọc theo danh mục (nhiều danh mục)
        if (category_ids && category_ids.length > 0) {
            must.push({
                terms: {
                    'category_id.keyword': category_ids,
                },
            })
        }

        // Lọc theo thương hiệu (nhiều thương hiệu)
        if (brand_ids && brand_ids.length > 0) {
            must.push({
                terms: {
                    'brand_id.keyword': brand_ids,
                },
            })
        }

        // Lọc theo khoảng giá
        if (min_price || max_price) {
            must.push({
                range: {
                    price: {
                        ...(min_price && { gte: min_price }),
                        ...(max_price && { lte: max_price }),
                    },
                },
            })
        }

        // Lọc theo mức rating trung bình
        if (ratings) {
            must.push({
                range: {
                    average_rating: {
                        gte: ratings,
                    },
                },
            })
        }

        const from = (page - 1) * limit // Tính toán vị trí bắt đầu
        const query: any = {
            from,
            size: limit,
            query: {
                bool: {
                    must,
                    filter: {
                        term: {
                            isActive: true,
                        },
                    },
                },
            },
        }

        // Sắp xếp theo giá hoặc tên
        const sort: any[] = []
        if (sort_price) {
            sort.push({
                price: {
                    order: sort_price,
                },
            })
        }
        if (sort_name) {
            sort.push({
                'variant_name.keyword': {
                    order: sort_name,
                },
            })
        }
        if (ratings) {
            sort.push({
                average_rating: {
                    order: 'asc',
                },
            })
        }

        if (sort.length > 0) {
            query.sort = sort
        }

        const { total, response } = await elasticsearchService.searchDocuments(
            'product_variants',
            query
        )

        const productVariants = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        if (total === 0) {
            return new OkResponse('No product variants found', [])
        }

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse('Tìm kiếm biến thể sản phẩm thành công', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil((total ?? 0) / limit),
            data: productVariants,
        })
    }

    //Tìm kiếm biến thể sản phẩm theo tên, danh mục, thương hiệu, khoảng giá, xếp hạng rating trung bình, sort theo giá, sort theo tên (Admin)
    async searchProductVariantAdmin({
        name,
        category_ids,
        brand_ids,
        min_price,
        max_price,
        ratings,
        sort_price, // "asc" for low to high, "desc" for high to low
        sort_name, // "asc" for A-Z, "desc" for Z-A
        page = 1, // Trang hiện tại (mặc định là 1)
        limit = 10, // Số lượng kết quả mỗi trang (mặc định là 10)
    }: {
        name?: string
        category_ids?: string[] // Danh sách ID danh mục
        brand_ids?: string[] // Danh sách ID thương hiệu
        min_price?: number
        max_price?: number
        ratings?: number
        sort_price?: 'asc' | 'desc'
        sort_name?: 'asc' | 'desc'
        page?: number // Trang hiện tại
        limit?: number // Số lượng kết quả mỗi trang
    }) {
        const must: any[] = []

        // Tìm kiếm theo tên
        if (name) {
            must.push({
                wildcard: {
                    'variant_name.keyword': {
                        value: `*${name}*`,
                        case_insensitive: true,
                    },
                },
            })
        }

        // Lọc theo danh mục (nhiều danh mục)
        if (category_ids && category_ids.length > 0) {
            must.push({
                terms: {
                    'category_id.keyword': category_ids,
                },
            })
        }

        // Lọc theo thương hiệu (nhiều thương hiệu)
        if (brand_ids && brand_ids.length > 0) {
            must.push({
                terms: {
                    'brand_id.keyword': brand_ids,
                },
            })
        }

        // Lọc theo khoảng giá
        if (min_price || max_price) {
            must.push({
                range: {
                    price: {
                        ...(min_price && { gte: min_price }),
                        ...(max_price && { lte: max_price }),
                    },
                },
            })
        }

        // Lọc theo mức rating trung bình
        if (ratings) {
            must.push({
                range: {
                    average_rating: {
                        gte: ratings,
                    },
                },
            })
        }

        const from = (page - 1) * limit // Tính toán vị trí bắt đầu
        const query: any = {
            from,
            size: limit,
            query: {
                bool: {
                    must,
                },
            },
        }

        // Sắp xếp theo giá hoặc tên
        const sort: any[] = []
        if (sort_price) {
            sort.push({
                price: {
                    order: sort_price,
                },
            })
        }
        if (sort_name) {
            sort.push({
                'variant_name.keyword': {
                    order: sort_name,
                },
            })
        }
        if (ratings) {
            sort.push({
                average_rating: {
                    order: 'asc',
                },
            })
        }

        if (sort.length > 0) {
            query.sort = sort
        }

        // Tìm kiếm biến thể sản phẩm trong Elasticsearch
        let total: any
        let response: any[] = []
        try {
            ;({ total, response } = await elasticsearchService.searchDocuments(
                'product_variants',
                query
            ))
        } catch (error) {
            return new OkResponse('No product variants found', [])
        }

        const productVariants = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        if (total === 0) {
            return new OkResponse('No product variants found', [])
        }

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse('Tìm kiếm biến thể sản phẩm thành công', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil((total ?? 0) / limit),
            data: productVariants,
        })
    }
}

const productService = new ProductService()
export default productService
