import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: getUser() renova o token de sessão nos cookies.
  // Não remover este await — é ele que garante que os cookies chegam aos Server Components.
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Injeta pathname como header para layouts server-side detectarem a etapa ativa
  supabaseResponse.headers.set('x-pathname', pathname)

  const isAuthRoute = pathname.startsWith('/login') ||
    pathname.startsWith('/cadastro') ||
    pathname.startsWith('/recuperar-senha')
  const isOnboarding = pathname.startsWith('/onboarding')
  const isAuthCallback = pathname.startsWith('/auth/callback')

  // Callback de confirmação de email: deixa passar sempre
  if (isAuthCallback) {
    return supabaseResponse
  }

  // Não autenticado: só pode acessar rotas de auth
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    // Propagar cookies de sessão para o redirect
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // Autenticado em rota de auth: vai para dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  if (user) {
    // Verifica se o usuário tem perfil na organização
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    // Autenticado sem organização: vai para onboarding (exceto se já estiver lá)
    if (!perfil && !isOnboarding) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      return redirectResponse
    }

    // Autenticado com organização tentando acessar onboarding: vai para dashboard
    if (perfil && isOnboarding) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      return redirectResponse
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
