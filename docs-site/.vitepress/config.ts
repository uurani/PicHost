import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const docsBase = 'https://o96u.github.io/PicHost'

const zhSidebar = [
  {
    text: '开始',
    items: [
      { text: '文档首页', link: '/guide/' },
      { text: '快速开始', link: '/guide/getting-started' },
      { text: '本地开发', link: '/guide/local-dev' }
    ]
  },
  {
    text: '部署与配置',
    items: [
      { text: '环境变量', link: '/guide/configuration' },
      { text: '反向代理', link: '/guide/reverse-proxy' },
      { text: '双域名分离', link: '/guide/domain-separation' },
      { text: 'Cloudflare / CF 优选', link: '/guide/cloudflare-deployment' }
    ]
  },
  {
    text: '使用',
    items: [
      { text: '存储', link: '/guide/storage' },
      { text: '用户与权限', link: '/guide/users-and-permissions' },
      { text: 'API', link: '/guide/api' },
      { text: 'Twikoo', link: '/guide/twikoo' }
    ]
  },
  {
    text: '升级',
    items: [
      { text: '更新日志', link: '/guide/changelog' },
      { text: '常见问题', link: '/guide/faq' }
    ]
  }
]

const enSidebar = [
  {
    text: 'Getting started',
    items: [
      { text: 'Overview', link: '/en/guide/' },
      { text: 'Quick start', link: '/en/guide/getting-started' },
      { text: 'Local development', link: '/en/guide/local-dev' }
    ]
  },
  {
    text: 'Deploy & configure',
    items: [
      { text: 'Environment variables', link: '/en/guide/configuration' },
      { text: 'Reverse proxy', link: '/en/guide/reverse-proxy' },
      { text: 'Dual-domain separation', link: '/en/guide/domain-separation' },
      { text: 'Cloudflare deployment', link: '/en/guide/cloudflare-deployment' }
    ]
  },
  {
    text: 'Usage',
    items: [
      { text: 'Storage', link: '/en/guide/storage' },
      { text: 'Users & permissions', link: '/en/guide/users-and-permissions' },
      { text: 'API', link: '/en/guide/api' },
      { text: 'Twikoo', link: '/en/guide/twikoo' }
    ]
  },
  {
    text: 'Upgrade',
    items: [
      { text: 'Changelog', link: '/en/guide/changelog' },
      { text: 'FAQ', link: '/en/guide/faq' }
    ]
  }
]

export default withMermaid(
  defineConfig({
  base: '/PicHost/',
  title: 'PicHost',
  description: '自托管图床文档 · Self-hosted image hosting docs',
  head: [['link', { rel: 'icon', href: '/PicHost/favicon.ico' }]],
  vite: {
    optimizeDeps: {
      // mermaid → fastdom 为 CJS；dev 模式须预构建，否则整站白屏
      include: ['mermaid', 'fastdom']
    }
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '指南', link: '/guide/getting-started' },
          { text: 'API', link: '/guide/api' },
          { text: 'GitHub', link: 'https://github.com/O96u/PicHost' }
        ],
        sidebar: zhSidebar,
        docFooter: { prev: '上一页', next: '下一页' },
        outline: { label: '本页目录' },
        lastUpdated: { text: '最后更新' },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        langMenuLabel: '语言'
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/getting-started' },
          { text: 'API', link: '/en/guide/api' },
          { text: 'GitHub', link: 'https://github.com/O96u/PicHost' }
        ],
        sidebar: enSidebar,
        docFooter: { prev: 'Previous', next: 'Next' },
        outline: { label: 'On this page' },
        lastUpdated: { text: 'Last updated' },
        returnToTopLabel: 'Back to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Appearance',
        langMenuLabel: 'Language'
      }
    }
  },
  themeConfig: {
    socialLinks: [{ icon: 'github', link: 'https://github.com/O96u/PicHost' }],
    search: { provider: 'local' },
    editLink: {
      pattern: `${docsBase}/edit/main/docs-site/:path`,
      text: '在 GitHub 上编辑此页'
    }
  }
  })
)
