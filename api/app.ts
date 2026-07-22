/**
 * Express 应用配置
 */
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

import { initDatabase } from './db.js'
import authRoutes from './routes/auth.js'
import projectRoutes from './routes/projects.js'
import itemRoutes from './routes/items.js'
import categoryRoutes from './routes/categories.js'
import platformRoutes from './routes/platforms.js'
import priceRoutes from './routes/prices.js'
import statsRoutes from './routes/stats.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 只在非生产环境加载 dotenv
if (process.env.NODE_ENV !== 'production') {
  const dotenv = await import('dotenv')
  dotenv.config()
}

// 初始化数据库
initDatabase()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/items', itemRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/platforms', platformRoutes)
app.use('/api/prices', priceRoutes)
app.use('/api/stats', statsRoutes)

/**
 * health check
 */
app.use('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'ok' })
})

/**
 * 生产环境：托管前端静态文件
 */
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist')
  app.use(express.static(distPath))
  // SPA 回退：非 API 路由返回 index.html
  app.get('/{*splat}', (_req: Request, res: Response): void => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

/**
 * error handler middleware
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({ success: false, error: '服务器内部错误' })
})

/**
 * 404 handler (API only in dev, static handler covers frontend in prod)
 */
app.use('/api', (_req: Request, res: Response): void => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
