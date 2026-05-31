export interface Car {
  id: number
  brand: string
  model: string
  starting_price: number
  price_display: string
  year: number
  body_type: string
  fuel_type: string
  transmission: string
  mileage: string
  engine: string
  power: string
  torque: string
  seating: number
  boot_space: number
  safety_rating: number
  image_url: string
  images: string[]
  description: string
  features: {
    safety: string[]
    comfort: string[]
    technology: string[]
  }
  variants: Array<{
    name: string
    price: string
    key_features: string[]
  }>
  rating: number
  popular: boolean
}

export interface Inquiry {
  id?: number
  car_id: number
  name: string
  email: string
  phone: string
  city: string
  message?: string
  preferred_date?: string
  created_at?: string
}

export type BodyType = 'Hatchback' | 'Sedan' | 'Compact SUV' | 'SUV' | 'MPV' | 'Electric SUV' | 'Coupe'
export type FuelType = 'Petrol' | 'Diesel' | 'CNG' | 'Electric' | 'Hybrid'
