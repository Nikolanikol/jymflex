import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { fallbackBlogTags } from '@/lib/fallback-data';

export async function GET() {
  try {
    const { data: tags, error } = await supabase
      .from('blog_tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    const tagsWithCount = await Promise.all(
      (tags || []).map(async (tag) => {
        const { count } = await supabase
          .from('blog_post_tags')
          .select('post_id', { count: 'exact', head: true })
          .eq('tag_id', tag.id);

        return { ...tag, posts_count: count || 0 };
      })
    );

    return NextResponse.json(tagsWithCount);
  } catch (error) {
    console.warn('[blog/tags] Supabase unavailable, using fallback data:', error);
    return NextResponse.json(fallbackBlogTags);
  }
}
