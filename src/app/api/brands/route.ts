import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { fallbackBrands } from '@/lib/fallback-data'

export async function GET() {
  try {
    const { data: brands, error } = await supabase
      .from('brands')
      .select('*')
      .order('name')

    if (error) throw error

    return NextResponse.json(brands)
  } catch (error) {
    console.warn('[brands] Supabase unavailable, using fallback data:', error)
    return NextResponse.json(fallbackBrands)
  }
}
