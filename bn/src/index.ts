import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Supabase client (service role for full access)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('combined'))

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'AutoVahan API',
    version: '1.0.0'
  })
})

// Get all brands
app.get('/api/brands', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('cars')
      .select('brand')
      .order('brand')

    if (error) throw error

    const brands = [...new Set(data.map((c: any) => c.brand))].sort()
    res.json(brands)
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch brands', message: error.message })
  }
})

// Get filter options
app.get('/api/filters', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('cars').select('brand, body_type, fuel_type')
    if (error) throw error

    const brands = [...new Set(data.map((c: any) => c.brand))].sort()
    const bodyTypes = [...new Set(data.map((c: any) => c.body_type))].sort()
    const fuelTypes = [...new Set(data.map((c: any) => c.fuel_type))].sort()

    const priceRange = await supabase.from('cars').select('starting_price').order('starting_price')
    const minPrice = priceRange.data?.[0]?.starting_price || 400000
    const maxPrice = priceRange.data?.[priceRange.data.length - 1]?.starting_price || 7000000

    res.json({ brands, bodyTypes, fuelTypes, priceRange: { min: minPrice, max: maxPrice } })
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch filters', message: error.message })
  }
})

// GET /api/cars - Main listing with filters, search, sort
app.get('/api/cars', async (req, res) => {
  try {
    const { 
      search = '', 
      brand = '', 
      body_type = '', 
      fuel_type = '',
      min_price = '0',
      max_price = '100000000',
      sort = 'popular',
      popular = ''
    } = req.query

    let query = supabase.from('cars').select('*')

    // Search (brand + model + description)
    if (search) {
      const term = `%${search}%`
      query = query.or(`brand.ilike.${term},model.ilike.${term},description.ilike.${term}`)
    }

    // Brand filter (comma separated)
    if (brand) {
      const brands = (brand as string).split(',').map(b => b.trim())
      query = query.in('brand', brands)
    }

    // Body type filter
    if (body_type) {
      const types = (body_type as string).split(',').map(t => t.trim())
      query = query.in('body_type', types)
    }

    // Fuel type filter
    if (fuel_type) {
      const fuels = (fuel_type as string).split(',').map(f => f.trim())
      query = query.in('fuel_type', fuels)
    }

    // Price range
    query = query
      .gte('starting_price', parseInt(min_price as string))
      .lte('starting_price', parseInt(max_price as string))

    // Popular filter
    if (popular === 'true') {
      query = query.eq('popular', true)
    }

    // Sorting
    switch (sort) {
      case 'price_low':
        query = query.order('starting_price', { ascending: true })
        break
      case 'price_high':
        query = query.order('starting_price', { ascending: false })
        break
      case 'rating':
        query = query.order('rating', { ascending: false })
        break
      case 'name':
        query = query.order('model', { ascending: true })
        break
      case 'popular':
      default:
        query = query.order('popular', { ascending: false }).order('rating', { ascending: false })
        break
    }

    const { data, error } = await query

    if (error) throw error

    res.json({
      success: true,
      count: data.length,
      cars: data
    })
  } catch (error: any) {
    console.error('Error fetching cars:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch cars', 
      message: error.message 
    })
  }
})

// GET /api/cars/:id - Single car details
app.get('/api/cars/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid car ID' })
    }

    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Car not found' })
    }

    res.json({ success: true, car: data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch car', message: error.message })
  }
})

// Inquiry schema validation
const inquirySchema = z.object({
  car_id: z.number().int().positive(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15).regex(/^[0-9+\-\s()]+$/),
  city: z.string().min(2).max(80),
  message: z.string().max(500).optional(),
  preferred_date: z.string().optional(), // YYYY-MM-DD
})

// POST /api/inquiries - Submit test drive / quote request
app.post('/api/inquiries', async (req, res) => {
  try {
    const parsed = inquirySchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.issues
      })
    }

    const inquiry = parsed.data

    // Verify car exists
    const { data: car } = await supabase
      .from('cars')
      .select('id, brand, model')
      .eq('id', inquiry.car_id)
      .single()

    if (!car) {
      return res.status(404).json({ success: false, error: 'Car not found' })
    }

    // Insert inquiry
    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        ...inquiry,
        preferred_date: inquiry.preferred_date || null,
      })
      .select()
      .single()

    if (error) throw error

    // TODO: In production, trigger email/SMS notification here
    console.log(`📧 New inquiry for ${car.brand} ${car.model} from ${inquiry.name} (${inquiry.email})`)

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully. Our team will contact you within 2 hours.',
      inquiry_id: data.id
    })
  } catch (error: any) {
    console.error('Inquiry error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit inquiry', 
      message: error.message 
    })
  }
})

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' })
})

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

app.listen(PORT, () => {
  console.log(`🚗 AutoVahan API running on port ${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
})
