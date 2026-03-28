import { supabase } from '@/lib/supabase'
import { sanitizeSearchQuery } from '@/utils/sanitize'
import { NextRequest, NextResponse } from 'next/server'
import { fallbackProducts, FALLBACK_PAGINATION } from '@/lib/fallback-data'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const category = searchParams.get('category')
  const brand = searchParams.get('brand')
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const search = searchParams.get('search')
  const sort = searchParams.get('sort') || 'created_at'
  const order = searchParams.get('order') || 'desc'
  const featured = searchParams.get('featured')
  const isNew = searchParams.get('new')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '12')

  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name_ko, name_ru, name_en, slug),
        brand:brands(id, name, logo_url)
      `, { count: 'exact' })

    if (category) {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single()

      if (categoryData) {
        query = query.eq('category_id', categoryData.id)
      }
    }

    if (brand) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(brand)) {
        query = query.eq('brand_id', brand)
      }
    }

    if (minPrice) query = query.gte('price', parseFloat(minPrice))
    if (maxPrice) query = query.lte('price', parseFloat(maxPrice))

    if (search && search.trim()) {
      const sanitizedSearch = sanitizeSearchQuery(search)
      if (sanitizedSearch) {
        query = query.or(
          `name_ko.ilike.%${sanitizedSearch}%,` +
          `name_ru.ilike.%${sanitizedSearch}%,` +
          `name_en.ilike.%${sanitizedSearch}%`
        )
      }
    }

    if (featured === 'true') query = query.eq('is_featured', true)
    if (isNew === 'true') query = query.eq('is_new', true)

    query = query.order(sort, { ascending: order === 'asc' })

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data: products, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.warn('[products] Supabase unavailable, using fallback data:', error)

    // Apply basic client-side filtering on fallback data
    let filtered = [...fallbackProducts]
    if (featured === 'true') filtered = filtered.filter(p => p.is_featured)
    if (isNew === 'true') filtered = filtered.filter(p => p.is_new)
    if (category) filtered = filtered.filter(p => p.category?.slug === category)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(p =>
        p.name_ru?.toLowerCase().includes(q) ||
        p.name_en?.toLowerCase().includes(q)
      )
    }

    const total = filtered.length
    const from = (page - 1) * limit
    const paginated = filtered.slice(from, from + limit)

    return NextResponse.json({
      products: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      _fallback: true,
    })
  }
}
