import elasticsearchService from '@/services/elasticsearch.service'
import categoryModel from '@/models/category.model'
import brandModel from '@/models/brand.model'
import productModel from '@/models/product.model'
import ProductVariantModel from '@/models/productVariant.model'
import UserModel from '@/models/user.model'
import OrderModel from '@/models/order.model'
import CartModel from '@/models/cart.model'
import CouponModel from '@/models/coupon.model'
import ReviewModel from '@/models/review.model'

let isSynced = false // Cờ kiểm soát đồng bộ

const indexMappings: { [key: string]: any } = {
    // === USER ===
    users: {
        properties: {
            email: { type: 'keyword' },
            phone: { type: 'keyword' },
            fullName: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } },
            },
            address: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } },
            },
            avatar: {
                properties: {
                    url: { type: 'keyword' },
                    public_id: { type: 'keyword' },
                },
            },
            role: { type: 'keyword' },
            loyalty_points: { type: 'double' },
            isActive: { type: 'boolean' },
            created_at: { type: 'date' },
        },
    },

    // === BRAND ===
    brands: {
        properties: {
            brand_name: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } },
            },
            brand_image: {
                properties: {
                    url: { type: 'keyword' },
                    public_id: { type: 'keyword' },
                },
            },
            isActive: { type: 'boolean' },
        },
    },

    // === CATEGORY ===
    categories: {
        properties: {
            category_name: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } },
            },
            category_description: { type: 'text' },
            category_image: {
                properties: {
                    url: { type: 'keyword' },
                    public_id: { type: 'keyword' },
                },
            },
            isActive: { type: 'boolean' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
        },
    },

    // === CART ===
    carts: {
        properties: {
            user_id: { type: 'keyword' },
            items: {
                type: 'nested',
                properties: {
                    product_variant_id: { type: 'keyword' },
                    product_variant_name: {
                        type: 'text',
                        fields: { keyword: { type: 'keyword' } },
                    },
                    attributes: { type: 'object' }, // 'Map' trong Mongoose -> 'object'
                    quantity: { type: 'long' },
                    original_price: { type: 'double' },
                    unit_price: { type: 'double' },
                    discount: { type: 'double' },
                    images: {
                        properties: {
                            url: { type: 'keyword' },
                            public_id: { type: 'keyword' },
                        },
                    },
                },
            },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
        },
    },

    // === PRODUCT ===
    products: {
        properties: {
            product_name: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } },
            },
            product_image: {
                properties: {
                    url: { type: 'keyword' },
                    public_id: { type: 'keyword' },
                },
            },
            brand_id: { type: 'keyword' },
            category_id: { type: 'keyword' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
        },
    },

    // === PRODUCT VARIANT ===
    product_variants: {
        properties: {
            product_id: { type: 'keyword' },
            brand_id: { type: 'keyword' },
            category_id: { type: 'keyword' },
            variant_name: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } },
            },
            attributes: { type: 'object' },
            variant_description: { type: 'text' },
            original_price: { type: 'double' },
            price: { type: 'double' },
            discount: { type: 'double' },
            quantity: { type: 'long' },
            average_rating: { type: 'double' },
            rating_distribution: {
                properties: {
                    one_star: { type: 'long' },
                    two_star: { type: 'long' },
                    three_star: { type: 'long' },
                    four_star: { type: 'long' },
                    five_star: { type: 'long' },
                },
            },
            review_count: { type: 'long' },
            images: {
                // Đây là mảng các đối tượng, 'object' (mặc định) là ổn
                type: 'object',
                properties: {
                    url: { type: 'keyword' },
                    public_id: { type: 'keyword' },
                },
            },
            isActive: { type: 'boolean' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
        },
    },

    // === REVIEW ===
    reviews: {
        properties: {
            product_variant_id: { type: 'keyword' },
            user_id: { type: 'keyword' },
            content: { type: 'text' },
            rating: { type: 'integer' }, // 1-5
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
        },
    },

    // === ORDER ===
    orders: {
        properties: {
            user_id: { type: 'keyword' },
            user_name: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } },
            },
            email: { type: 'keyword' },
            coupon_code: { type: 'keyword' },
            address: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } },
            },
            total_amount: { type: 'double' },

            // ***** THAY ĐỔI QUAN TRỌNG NHẤT *****
            items: {
                type: 'nested',
                properties: {
                    product_variant_id: { type: 'keyword' },
                    product_variant_name: {
                        type: 'text',
                        fields: { keyword: { type: 'keyword' } },
                    },
                    attribute: { type: 'object' },
                    quantity: { type: 'long' },
                    original_price: { type: 'double' },
                    unit_price: { type: "double" },
                    discount: { type: 'double' },
                    images: {
                        properties: {
                            url: { type: 'keyword' },
                        },
                    },
                },
            },

            discount_amount: { type: 'double' },
            loyalty_points_used: { type: 'double' },
            loyalty_points_earned: { type: 'double' },
            status: { type: 'keyword' },
            payment_method: { type: 'keyword' },
            payment_status: { type: 'keyword' },
            order_tracking: {
                type: 'object',
                properties: {
                    status: { type: 'keyword' },
                    updated_at: { type: 'date' },
                },
            },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
        },
    },

    // === COUPON ===
    coupons: {
        properties: {
            code: { type: 'keyword' },
            discount_amount: { type: 'double' },
            usage_count: { type: 'integer' },
            usage_limit: { type: 'integer' },
            orders_used: { type: 'keyword' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
        },
    },
};


export async function syncElasticsearch() {
    if (isSynced) {
        console.log(
            'Elasticsearch is already synced. Skipping synchronization.'
        )
        return
    }

    console.log('Starting Elasticsearch synchronization...')

    // Danh sách các index cần tạo
    const indices = [
        'users',
        'categories',
        'brands',
        'products',
        'product_variants',
        'orders',
        'carts',
        'coupons',
        'reviews',
    ]

    // Xóa và tạo lại index
    for (const index of indices) {
        try {
            const exists = await elasticsearchService
                .getClient()
                .indices.exists({ index })
            if (exists) {
                await elasticsearchService.getClient().indices.delete({ index })
                console.log(`Deleted existing index: ${index}`)
            }

            const mapping = indexMappings[index]
            if (mapping) {
                await elasticsearchService.getClient().indices.create({
                    index,
                    body: {
                        mappings: mapping
                    }
                })
                console.log(`Created new index: ${index} with custom mapping.`)
            } else {
                // Nếu không có, tạo index rỗng (Elasticsearch sẽ tự đoán mapping)
                await elasticsearchService.getClient().indices.create({ index })
                console.log(`Created new index: ${index} with dynamic mapping.`)
            }
        } catch (error) {
            console.error(`Error handling index ${index}:`, error)
        }
    }

    // Đồng bộ dữ liệu từ MongoDB lên Elasticsearch
    await syncCollectionToIndex(UserModel, 'users')
    await syncCollectionToIndex(categoryModel, 'categories')
    await syncCollectionToIndex(brandModel, 'brands')
    await syncCollectionToIndex(productModel, 'products')
    await syncCollectionToIndex(ProductVariantModel, 'product_variants')
    await syncCollectionToIndex(OrderModel, 'orders')
    await syncCollectionToIndex(CartModel, 'carts')
    await syncCollectionToIndex(CouponModel, 'coupons')
    await syncCollectionToIndex(ReviewModel, 'reviews')

    console.log('Elasticsearch synchronization completed.')
    isSynced = true // Đánh dấu đã đồng bộ
}

async function syncCollectionToIndex(model: any, index: string) {
    console.log(`Syncing data for index: ${index}`)
    const documents = await model.find().lean()
    for (const doc of documents) {
        const { _id, ...rest } = doc
        await elasticsearchService.indexDocument(index, _id.toString(), rest)
    }
    console.log(`Synced ${documents.length} documents to index: ${index}`)
}
