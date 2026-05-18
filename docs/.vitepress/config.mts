import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Startuplab Business Ticketing",
  description: "Documentation for the Startuplab System",
  base: '/docs/', // To connect with the /docs path in the system
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/getting-started' }
    ],

    sidebar: [
      {
        text: '🚀 Getting Started',
        items: [
          { text: 'Overview', link: '/getting-started' },
          { text: 'User Manual', link: '/USER_MANUAL' }
        ]
      },
      {
        text: '🧠 Core Concepts',
        items: [
          { text: 'System Flow', link: '/system-flow-analysis' },
          { text: 'Event Promotion Strategy', link: '/EVENT_PROMOTION_STRATEGY' }
        ]
      },
      {
        text: '⚙️ Administration',
        items: [
          { text: 'Admin Plans Report', link: '/ADMIN_PLANS_REPORT' },
          { text: 'Hitpay API', link: '/hitpay-api-summary' }
        ]
      }
    ],

    search: {
      provider: 'local'
    }
  }
})
