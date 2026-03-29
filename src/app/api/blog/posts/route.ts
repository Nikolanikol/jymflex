import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { BlogPostsResponse, BlogPostPreview } from '@/types/blog';
import { fallbackBlogPosts } from '@/lib/fallback-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '12');
  const offset = (page - 1) * limit;
  const status = searchParams.get('status') || 'published';
  const categoryId = searchParams.get('category_id');
  const tagId = searchParams.get('tag_id');
  const authorId = searchParams.get('author_id');
  const search = searchParams.get('search');
  const sortField = searchParams.get('sort') || 'published_at';
  const sortOrder = searchParams.get('order') || 'desc';

  try {
    let query = supabase
      .from('blog_posts')
      .select(
        `id, title, slug, excerpt, cover_image, status, views_count, published_at, created_at,
        author:users!author_id(id, name, email, avatar_url),
        category:blog_categories(id, name_ko, name_ru, name_en, slug)`,
        { count: 'exact' }
      );

    if (status) query = query.eq('status', status);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (authorId) query = query.eq('author_id', authorId);

    if (tagId) {
      const { data: postIds } = await supabase
        .from('blog_post_tags')
        .select('post_id')
        .eq('tag_id', tagId);

      if (postIds && postIds.length > 0) {
        query = query.in('id', postIds.map((item) => item.post_id));
      } else {
        return NextResponse.json({ posts: [], pagination: { total: 0, page, limit, totalPages: 0 } });
      }
    }

    if (search) query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);

    query = query.order(sortField, { ascending: sortOrder === 'asc' });
    query = query.range(offset, offset + limit - 1);

    const { data: posts, error, count } = await query;

    if (error) throw error;

    const response: BlogPostsResponse = {
      posts: (posts || []) as unknown as BlogPostPreview[],
      pagination: { total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.warn('[blog/posts] Supabase unavailable, using fallback data:', error);

    let filtered = [...fallbackBlogPosts];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt ?? '').toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    const response: BlogPostsResponse = {
      posts: paginated,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };

    return NextResponse.json(response);
  }
}
