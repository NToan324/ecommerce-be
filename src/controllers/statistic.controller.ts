import categoryService from '@/services/category.service'
import statisticService from '@/services/statistic.service'
import type { Request, Response } from 'express'

class StatisticController {
    async getOverview(req: Request, res: Response) {
        res.send(await statisticService.getOverview())
    }

    async getAdvancedStatistics(req: Request, res: Response) {
        const { from_date, to_date, interval } = req.query as
            {
                from_date: string
                to_date: string
                interval: 'day' | 'week' | 'month' | 'year'
            }
        res.send(await statisticService.getAdvancedStatistics({ from_date, to_date, interval }))
    }
}



const statisticController = new StatisticController()
export default statisticController
