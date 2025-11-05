import { syncElasticsearch } from '@/helpers/syncElasticsearch'
import initializeAdminUser from '@/config/initial_admin'
import connectDB from '@/config/mongodb'

export default async function startServer() {
    //connect database
    await connectDB().catch((error) => {
        console.error('Error connecting to database:', error)
    })
    // initialize admin user
    await initializeAdminUser().catch((error) => {
        console.error('Error initializing admin user:', error)
    })
    //sync elasticsearch
    await syncElasticsearch().catch((error) => {
        console.error('Error syncing Elasticsearch:', error)
    })
}