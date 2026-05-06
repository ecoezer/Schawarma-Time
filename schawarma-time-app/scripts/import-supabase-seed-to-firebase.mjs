import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const APP_DIR = path.resolve(__dirname, '..')
const ROOT_DIR = path.resolve(APP_DIR, '..')

function parseEnvFile(content) {
  const env = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    env[key] = value
  }
  return env
}

async function loadFirebaseConfig() {
  const envPath = path.join(APP_DIR, '.env')
  const envRaw = await fs.readFile(envPath, 'utf8')
  const env = parseEnvFile(envRaw)
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
  }
}

function unquoteSqlString(value) {
  if (value === 'NULL') return null
  if (!value.startsWith("'")) return value
  return value.slice(1, -1).replace(/''/g, "'")
}

function splitTopLevelTuples(block) {
  const tuples = []
  let depth = 0
  let start = -1
  let inString = false

  for (let i = 0; i < block.length; i += 1) {
    const ch = block[i]
    const next = block[i + 1]
    if (ch === "'" && inString && next === "'") {
      i += 1
      continue
    }
    if (ch === "'") {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '(') {
      if (depth === 0) start = i
      depth += 1
    } else if (ch === ')') {
      depth -= 1
      if (depth === 0 && start !== -1) {
        tuples.push(block.slice(start, i + 1))
        start = -1
      }
    }
  }
  return tuples
}

function splitSqlValues(inner) {
  const values = []
  let current = ''
  let inString = false
  let bracketDepth = 0
  let parenDepth = 0

  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i]
    const next = inner[i + 1]

    if (ch === "'" && inString && next === "'") {
      current += "''"
      i += 1
      continue
    }
    if (ch === "'") {
      inString = !inString
      current += ch
      continue
    }
    if (!inString) {
      if (ch === '[' || ch === '{') bracketDepth += 1
      if (ch === ']' || ch === '}') bracketDepth -= 1
      if (ch === '(') parenDepth += 1
      if (ch === ')') parenDepth -= 1
      if (ch === ',' && bracketDepth === 0 && parenDepth === 0) {
        values.push(current.trim())
        current = ''
        continue
      }
    }
    current += ch
  }
  if (current.trim()) values.push(current.trim())
  return values
}

function parseCategories(schemaSql) {
  const match = schemaSql.match(/INSERT INTO categories \(name, slug, position\) VALUES\s*([\s\S]*?);/m)
  if (!match) throw new Error('Categories seed not found in schema.sql')
  const tuples = splitTopLevelTuples(match[1])
  return tuples.map((tuple) => {
    const values = splitSqlValues(tuple.slice(1, -1))
    const name = unquoteSqlString(values[0])
    const slug = unquoteSqlString(values[1])
    const position = Number(values[2])
    return {
      id: slug,
      name,
      slug,
      position,
      is_active: true,
      created_at: new Date().toISOString(),
    }
  })
}

function parseRestaurantSettings(schemaSql, seedSql) {
  const heroMatch = seedSql.match(/UPDATE restaurant_settings\s+SET hero_images = '([^']+)'::jsonb;/m)
  const heroImages = heroMatch ? JSON.parse(heroMatch[1]) : []
  return {
    id: 'default',
    name: 'Schawarma-Time',
    description: 'Die besten Smash Burger in Hildesheim – frisch, saftig und unwiderstehlich!',
    address: 'Bahnhofsallee 14a, 31134 Hildesheim',
    phone: '05121 3030551',
    email: 'info@schawarma-time.de',
    logo_url: null,
    hero_images: heroImages,
    rating: 4.8,
    review_count: 30,
    is_delivery_active: true,
    delivery_fee: 2,
    min_order_amount: 15,
    estimated_delivery_time: 35,
    delivery_radius_km: 5,
    delivery_zones: [],
    hours: {
      monday: { open: '11:30', close: '22:00', is_closed: false },
      tuesday: { open: '11:30', close: '22:00', is_closed: false },
      wednesday: { open: '11:30', close: '22:00', is_closed: false },
      thursday: { open: '11:30', close: '22:00', is_closed: false },
      friday: { open: '11:30', close: '23:00', is_closed: false },
      saturday: { open: '11:30', close: '23:00', is_closed: false },
      sunday: { open: '11:30', close: '22:00', is_closed: false },
    },
    is_halal_certified: true,
    announcement: null,
    is_announcement_active: false,
    is_map_mode_active: false,
    is_hero_active: true,
    is_search_active: true,
    revenue_goal_daily: 500,
    tags: [],
    payment_methods: { cash: true, card_on_delivery: true },
  }
}

function parseCoupons(schemaSql) {
  const match = schemaSql.match(/INSERT INTO coupons \([^)]+\) VALUES\s*([\s\S]*?);/m)
  if (!match) return []
  const tuples = splitTopLevelTuples(match[1])
  return tuples.map((tuple) => {
    const values = splitSqlValues(tuple.slice(1, -1))
    const code = unquoteSqlString(values[0])
    return {
      id: code.toLowerCase(),
      code,
      discount_type: unquoteSqlString(values[1]),
      discount_value: Number(values[2]),
      min_order_amount: Number(values[3]),
      max_uses: null,
      used_count: 0,
      is_first_order_only: values[4] === 'TRUE' || values[4] === 'true',
      is_active: true,
      expires_at: null,
      created_at: new Date().toISOString(),
    }
  })
}

function parseProducts(seedSql) {
  const regex = /\(\(SELECT id FROM categories WHERE slug = '([^']+)'\),\s*'((?:[^']|'')*)',\s*(NULL|'(?:[^']|'')*'),\s*([0-9.]+),\s*(NULL|'(?:[^']|'')*'),\s*(true|false),\s*(true|false),\s*(true|false),\s*(true|false),\s*(true|false),\s*'((?:[^']|'')*)'::jsonb,\s*([0-9]+)\)/g
  const products = []
  let match
  while ((match = regex.exec(seedSql)) !== null) {
    const [
      ,
      categorySlug,
      nameRaw,
      descriptionRaw,
      priceRaw,
      imageUrlRaw,
      isActiveRaw,
      isMostLikedRaw,
      isVegetarianRaw,
      isVeganRaw,
      isHalalRaw,
      extraGroupsRaw,
      positionRaw,
    ] = match

    const name = nameRaw.replace(/''/g, "'")
    products.push({
      id: `${categorySlug}-${Number(positionRaw)}`,
      category_id: categorySlug,
      name,
      description: descriptionRaw === 'NULL' ? null : unquoteSqlString(descriptionRaw),
      price: Number(priceRaw),
      image_url: imageUrlRaw === 'NULL' ? null : unquoteSqlString(imageUrlRaw),
      image_url_modal: imageUrlRaw === 'NULL' ? null : unquoteSqlString(imageUrlRaw),
      is_active: isActiveRaw === 'true',
      is_most_liked: isMostLikedRaw === 'true',
      is_vegetarian: isVegetarianRaw === 'true',
      is_vegan: isVeganRaw === 'true',
      is_halal: isHalalRaw === 'true',
      allergens: [],
      calories: null,
      extra_groups: JSON.parse(extraGroupsRaw.replace(/''/g, "'")),
      sizes: [],
      position: Number(positionRaw),
      created_at: new Date().toISOString(),
    })
  }
  return products
}

async function main() {
  const [schemaSql, seedSql] = await Promise.all([
    fs.readFile(path.join(ROOT_DIR, 'supabase', 'schema.sql'), 'utf8'),
    fs.readFile(path.join(ROOT_DIR, 'supabase', 'seed.sql'), 'utf8'),
  ])

  const firebaseConfig = await loadFirebaseConfig()
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  const restaurantSettings = parseRestaurantSettings(schemaSql, seedSql)
  const categories = parseCategories(schemaSql)
  const products = parseProducts(seedSql)
  const coupons = parseCoupons(schemaSql)

  await setDoc(doc(db, 'restaurant_settings', restaurantSettings.id), restaurantSettings, { merge: true })

  const categoryBatch = writeBatch(db)
  categories.forEach((category) => {
    categoryBatch.set(doc(db, 'categories', category.id), category, { merge: true })
  })
  await categoryBatch.commit()

  for (let index = 0; index < products.length; index += 400) {
    const batch = writeBatch(db)
    for (const product of products.slice(index, index + 400)) {
      batch.set(doc(db, 'products', product.id), product, { merge: true })
    }
    await batch.commit()
  }

  if (coupons.length > 0) {
    const couponBatch = writeBatch(db)
    coupons.forEach((coupon) => {
      couponBatch.set(doc(db, 'coupons', coupon.id), coupon, { merge: true })
    })
    await couponBatch.commit()
  }

  console.log(`Imported ${categories.length} categories, ${products.length} products, ${coupons.length} coupons.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
