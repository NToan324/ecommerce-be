import z from 'zod'

export class StatisticValidation {
    static getAdvancedStatistics() {
        return {
            query: z.object({
                from_date: z.string().date('Invalid date format'),
                to_date: z.string().date('Invalid date format'),
                interval: z.enum(['day', 'week', 'month', 'year']).optional(),
            }).strict('Invalid field'),
        }
    }
}
