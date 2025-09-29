import 'module-alias/register'
import express from 'express'
import cors from 'cors'
import connectDB from './config/mongodb'
import router from '@/routers/index'
import errorHandler from '@/middleware/errorHandler'
import bodyParser from 'body-parser'
import dotEnv from 'dotenv'
import cookieParser from 'cookie-parser'
import { syncElasticsearch } from './helpers/syncElasticsearch'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import websocketRoutes from './routers/websocket.router'

dotEnv.config()

const app = express()
app.use(
    cors({
        origin: '*',
        credentials: true,
    })
)

// Setup WebSocket
const server = createServer(app); // Tạo HTTP server
const io = new Server(server,
    {
        cors: {
            origin: '*',
        },
    }
);


const port =
    process.env.NODE_ENV === 'development'
        ? process.env.DEV_PORT || 3000
        : process.env.PROD_PORT || 8080


// Setup WebSocket routes
websocketRoutes(io);

//Middleware
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())

//connect database
connectDB()

//sync elasticsearch
syncElasticsearch().catch((error) => {
    console.error('Error syncing Elasticsearch:', error)
})

// import routes
app.use('/api/v1', router)


// handler error
app.use(errorHandler.notFoundError)
app.use(errorHandler.globalError)

server.listen(port, () => {
    console.log(`Server is running on port ${port}`)
    console.log(`http://localhost:${port}`)
})
