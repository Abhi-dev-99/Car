import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, X, Heart, GitCompare, Star, Calendar, Users, 
  Gauge, Award, ChevronLeft, ChevronRight, ArrowRight 
} from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Car, Inquiry } from './types'

// API base
// In development: uses Vite proxy (/api → localhost:4000)
// In production: uses VITE_API_URL (set on Vercel to your Railway backend)
const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

// Types
interface Filters {
  search: string
  brands: string[]
  bodyTypes: string[]
  fuelTypes: string[]
  minPrice: number
  maxPrice: number
  sort: 'popular' | 'price_low' | 'price_high' | 'rating' | 'name'
}

// Main App
export default function App() {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    brands: [],
    bodyTypes: [],
    fuelTypes: [],
    minPrice: 400000,
    maxPrice: 7000000,
    sort: 'popular'
  })

  const [selectedCar, setSelectedCar] = useState<Car | null>(null)
  const [compareList, setCompareList] = useState<Car[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [favorites, setFavorites] = useState<number[]>(() => {
    const saved = localStorage.getItem('favorites')
    return saved ? JSON.parse(saved) : []
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'features' | 'variants'>('overview')
  const [inquiryForm, setInquiryForm] = useState({
    name: '', email: '', phone: '', city: '', message: '', preferred_date: ''
  })
  const [submittingInquiry, setSubmittingInquiry] = useState(false)

  // Fetch cars from backend
  const { data: carsData, isLoading } = useQuery({
    queryKey: ['cars', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.brands.length) params.set('brand', filters.brands.join(','))
      if (filters.bodyTypes.length) params.set('body_type', filters.bodyTypes.join(','))
      if (filters.fuelTypes.length) params.set('fuel_type', filters.fuelTypes.join(','))
      params.set('min_price', filters.minPrice.toString())
      params.set('max_price', filters.maxPrice.toString())
      params.set('sort', filters.sort)

      const res = await fetch(`${API}/cars?${params}`)
      if (!res.ok) throw new Error('Failed to fetch cars')
      const json = await res.json()
      return json.cars as Car[]
    },
    staleTime: 30000,
  })

  const cars = carsData || []

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['filters'],
    queryFn: async () => {
      const res = await fetch(`${API}/filters`)
      return res.json()
    },
  })

  const allBrands = filterOptions?.brands || []
  const allBodyTypes = filterOptions?.bodyTypes || []
  const allFuelTypes = filterOptions?.fuelTypes || []

  // Favorites toggle
  const toggleFavorite = (id: number) => {
    const newFavs = favorites.includes(id)
      ? favorites.filter(f => f !== id)
      : [...favorites, id]
    setFavorites(newFavs)
    localStorage.setItem('favorites', JSON.stringify(newFavs))
    
    if (!favorites.includes(id)) {
      toast.success('Added to favorites', { description: 'View your wishlist anytime' })
    }
  }

  // Compare management
  const toggleCompare = (car: Car) => {
    if (compareList.find(c => c.id === car.id)) {
      setCompareList(compareList.filter(c => c.id !== car.id))
    } else if (compareList.length < 3) {
      setCompareList([...compareList, car])
      toast.success(`Added ${car.brand} ${car.model} to compare`)
    } else {
      toast.error('Maximum 3 cars can be compared')
    }
  }

  const openCompare = () => {
    if (compareList.length >= 2) setShowCompare(true)
    else toast.error('Select at least 2 cars to compare')
  }

  // Inquiry submission
  const submitInquiry = async () => {
    if (!selectedCar) return

    if (!inquiryForm.name || !inquiryForm.email || !inquiryForm.phone || !inquiryForm.city) {
      toast.error('Please fill all required fields')
      return
    }

    setSubmittingInquiry(true)

    try {
      const res = await fetch(`${API}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          car_id: selectedCar.id,
          ...inquiryForm
        })
      })

      const data = await res.json()

      if (data.success) {
        toast.success('Request submitted!', {
          description: 'Our team will contact you within 2 hours'
        })
        setInquiryForm({ name: '', email: '', phone: '', city: '', message: '', preferred_date: '' })
        setSelectedCar(null)
        setActiveTab('overview')
      } else {
        throw new Error(data.error || 'Submission failed')
      }
    } catch (err: any) {
      toast.error('Failed to submit request', { description: err.message })
    } finally {
      setSubmittingInquiry(false)
    }
  }

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      search: '',
      brands: [],
      bodyTypes: [],
      fuelTypes: [],
      minPrice: 400000,
      maxPrice: 7000000,
      sort: 'popular'
    })
  }

  // Toggle multi-select helpers
  const toggleFilter = (key: 'brands' | 'bodyTypes' | 'fuelTypes', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }))
  }

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`
    return `₹${(price / 100000).toFixed(2)} Lakh`
  }

  // Stats
  const totalCars = cars.length
  const avgPrice = totalCars > 0 
    ? Math.round(cars.reduce((sum, c) => sum + c.starting_price, 0) / totalCars / 100000) * 100000 
    : 0

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e11d48] flex items-center justify-center">
              <span className="font-bold text-xl tracking-tighter">AV</span>
            </div>
            <div>
              <div className="font-semibold text-2xl tracking-tighter">AutoVahan</div>
              <div className="text-[10px] text-white/50 -mt-1">INDIA'S PREMIUM SHOWROOM</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                const el = document.getElementById('catalog')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="px-5 py-2 text-sm rounded-full hover:bg-white/5 transition-colors flex items-center gap-2"
            >
              Browse Catalog
            </button>
            <button 
              onClick={openCompare}
              disabled={compareList.length < 2}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/90 transition-all active:scale-[0.985]"
            >
              <GitCompare className="w-4 h-4" />
              Compare {compareList.length > 0 && `(${compareList.length})`}
            </button>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 text-sm">
              <Heart className="w-4 h-4 text-[#e11d48]" /> {favorites.length}
            </div>
          </div>
        </div>
      </nav>

      {/* HERO - Outstanding */}
      <div className="relative h-[100dvh] flex items-center justify-center pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#222_0.8px,transparent_1px)] bg-[length:4px_4px]" />
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#0a0a0c]" />
        
        <div className="relative z-10 text-center px-6 max-w-5xl">
          <div className="inline-block px-4 py-1 rounded-full bg-white/10 text-xs tracking-[3px] mb-6">EST. 2024 • NEW DELHI</div>
          
          <h1 className="text-7xl md:text-[92px] leading-[0.9] font-semibold tracking-tighter mb-6">
            THE FINEST<br />INDIAN CARS.<br />CURATED.
          </h1>
          
          <p className="text-2xl text-white/70 max-w-md mx-auto mb-10 tracking-tight">
            Discover 55+ premium vehicles from India's most iconic brands. Real prices. Real specs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
              className="group flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-[#e11d48] hover:bg-[#c81a40] font-medium text-lg transition-all active:scale-[0.985]"
            >
              EXPLORE THE COLLECTION
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition" />
            </button>
            <button 
              onClick={() => setFilters(f => ({ ...f, fuelTypes: ['Electric'] }))}
              className="px-10 py-4 rounded-2xl border border-white/30 hover:bg-white/5 text-lg transition-all"
            >
              View Electric Vehicles
            </button>
          </div>

          <div className="flex justify-center gap-10 mt-16 text-sm">
            <div><span className="text-3xl font-semibold tabular-nums">{totalCars}</span><div className="text-white/50">Models</div></div>
            <div><span className="text-3xl font-semibold tabular-nums">18</span><div className="text-white/50">Brands</div></div>
            <div><span className="text-3xl font-semibold tabular-nums">5★</span><div className="text-white/50">Avg Safety</div></div>
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center text-xs tracking-widest text-white/50">
          SCROLL TO BEGIN <div className="h-px w-6 bg-white/30 my-2" /> ↓
        </div>
      </div>

      {/* STATS BAR */}
      <div className="border-b border-white/10 bg-[#121214]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap justify-between text-sm gap-y-2">
          <div className="flex items-center gap-2 text-white/60">Curated from India's most trusted manufacturers</div>
          <div className="flex gap-8 text-white/70">
            <div>Starting from <span className="text-white font-medium">₹4.99 Lakh</span></div>
            <div>Up to <span className="text-white font-medium">₹65.9 Lakh</span></div>
            <div><span className="text-[#e11d48]">{favorites.length}</span> in your wishlist</div>
          </div>
        </div>
      </div>

      {/* CATALOG SECTION */}
      <div id="catalog" className="max-w-7xl mx-auto px-6 pt-14 pb-24">
        {/* Header + Search */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="uppercase tracking-[4px] text-xs text-[#e11d48] mb-1">THE COLLECTION</div>
            <h2 className="text-6xl font-semibold tracking-tighter">All Indian Cars</h2>
            <p className="text-white/60 mt-1">Showing {cars.length} vehicles • Updated today</p>
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-5 top-4 text-white/40 w-5 h-5" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Search Maruti Swift, Tata Nexon, EV..."
              className="w-full bg-[#121214] border border-white/10 pl-12 pr-5 py-3.5 rounded-2xl text-lg placeholder:text-white/40 focus:border-[#e11d48]/60 transition"
            />
          </div>
        </div>

        {/* FILTERS - Outstanding UX */}
        <div className="glass rounded-3xl p-6 mb-8 border border-white/10">
          <div className="flex items-center gap-2 mb-4 text-xs uppercase tracking-widest text-white/60">
            <Filter className="w-4 h-4" /> FILTER & REFINE
          </div>

          {/* Brand Pills */}
          <div className="mb-5">
            <div className="text-sm mb-2.5 text-white/70">Brands</div>
            <div className="flex flex-wrap gap-2">
              {allBrands.slice(0, 12).map(brand => (
                <button
                  key={brand}
                  onClick={() => toggleFilter('brands', brand)}
                  className={`filter-chip px-5 py-1.5 rounded-full text-sm border transition-all ${filters.brands.includes(brand) ? 'active border-[#e11d48]' : 'border-white/15 hover:border-white/40 bg-white/5'}`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Body Type */}
            <div>
              <div className="text-sm mb-2.5 text-white/70">Body Type</div>
              <div className="flex flex-wrap gap-2">
                {allBodyTypes.map(type => (
                  <button key={type} onClick={() => toggleFilter('bodyTypes', type)}
                    className={`filter-chip px-4 py-1 rounded-full text-xs border ${filters.bodyTypes.includes(type) ? 'active border-[#e11d48]' : 'border-white/15 bg-white/5'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Fuel */}
            <div>
              <div className="text-sm mb-2.5 text-white/70">Fuel Type</div>
              <div className="flex flex-wrap gap-2">
                {allFuelTypes.map(fuel => (
                  <button key={fuel} onClick={() => toggleFilter('fuelTypes', fuel)}
                    className={`filter-chip px-4 py-1 rounded-full text-xs border ${filters.fuelTypes.includes(fuel) ? 'active border-[#e11d48]' : 'border-white/15 bg-white/5'}`}>
                    {fuel}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort + Price + Reset */}
            <div className="space-y-4">
              <div>
                <div className="text-sm mb-2 text-white/70">Sort by</div>
                <select 
                  value={filters.sort} 
                  onChange={e => setFilters(f => ({ ...f, sort: e.target.value as any }))}
                  className="bg-[#1a1a1e] border border-white/10 rounded-xl px-4 py-2 text-sm w-full"
                >
                  <option value="popular">Most Popular</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="name">A–Z</option>
                </select>
              </div>

              <button onClick={resetFilters} className="text-xs px-4 py-2 rounded-xl border border-white/20 hover:bg-white/5 w-full">
                CLEAR ALL FILTERS
              </button>
            </div>
          </div>

          {/* Price Range Slider */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex justify-between text-sm mb-3">
              <div>Price Range</div>
              <div className="font-medium text-[#e11d48]">{formatPrice(filters.minPrice)} — {formatPrice(filters.maxPrice)}</div>
            </div>
            <div className="flex gap-4 items-center">
              <input 
                type="range" min={400000} max={7000000} step={100000}
                value={filters.minPrice}
                onChange={e => setFilters(f => ({ ...f, minPrice: Math.min(parseInt(e.target.value), f.maxPrice - 200000) }))}
                className="flex-1 accent-[#e11d48]" 
              />
              <input 
                type="range" min={400000} max={7000000} step={100000}
                value={filters.maxPrice}
                onChange={e => setFilters(f => ({ ...f, maxPrice: Math.max(parseInt(e.target.value), f.minPrice + 200000) }))}
                className="flex-1 accent-[#e11d48]" 
              />
            </div>
          </div>
        </div>

        {/* CAR GRID - Outstanding Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[380px] rounded-3xl bg-[#121214] animate-pulse" />
            ))}
          </div>
        ) : cars.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl">No cars match your filters.</p>
            <button onClick={resetFilters} className="mt-4 text-[#e11d48]">Reset filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {cars.map((car, index) => {
                const isFav = favorites.includes(car.id)
                const inCompare = compareList.some(c => c.id === car.id)
                
                return (
                  <motion.div 
                    key={car.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.015, 0.6) }}
                    onClick={() => setSelectedCar(car)}
                    className="car-card group bg-[#121214] rounded-3xl overflow-hidden border border-white/10 cursor-pointer flex flex-col"
                  >
                    {/* Image */}
                    <div className="relative h-52 bg-black overflow-hidden">
                      <img 
                        src={car.image_url} 
                        alt={`${car.brand} ${car.model}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70" />

                      {/* Top badges */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        {car.popular && (
                          <div className="bg-[#e11d48] text-[10px] px-3 py-px font-medium rounded tracking-widest">BESTSELLER</div>
                        )}
                        {car.safety_rating >= 5 && (
                          <div className="bg-emerald-500/90 text-[10px] px-3 py-px font-medium rounded tracking-widest flex items-center gap-1">
                            <Award className="w-3 h-3" /> 5★
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(car.id) }}
                          className={`p-2.5 rounded-xl backdrop-blur-xl transition ${isFav ? 'bg-[#e11d48] text-white' : 'bg-black/60 hover:bg-black/80'}`}
                        >
                          <Heart className="w-4 h-4" fill={isFav ? "currentColor" : "none"} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleCompare(car) }}
                          className={`p-2.5 rounded-xl backdrop-blur-xl transition ${inCompare ? 'bg-white text-black' : 'bg-black/60 hover:bg-black/80'}`}
                        >
                          <GitCompare className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="absolute bottom-4 right-4 text-right">
                        <div className="text-xs text-white/60">STARTING AT</div>
                        <div className="text-xl font-semibold tabular-nums tracking-tighter">{car.price_display}</div>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <div>
                        <div className="text-[#e11d48] text-xs tracking-[1.5px]">{car.brand.toUpperCase()}</div>
                        <div className="text-3xl font-semibold tracking-tighter mt-px">{car.model}</div>
                      </div>

                      <div className="mt-auto pt-5 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-white/70">
                          <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {car.seating}</div>
                          <div className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5" /> {car.mileage}</div>
                        </div>
                        <div className="flex items-center gap-1 text-[#e11d48]">
                          <Star className="w-4 h-4 fill-current" /> {car.rating}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* FOOTER CTA */}
      <div className="border-t border-white/10 py-14 text-center text-sm text-white/50">
        AutoVahan — India's most trusted car discovery platform • All prices are ex-showroom (approx. 2024-25)
      </div>

      {/* CAR DETAIL MODAL - Outstanding Experience */}
      <AnimatePresence>
        {selectedCar && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 md:p-8" onClick={() => setSelectedCar(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ type: 'spring', bounce: 0.02, duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              className="modal bg-[#0a0a0c] rounded-3xl w-full max-w-5xl max-h-[94dvh] overflow-hidden border border-white/10 flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-8 py-5 border-b border-white/10">
                <div>
                  <div className="text-[#e11d48] text-sm tracking-[2px]">{selectedCar.brand}</div>
                  <div className="text-4xl font-semibold tracking-tighter">{selectedCar.model}</div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleFavorite(selectedCar.id)} className="p-3 rounded-2xl hover:bg-white/5">
                    <Heart className={`w-5 h-5 ${favorites.includes(selectedCar.id) ? 'fill-[#e11d48] text-[#e11d48]' : ''}`} />
                  </button>
                  <button onClick={() => setSelectedCar(null)} className="p-3 hover:bg-white/5 rounded-2xl">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <div className="grid md:grid-cols-5 gap-0">
                  {/* Image Gallery */}
                  <div className="md:col-span-3 relative bg-black h-[320px] md:h-auto">
                    <img 
                      src={selectedCar.image_url} 
                      alt={selectedCar.model} 
                      className="absolute inset-0 w-full h-full object-cover" 
                    />
                    <div className="absolute bottom-6 left-6 px-5 py-2 rounded-2xl bg-black/70 backdrop-blur text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> {selectedCar.year} • {selectedCar.body_type}
                    </div>
                    <div className="absolute top-6 right-6 px-4 py-1 bg-[#e11d48] rounded text-sm font-medium">
                      {selectedCar.price_display}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="md:col-span-2 p-8 space-y-7 text-sm">
                    <div>
                      <div className="text-white/50 text-xs mb-1">STARTING PRICE</div>
                      <div className="text-5xl font-semibold tracking-[-2.2px] tabular-nums text-[#e11d48]">{selectedCar.price_display}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                      <div><div className="text-white/50">FUEL</div><div className="font-medium mt-px">{selectedCar.fuel_type}</div></div>
                      <div><div className="text-white/50">TRANSMISSION</div><div className="font-medium mt-px">{selectedCar.transmission}</div></div>
                      <div><div className="text-white/50">MILEAGE</div><div className="font-medium mt-px">{selectedCar.mileage}</div></div>
                      <div><div className="text-white/50">ENGINE</div><div className="font-medium mt-px">{selectedCar.engine}</div></div>
                      <div><div className="text-white/50">POWER</div><div className="font-medium mt-px">{selectedCar.power}</div></div>
                      <div><div className="text-white/50">SAFETY</div><div className="font-medium mt-px flex items-center gap-1.5">Bharat NCAP {selectedCar.safety_rating}★</div></div>
                    </div>

                    <button 
                      onClick={() => { setActiveTab('variants'); window.scrollTo({ top: 400, behavior: 'smooth' }) }}
                      className="w-full mt-2 py-3.5 rounded-2xl bg-white text-black font-medium flex items-center justify-center gap-2 active:bg-white/90"
                    >
                      VIEW ALL VARIANTS & PRICING <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 px-8 pt-6 border-b border-white/10 text-sm">
                  {(['overview', 'specs', 'features', 'variants'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-6 py-3 font-medium border-b-2 transition ${activeTab === tab ? 'border-[#e11d48] text-white' : 'border-transparent text-white/60 hover:text-white'}`}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="p-8">
                  {/* OVERVIEW TAB */}
                  {activeTab === 'overview' && (
                    <div>
                      <p className="text-xl leading-tight text-white/90 max-w-3xl">{selectedCar.description}</p>
                      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {selectedCar.variants.slice(0, 4).map((v, i) => (
                          <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/10">
                            <div className="font-medium">{v.name}</div>
                            <div className="text-[#e11d48] mt-1">{v.price}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SPECS TAB */}
                  {activeTab === 'specs' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6 text-sm">
                      {[
                        ['Engine', selectedCar.engine], ['Power', selectedCar.power], ['Torque', selectedCar.torque],
                        ['Mileage', selectedCar.mileage], ['Transmission', selectedCar.transmission], ['Seating', `${selectedCar.seating} seats`],
                        ['Boot Space', `${selectedCar.boot_space} L`], ['Safety Rating', `Bharat NCAP ${selectedCar.safety_rating}★`],
                        ['Body Type', selectedCar.body_type], ['Fuel Type', selectedCar.fuel_type],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between border-b border-white/10 pb-3">
                          <span className="text-white/60">{label}</span>
                          <span className="font-medium text-right">{val}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* FEATURES TAB */}
                  {activeTab === 'features' && (
                    <div className="grid md:grid-cols-3 gap-8">
                      {(['safety', 'comfort', 'technology'] as const).map((cat) => (
                        <div key={cat}>
                          <div className="uppercase tracking-widest text-xs text-white/50 mb-3">{cat.toUpperCase()}</div>
                          <ul className="space-y-2.5">
                            {selectedCar.features[cat].map((f, idx) => (
                              <li key={idx} className="flex gap-3 text-sm"><span className="text-[#e11d48] mt-1">•</span> {f}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* VARIANTS TAB + INQUIRY FORM */}
                  {activeTab === 'variants' && (
                    <div>
                      <div className="mb-8">
                        <div className="uppercase text-xs tracking-widest mb-4 text-white/60">ALL VARIANTS & PRICING</div>
                        <div className="space-y-3">
                          {selectedCar.variants.map((variant, idx) => (
                            <div key={idx} className="flex justify-between items-center px-6 py-5 rounded-2xl border border-white/10 bg-white/5">
                              <div className="font-medium text-xl tracking-tight">{variant.name}</div>
                              <div className="text-right">
                                <div className="text-[#e11d48] font-semibold text-2xl">{variant.price}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* BOOK TEST DRIVE / GET QUOTE FORM */}
                      <div className="rounded-3xl bg-[#121214] p-8 border border-white/10">
                        <div className="text-2xl font-semibold tracking-tight mb-1">Book a Test Drive or Get Quote</div>
                        <div className="text-white/60 mb-6">Our experts will get back to you within 2 hours</div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <input value={inquiryForm.name} onChange={e => setInquiryForm({...inquiryForm, name: e.target.value})} placeholder="Full Name *" className="bg-[#0a0a0c] border border-white/15 px-5 py-3.5 rounded-2xl" />
                          <input value={inquiryForm.email} onChange={e => setInquiryForm({...inquiryForm, email: e.target.value})} placeholder="Email Address *" type="email" className="bg-[#0a0a0c] border border-white/15 px-5 py-3.5 rounded-2xl" />
                          <input value={inquiryForm.phone} onChange={e => setInquiryForm({...inquiryForm, phone: e.target.value})} placeholder="Phone Number *" className="bg-[#0a0a0c] border border-white/15 px-5 py-3.5 rounded-2xl" />
                          <input value={inquiryForm.city} onChange={e => setInquiryForm({...inquiryForm, city: e.target.value})} placeholder="City *" className="bg-[#0a0a0c] border border-white/15 px-5 py-3.5 rounded-2xl" />
                          <input type="date" value={inquiryForm.preferred_date} onChange={e => setInquiryForm({...inquiryForm, preferred_date: e.target.value})} className="bg-[#0a0a0c] border border-white/15 px-5 py-3.5 rounded-2xl md:col-span-2" />
                          <textarea value={inquiryForm.message} onChange={e => setInquiryForm({...inquiryForm, message: e.target.value})} rows={3} placeholder="Any specific requirements or questions?" className="md:col-span-2 bg-[#0a0a0c] border border-white/15 px-5 py-4 rounded-2xl" />
                        </div>

                        <button 
                          onClick={submitInquiry} 
                          disabled={submittingInquiry}
                          className="mt-6 w-full py-4 rounded-2xl bg-[#e11d48] hover:bg-[#c81a40] font-medium disabled:opacity-70 flex items-center justify-center gap-3 text-lg"
                        >
                          {submittingInquiry ? 'SUBMITTING...' : 'SUBMIT REQUEST — WE WILL CALL YOU'}
                        </button>
                        <div className="text-center text-xs text-white/40 mt-3">No spam. We respect your time.</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Bottom Bar */}
              <div className="border-t border-white/10 px-8 py-4 flex items-center justify-between bg-black/40">
                <button onClick={() => toggleCompare(selectedCar)} className="flex items-center gap-2 px-6 py-2 rounded-full border border-white/20 text-sm hover:bg-white/5">
                  <GitCompare className="w-4 h-4" /> {compareList.some(c => c.id === selectedCar.id) ? 'REMOVE FROM COMPARE' : 'ADD TO COMPARE'}
                </button>
                <button onClick={() => setSelectedCar(null)} className="text-sm px-8 py-2 hover:underline">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMPARE DRAWER - Outstanding */}
      <AnimatePresence>
        {showCompare && compareList.length >= 2 && (
          <div className="fixed inset-0 z-[80] flex items-end" onClick={() => setShowCompare(false)}>
            <div className="compare-drawer w-full bg-[#0a0a0c] border-t border-white/10 p-8 max-h-[85dvh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <div className="text-3xl font-semibold tracking-tight">Compare Vehicles</div>
                <button onClick={() => setShowCompare(false)}><X /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {compareList.map(car => (
                  <div key={car.id} className="rounded-3xl bg-[#121214] overflow-hidden border border-white/10">
                    <div className="h-44 bg-black relative">
                      <img src={car.image_url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => toggleCompare(car)} className="absolute top-4 right-4 bg-black/70 p-2 rounded-full"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="p-6">
                      <div className="text-xs text-[#e11d48]">{car.brand}</div>
                      <div className="text-3xl font-semibold tracking-tighter">{car.model}</div>
                      <div className="text-xl text-[#e11d48] mt-1">{car.price_display}</div>
                      
                      <div className="mt-7 space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-white/60">Fuel</span><span>{car.fuel_type}</span></div>
                        <div className="flex justify-between"><span className="text-white/60">Mileage</span><span>{car.mileage}</span></div>
                        <div className="flex justify-between"><span className="text-white/60">Safety</span><span>{car.safety_rating}★ NCAP</span></div>
                        <div className="flex justify-between"><span className="text-white/60">Seating</span><span>{car.seating} seats</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <button onClick={() => setShowCompare(false)} className="text-sm text-white/60 hover:text-white">Close comparison</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
