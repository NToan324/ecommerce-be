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
        const totalRevenueAgg = await elasticsearchService.searchAggregations('orders', {
            size: 0,
            query: {
                bool: {
                    filter: [
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
            aggs: {
                totalRevenue: {
                    sum: {
                        field: 'total_amount',
                    },
                },
            },
        });
        const totalRevenue = (totalRevenueAgg?.aggregations?.totalRevenue as { value?: number })?.value || 0;

        return new OkResponse('Overview statistics retrieved successfully', {
            totalUsers,
            newUsers,
            totalOrders,
            totalRevenue,
        });
    }

    // // Thống kê nâng cao theo thời gian
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
                totalProducts: {
                    sum: {
                        field: 'items.quantity',
                    },
                },
            },
        });
        const totalProducts = (productStatsAgg?.aggregations?.totalProducts as { value?: number })?.value || 0;

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
                                field: 'user_id.keyword', // Đếm số lượng đơn hàng
                            },
                        },
                        totalProducts: {
                            sum: {
                                field: 'items.quantity',
                            },
                        },
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
                totalProducts: bucket.totalProducts.value || 0, // Tổng số lượng sản phẩm
            })
        );

        return new OkResponse('Advanced statistics retrieved successfully', {
            totalRevenue, // Tổng doanh thu trong khoảng thời gian
            totalOrders, // Tổng số lượng đơn hàng trong khoảng thời gian
            totalProducts, // Tổng số lượng sản phẩm trong khoảng thời gian
            statsByInterval, // Thống kê theo khoảng thời gian (ngày, tuần, tháng, năm)
        });
    }
}

const statisticService = new StatisticService();
export default statisticService;