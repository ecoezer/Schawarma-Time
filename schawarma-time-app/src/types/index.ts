// =====================
// MENU TYPES
// =====================

export interface Category {
  id: string
  name: string
  slug: string
  position: number
  is_active: boolean
  created_at: string
}

export interface Extra {
  id: string
  name: string
  price: number
  is_active: boolean
  popularity_rank?: number // e.g., 1 for most popular
  popularity_text?: string // e.g., "bestellt von 5+ anderen..."
}

export interface ExtraGroup {
  id: string
  name: string
  required: boolean
  max_select: number
  extras: Extra[]
}

export interface ProductSize {
  id: string
  name: string
  price: number
}

export interface Product {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_active: boolean
  is_most_liked: boolean
  is_vegetarian: boolean
  is_vegan: boolean
  is_halal: boolean
  allergens: string[]
  calories: number | null
  extra_groups: ExtraGroup[]
  sizes: ProductSize[]
  position: number
  created_at: string
  category?: Category
}

// =====================
// CART TYPES
// =====================

export interface CartExtra {
  id: string        // v12: was extra_id — must match Extra.id key used across the codebase
  name: string
  price: number
  group_name: string
}

export interface CartItem {
  id: string // unique cart item id (uuid)
  product_id: string
  name: string
  price: number
  image_url: string | null
  quantity: number
  selected_extras: CartExtra[]
  selected_size_id?: string
  selected_size_name?: string
  note: string
  total: number
}

// =====================
// ORDER TYPES
// =====================

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled'
export type PaymentMethod = 'cash' | 'card_on_delivery'

export interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  extras: CartExtra[]
  note: string
  subtotal: number
}

export interface Order {
  id: string
  order_number: string
  user_id: string | null
  customer_name: string
  customer_phone: string
  customer_email: string
  delivery_address: string
  delivery_lat: number | null
  delivery_lng: number | null
  items: OrderItem[]
  subtotal: number
  delivery_fee: number
  discount_amount: number
  coupon_code: string | null
  total: number
  status: OrderStatus
  payment_method: PaymentMethod
  estimated_delivery_time: number | null
  notes: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

// =====================
// RESTAURANT SETTINGS
// =====================

export interface DayHours {
  open: string   // "11:30"
  close: string  // "22:00"
  is_closed: boolean
}

export interface RestaurantSettings {
  id: string
  name: string
  description: string
  address: string
  phone: string
  email: string
  logo_url: string | null
  hero_images: string[]
  rating: number
  review_count: number
  is_delivery_active: boolean
  delivery_fee: number
  min_order_amount: number
  estimated_delivery_time: number
  delivery_radius_km: number
  delivery_zones: DeliveryZone[]
  hours: Record<string, DayHours>
  is_halal_certified: boolean
  announcement: string | null
  is_announcement_active: boolean
  is_map_mode_active: boolean
  is_hero_active: boolean
  is_search_active: boolean
  revenue_goal_daily: number
  tags: string[]
}

export interface DeliveryZone {
  id: string
  name: string
  min_order: number
  delivery_fee: number
  polygon: [number, number][]
}

// =====================
// USER / AUTH TYPES
// =====================

export type UserRole = 'customer' | 'cashier' | 'kitchen' | 'manager'

export interface UserAddress {
  id: string
  label: string // "Zuhause", "Büro"
  street: string
  city: string
  postal_code: string
  lat: number | null
  lng: number | null
}

export interface UserProfile {
  id: string
  email: string
  full_name: string
  phone: string | null
  birth_date: string | null
  role: UserRole
  addresses: UserAddress[]
  loyalty_points: number
  total_orders: number
  created_at: string
}

// =====================
// COUPON / LOYALTY
// =====================

export type DiscountType = 'percentage' | 'fixed'

export interface Coupon {
  id: string
  code: string
  discount_type: DiscountType
  discount_value: number
  min_order_amount: number
  max_uses: number | null
  used_count: number
  is_first_order_only: boolean
  is_active: boolean
  expires_at: string | null
  created_at: string
}

// =====================
// ANALYTICS
// =====================

export interface DailyRevenue {
  date: string
  revenue: number
  order_count: number
}

export interface TopProduct {
  product_id: string
  product_name: string
  total_sold: number
  revenue: number
}

export interface HourlyOrders {
  hour: number
  order_count: number
}

// =====================
// CUSTOMER (Admin View)
// =====================

export interface Customer {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  total_orders: number
  loyalty_points: number
  addresses: UserAddress[]
  created_at: string
}

// =====================
// NOTIFICATION
// =====================

export interface Notification {
  id: string
  type: 'new_order' | 'order_cancelled' | 'review'
  message: string
  is_read: boolean
  data: Record<string, unknown>
  created_at: string
}
