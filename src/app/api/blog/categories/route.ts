import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { fallbackBlogCategories } from '@/lib/fallback-data';

export async function GET() {
  try {
    const { data: categories, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('name_ru', { ascending: true });

    if (error) throw error;

    const categoriesWithCount = await Promise.all(
      (categories || []).map(async (category) => {
        const { count } = await supabase
          .from('blog_posts')
          .select('id', { count: 'exact', head: true })
          .eq('category_id', category.id)
          .eq('status', 'published');

        return { ...category, posts_count: count || 0 };
      })
    );

    return NextResponse.json(categoriesWithCount);
  } catch (error) {
    console.warn('[blog/categories] Supabase unavailable, using fallback data:', error);
    return NextResponse.json(fallbackBlogCategories);
  }
}
