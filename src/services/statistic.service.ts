import elasticsearchService from '@/services/elasticsearch.service';
import { OkResponse } from '@/core/success.response';

class StatisticService {
    // Tổng quan hiệu suất cửa hàng
    async getOverview() {
        // Tổng số người dùng
        const totalUsers = await elasticsearchService.countDocuments('users', {
            query: { match_all: {} },
        });

        // Số lượng người dùng mới (trong 30 ngày qua)
        const newUsers = await elasticsearchService.countDocuments('users', {
            query: {
                bool: {
                    must: [
                        {
                            range: {
                                createdAt: {
                                    gte: 'now-30d/d',
                                    lte: 'now/d',
                                },
                            },
                        },
                    ],
                },
            },
        });

        // Tổng số đơn đặt hàng
        const totalOrders = await elasticsearchService.countDocuments('orders', {
            query: { match_all: {} },
        });

        // Tổng doanh thu
        const overviewAgg = await elasticsearchService.searchAggregations('orders', {
            size: 0,
            aggs: {
                totalRevenue: {
                    sum: {
                        field: 'total_amount',
                    },
                },
                totalProfit: {
                    sum: {
                        script: {
                            source: `
                                        double profit = 0;
                                        for (item in params._source.items) {
                                            profit += (item.unit_price - item.original_price) * item.quantity;
                                        }
                                        return profit;
                                    `
                        }
                    }
                },
                all_items: {
                    nested: {
                        path: "items"
                    },
                    aggs: {
                        top_products: {
                            terms: {
                                field: "items.product_variant_id",
                                size: 5,
                                order: {
                                    total_quantity: "desc"
                                }
                            },
                            aggs: {
                                // 3. Tính tổng số lượng cho mỗi nhóm sản phẩm
                                total_quantity: {
                                    sum: {
                                        field: "items.quantity"
                                    }
                                },
                                // (Tùy chọn) Lấy tên sản phẩm từ một bản ghi
                                product_details: {
                                    top_hits: {
                                        size: 1,
                                        _source: {
                                            includes: ["items.product_variant_name"]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
        });
        const totalRevenue = (overviewAgg?.aggregations?.totalRevenue as { value?: number })?.value || 0;
        const totalProfit = (overviewAgg?.aggregations?.totalProfit as { value?: number })?.value || 0;
        const all_items = overviewAgg?.aggregations?.all_items as {
            top_products: {
                buckets: any[];
            };
        }

        const topProducts = all_items.top_products.buckets.map((bucket) => {
            const product_item = bucket.product_details.hits.hits[0]?._source;
            return {
                product_variant_id: bucket.key,
                product_variant_name: product_item.product_variant_name,
                total_quantity: bucket.total_quantity.value || 0,
            };
        });

        return new OkResponse('Overview statistics retrieved successfully', {
            totalUsers,
            newUsers,
            totalOrders,
            totalRevenue,
            totalProfit,
            topProducts,
        });
    }

    // Thống kê nâng cao theo thời gian
    async getAdvancedStatistics({
        from_date,
        to_date,
        interval = 'day', // Mặc định là 'day', có thể là 'week', 'month', hoặc 'year'
    }: {
        from_date: string;
        to_date: string;
        interval?: 'day' | 'week' | 'month' | 'year';
    }) {
        // Chuyển đổi định dạng ngày tháng
        const from = from_date ? new Date(from_date) : undefined;
        const to = to_date ? new Date(to_date) : undefined;

        const fromISO = from ? from.toISOString() : undefined;
        const toISO = to ? to.toISOString() : undefined;

        // Tạo query với khoảng thời gian
        const query: any = {
            range: {
                createdAt: {
                    ...(from_date && { gte: fromISO }),
                    ...(to_date && { lte: toISO }),
                },
            },
        };

        // Tổng doanh thu
        const totalRevenueAgg = await elasticsearchService.searchAggregations('orders', {
            size: 0,
            query,
            aggs: {
                totalRevenue: {
                    sum: {
                        field: 'total_amount',
                    },
                },
            },
        });
        const totalRevenue = (totalRevenueAgg?.aggregations?.totalRevenue as { value?: number })?.value || 0;

        // Tổng số lượng đơn hàng
        const totalOrders = await elasticsearchService.countDocuments('orders', {
            query,
        });

        // Tổng số lượng sản phẩm
        const productStatsAgg = await elasticsearchService.searchAggregations('orders', {
            size: 0,
            query,
            aggs: {
                all_items:
                {
                    nested: {
                        path: 'items'
                    },
                    aggs: {
                        totalProducts: {
                            sum: {
                                field: 'items.quantity',
                            },
                        },
                    },
                },
            },
        });
        const totalProducts = (productStatsAgg?.aggregations?.all_items as {
            totalProducts: { value?: number };
        })?.totalProducts.value || 0;

        // Tổng lợi nhuận
        const totalProfitAgg = await elasticsearchService.searchAggregations('orders', {
            size: 0,
            query,
            aggs: {
                totalProfit: {
                    sum: {
                        script: {
                            source: `
                                double profit = 0;
                                for (item in params._source.items) {
                                    profit += (item.unit_price - item.original_price) * item.quantity;
                                }
                                return profit;
                            `
                        }
                    }
                },
            },
        });
        const totalProfit = (totalProfitAgg?.aggregations?.totalProfit as { value?: number })?.value || 0;

        // Doanh thu, số lượng đơn hàng, và số lượng sản phẩm theo khoảng thời gian (interval)
        const intervalStatsAgg = await elasticsearchService.searchAggregations('orders', {
            size: 0,
            query,
            aggs: {
                statsByInterval: {
                    date_histogram: {
                        field: 'createdAt',
                        calendar_interval: interval, // 'day', 'week', 'month', hoặc 'year'
                    },
                    aggs: {
                        totalRevenue: {
                            sum: {
                                field: 'total_amount',
                            },
                        },
                        totalOrders: {
                            value_count: {
                                field: 'user_id', // Đếm số lượng đơn hàng
                            },
                        },
                        all_items: {
                            nested: {
                                path: 'items'
                            },
                            aggs: {
                                totalProducts: {
                                    sum: {
                                        field: 'items.quantity',
                                    },
                                },
                            },
                        },
                        totalProfit: {
                            sum: {
                                script: {
                                    source: `
                                        double profit = 0;
                                        for (item in params._source.items) {
                                            profit += (item.unit_price - item.original_price) * item.quantity;
                                        }
                                        return profit;
                                    `
                                }
                            }
                        }
                    },
                },
            },
        });

        // Xử lý kết quả trả về từ interval
        const statsByInterval = ((intervalStatsAgg?.aggregations?.statsByInterval as { buckets: any[] })?.buckets || []).map(
            (bucket: any) => ({
                date: bucket.key_as_string, // Ngày hoặc khoảng thời gian (dạng chuỗi)
                totalRevenue: bucket.totalRevenue.value || 0, // Tổng doanh thu
                totalOrders: bucket.totalOrders.value || 0, // Tổng số lượng đơn hàng
                totalProducts: bucket.all_items.totalProducts.value || 0, // Tổng số lượng sản phẩm
                totalProfit: bucket.totalProfit.value || 0, // Tổng lợi nhuận
            })
        );

        return new OkResponse('Advanced statistics retrieved successfully', {
            totalRevenue, // Tổng doanh thu trong khoảng thời gian
            totalOrders, // Tổng số lượng đơn hàng trong khoảng thời gian
            totalProducts, // Tổng số lượng sản phẩm trong khoảng thời gian
            totalProfit, // Tổng lợi nhuận trong khoảng thời gian
            statsByInterval, // Thống kê theo khoảng thời gian (ngày, tuần, tháng, năm)
        });
    }
}

const statisticService = new StatisticService();
export default statisticService;