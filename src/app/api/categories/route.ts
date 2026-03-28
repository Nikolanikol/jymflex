import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { fallbackCategories } from '@/lib/fallback-data'

export async function GET() {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name_ko')

    if (error) throw error

    return NextResponse.json(categories)
  } catch (error) {
    console.warn('[categories] Supabase unavailable, using fallback data:', error)
    return NextResponse.json(fallbackCategories)
  }
}
