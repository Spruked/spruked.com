import { PAGE_SLUGS, type PageContentMap, type PageSlug, pageContentDefaults } from '@/data/page-content';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type PageContentRow = {
  slug: PageSlug;
  content: PageContentMap[PageSlug];
};

function cloneDefault<S extends PageSlug>(slug: S): PageContentMap[S] {
  return structuredClone(pageContentDefaults[slug]);
}

export function isPageSlug(value: string | null): value is PageSlug {
  return PAGE_SLUGS.includes((value ?? '') as PageSlug);
}

export async function getPageContent<S extends PageSlug>(slug: S): Promise<PageContentMap[S]> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return cloneDefault(slug);
  }

  const { data, error } = await supabase
    .from('page_content')
    .select('content')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data?.content) {
    return cloneDefault(slug);
  }

  return {
    ...cloneDefault(slug),
    ...data.content,
  } as PageContentMap[S];
}

export async function updatePageContent<S extends PageSlug>(slug: S, content: PageContentMap[S]) {
  const supabase = createSupabaseServerClient({ type: 'service' });

  if (!supabase) {
    throw new Error('Supabase service credentials are not configured.');
  }

  const { error } = await supabase
    .from('page_content')
    .upsert({ slug, content }, { onConflict: 'slug' });

  if (error) {
    throw error;
  }
}
