# Graph Report - .  (2026-07-25)

## Corpus Check
- Large corpus: 365 files · ~558,585 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1371 nodes · 2910 edges · 82 communities (61 shown, 21 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.69)
- Token cost: 341,306 input · 0 output

## Community Hubs (Navigation)
- Order Lifecycle & Webhooks
- Admin Product & CRM Pages
- Storefront Cart & Checkout
- Admin Coupon/Connection APIs
- Shipping Provider Factory
- Architecture Docs & Patterns
- Dev Tooling Dependencies
- Coupons Feature
- Admin CRUD API Routes
- Runtime Dependencies
- Customers Data Layer
- TypeScript Config
- Dashboard Charts
- Commerce Growth Schema
- Spec Kit Shell Scripts
- WhatsApp Messaging Layer
- Categories Admin UX
- Order Analytics
- Product Reviews UI
- Reviews Data & Moderation
- RTK Query API Slices
- Dashboard Overview & CSV
- Product Service & Public API
- Order Notifications & Email
- Testimonials Display
- Social OAuth Providers
- Admin UX Spec History
- App Layouts & Providers
- n8n Integration & Zones
- Store Category Pages
- Social Connections Core
- Admin Shell & Theme
- Product Filtering UI
- Category Grid & Repository
- Social Connections UI
- Testimonials Admin CRUD
- Customer Detail & Geo
- Button Component
- Instagram Provider
- Token Encryption & OAuth State
- Landing Funnel Pages
- Store Pages & Footer
- Hero & Search Hooks
- Store Navbar & Branding
- Input Component
- Select Component
- Lookbook Hero
- Product Repository
- Category Service
- Auth State & API
- MSW Mock Worker
- i18n Dictionary
- Checkbox Component
- Radio Component
- Textarea Component
- Customers Admin List
- Admin Login
- TikTok Provider
- WhatsApp OAuth Provider
- Dashboard Analytics Spec
- Mock Social Provider
- Stat Tiles
- Locale Provider
- Store Product Page
- Minor Cluster 64
- Minor Cluster 65
- Minor Cluster 66
- Minor Cluster 67
- Minor Cluster 68
- Minor Cluster 69
- Minor Cluster 70
- Minor Cluster 71
- Minor Cluster 72
- Minor Cluster 73
- Minor Cluster 74
- Minor Cluster 75
- Minor Cluster 76
- Minor Cluster 77
- Minor Cluster 78
- Minor Cluster 79

## God Nodes (most connected - your core abstractions)
1. `useLocale()` - 123 edges
2. `Product` - 47 edges
3. `Category` - 29 edges
4. `ProductService` - 28 edges
5. `SocialPlatform` - 26 edges
6. `OrderWithDetails` - 25 edges
7. `AdminOverviewPage()` - 24 edges
8. `supabase` - 22 edges
9. `verifyAdmin()` - 21 edges
10. `extractToken()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Server-side order state machine enforcement` --implements--> `canTransition()`  [EXTRACTED]
  docs/specs/order-cycle-redesign.md → src/lib/orderStateMachine.ts
- `Principle IV: No Business Logic in Components` --conceptually_related_to--> `AGENTS.md — 7alm AI Agent Entrypoint`  [INFERRED]
  .specify/memory/constitution.md → AGENTS.md
- `Principle III: RTL/i18n Correctness` --conceptually_related_to--> `AGENTS.md — 7alm AI Agent Entrypoint`  [INFERRED]
  .specify/memory/constitution.md → AGENTS.md
- `speckit-constitution Skill` --references--> `Constitution Template`  [EXTRACTED]
  .claude/skills/speckit-constitution/SKILL.md → .specify/templates/constitution-template.md
- `speckit-constitution Skill` --references--> `Implementation Plan Template`  [EXTRACTED]
  .claude/skills/speckit-constitution/SKILL.md → .specify/templates/plan-template.md

## Import Cycles
- 3-file cycle: `src/features/customers/customers.api.ts -> src/lib/redux/api/baseQuery.ts -> src/lib/redux/store.ts -> src/features/customers/customers.api.ts`
- 3-file cycle: `src/features/coupons/coupons.api.ts -> src/lib/redux/api/baseQuery.ts -> src/lib/redux/store.ts -> src/features/coupons/coupons.api.ts`
- 3-file cycle: `src/features/auth/auth.api.ts -> src/lib/redux/api/baseQuery.ts -> src/lib/redux/store.ts -> src/features/auth/auth.api.ts`
- 3-file cycle: `src/features/categories/categories.api.ts -> src/lib/redux/api/baseQuery.ts -> src/lib/redux/store.ts -> src/features/categories/categories.api.ts`
- 3-file cycle: `src/features/geo/geo.api.ts -> src/lib/redux/api/baseQuery.ts -> src/lib/redux/store.ts -> src/features/geo/geo.api.ts`
- 3-file cycle: `src/features/media/media.api.ts -> src/lib/redux/api/baseQuery.ts -> src/lib/redux/store.ts -> src/features/media/media.api.ts`
- 3-file cycle: `src/features/orders/orders.api.ts -> src/lib/redux/api/baseQuery.ts -> src/lib/redux/store.ts -> src/features/orders/orders.api.ts`
- 3-file cycle: `src/features/products/products.api.ts -> src/lib/redux/api/baseQuery.ts -> src/lib/redux/store.ts -> src/features/products/products.api.ts`
- 3-file cycle: `src/features/reviews/reviews.api.ts -> src/lib/redux/api/baseQuery.ts -> src/lib/redux/store.ts -> src/features/reviews/reviews.api.ts`
- 3-file cycle: `src/features/social/social.api.ts -> src/lib/redux/api/baseQuery.ts -> src/lib/redux/store.ts -> src/features/social/social.api.ts`
- 3-file cycle: `src/features/store/store.api.ts -> src/lib/redux/api/baseQuery.ts -> src/lib/redux/store.ts -> src/features/store/store.api.ts`
- 3-file cycle: `src/features/testimonials/testimonials.api.ts -> src/lib/redux/api/baseQuery.ts -> src/lib/redux/store.ts -> src/features/testimonials/testimonials.api.ts`

## Hyperedges (group relationships)
- **Extension Hooks Pattern Shared Across All Spec-kit Commands** — specify_extensions_yml_hooks_mechanism, claude_skills_speckit_analyze_skill_overview, claude_skills_speckit_checklist_skill_overview, claude_skills_speckit_clarify_skill_overview, claude_skills_speckit_constitution_skill_overview, claude_skills_speckit_converge_skill_overview, claude_skills_speckit_implement_skill_overview, claude_skills_speckit_plan_skill_overview, claude_skills_speckit_specify_skill_overview, claude_skills_speckit_tasks_skill_overview, claude_skills_speckit_taskstoissues_skill_overview [EXTRACTED 1.00]
- **Full SDD Cycle: specify -> plan -> tasks -> implement** — specify_workflows_speckit_workflow_overview, claude_skills_speckit_specify_skill_overview, claude_skills_speckit_plan_skill_overview, claude_skills_speckit_tasks_skill_overview, claude_skills_speckit_implement_skill_overview [EXTRACTED 1.00]
- **spec.md / plan.md / tasks.md Core Artifacts Checked by Analyze & Converge** — specify_templates_spec_template_overview, specify_templates_plan_template_overview, specify_templates_tasks_template_overview, claude_skills_speckit_analyze_skill_overview, claude_skills_speckit_converge_skill_overview [INFERRED 0.85]
- **Admin visual + i18n overhaul sequence (003 superseded by 004->005->006)** — specs_003_admin_arabic_rtl_spec_document, specs_004_admin_design_system_spec_document, specs_005_admin_bento_grid_redesign_spec_document, specs_006_admin_i18n_rtl_toggle_spec_document [EXTRACTED 1.00]
- **Post-delivery WhatsApp review-request flow** — docs_specs_commerce_growth_phase_review_request_automation, docs_specs_commerce_growth_phase_verified_buyer_token, docs_specs_review_token_phone_document, docs_specs_order_cycle_redesign_test_provider_autoprogression [EXTRACTED 0.90]
- **001/002 must land before 003 admin-overhaul sequencing** — specs_001_categories_admin_ux_spec_document, specs_002_dashboard_analytics_spec_document, specs_003_admin_arabic_rtl_spec_document [EXTRACTED 1.00]

## Communities (82 total, 21 thin omitted)

### Community 0 - "Order Lifecycle & Webhooks"
Cohesion: 0.06
Nodes (41): Coupon invalid-at-submit fail-loud rule, OrderDetailsDrawer discount reconciliation, Order Lifecycle Redesign Spec, Optional per-order WhatsApp confirmation, Server-side order state machine enforcement, Test-provider auto-progression, Idempotent shipping-webhook transition guard, OrdersPage() (+33 more)

### Community 1 - "Admin Product & CRM Pages"
Cohesion: 0.06
Nodes (38): CustomerDetailPage(), CreateProductPage(), EditProductPage(), ProductsPage(), formatTime(), QUICK_REPLY_KEYS, WhatsAppChat(), WhatsAppChatProps (+30 more)

### Community 2 - "Storefront Cart & Checkout"
Cohesion: 0.06
Nodes (43): CheckoutForm(), CheckoutFormProps, CartDrawer(), CartDrawerProps, CartLineItem(), CartLineItemProps, CartPageBody(), StoreCheckoutForm() (+35 more)

### Community 3 - "Admin Coupon/Connection APIs"
Cohesion: 0.08
Nodes (36): Verified-Buyer Review Token, POST(), DELETE(), GET(), DELETE(), PUT(), VALID_TYPES, GET() (+28 more)

### Community 4 - "Shipping Provider Factory"
Cohesion: 0.08
Nodes (18): SOCIAL_MOCK_MODE demo-without-credentials mode, Social Provider Factory abstraction, ShippingDeliveryInput, ShippingDeliveryResult, ShippingProviderName, ShippingTrackingResult, AbsProvider, TODO: Replace with actual ABS API integration when credentials are available. (+10 more)

### Community 5 - "Architecture Docs & Patterns"
Cohesion: 0.07
Nodes (50): Admin Authentication Flow, Dynamic Product Landing Pages, Factory Pattern (Shipping), AGENTS.md — 7alm AI Agent Entrypoint, Repository Pattern (Data Access), Service ↔ Repository Separation, RTK Query + Tag Invalidation (Client State), State Machine Pattern (Orders) (+42 more)

### Community 6 - "Dev Tooling Dependencies"
Cohesion: 0.04
Nodes (47): @chromatic-com/storybook, eslint, eslint-config-next, eslint-plugin-storybook, msw, msw-storybook-addon, devDependencies, @chromatic-com/storybook (+39 more)

### Community 7 - "Coupons Feature"
Cohesion: 0.08
Nodes (20): CouponsPage(), CouponForm(), CouponFormProps, toDateInputValue(), CouponList(), CouponListProps, ApiEnvelope, couponsApi (+12 more)

### Community 8 - "Admin CRUD API Routes"
Cohesion: 0.08
Nodes (6): Storefront Product Search Workstream (WS4), metadata, NOTE: Insert/Update operations for admin are typically handled directly in the A, testimonialsRepository, testimonialsService, supabase

### Community 9 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (43): embla-carousel-autoplay, embla-carousel-react, lucide-react, motion, next, browserslist, dependencies, embla-carousel-autoplay (+35 more)

### Community 10 - "Customers Data Layer"
Cohesion: 0.11
Nodes (15): Phone-keyed review token design decision, CustomerListProps, ApiEnvelope, customersApi, GetCustomersParams, GetMessagesParams, SendMessageParams, UpdateCustomerParams (+7 more)

### Community 11 - "TypeScript Config"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 12 - "Dashboard Charts"
Cohesion: 0.12
Nodes (21): badgeColorFor(), badgePalette, channelMeta, chartInk, formatCompact(), formatEgp(), seriesColors, stableHash() (+13 more)

### Community 13 - "Commerce Growth Schema"
Cohesion: 0.11
Nodes (18): coupon_redemptions table, coupons table, Coupons / Discount Codes Workstream (WS3), Commerce Growth Phase Spec, Insert-only review submission rule, product_reviews table, Product Reviews Workstream (WS1), Review-Request Automation Workstream (WS2) (+10 more)

### Community 14 - "Spec Kit Shell Scripts"
Cohesion: 0.10
Nodes (12): check-prerequisites.sh script, check_dir(), check_file(), get_feature_paths(), get_repo_root(), has_jq(), _persist_feature_json(), resolve_specify_init_dir() (+4 more)

### Community 15 - "WhatsApp Messaging Layer"
Cohesion: 0.13
Nodes (11): checkRateLimit(), POST(), rateLimitMap, InboundWebhookPayload, StatusWebhookPayload, WhatsAppMessage, WhatsAppMessageInput, WhatsAppMessageStatus (+3 more)

### Community 16 - "Categories Admin UX"
Cohesion: 0.18
Nodes (17): Categories Admin UX Fix Plan, Categories Admin UX Fix Tasks, CreateCategoryPage(), EditCategoryPage(), CategoriesPage(), CategoryForm(), CategoryFormProps, CategoryList() (+9 more)

### Community 17 - "Order Analytics"
Cohesion: 0.13
Nodes (23): buildCategoryMap(), buildDailyTrend(), buildProductMap(), CategoryRevenueStat, CHANNEL_ORDER, channelBreakdown(), channelOf(), ChannelStat (+15 more)

### Community 18 - "Product Reviews UI"
Cohesion: 0.13
Nodes (15): AdminReviewsPage(), ReviewModerationList(), ProductDetail(), ProductDetailProps, ProductRatingSummary(), ProductRatingSummaryProps, ProductReviewsSection(), ProductReviewsSectionProps (+7 more)

### Community 19 - "Reviews Data & Moderation"
Cohesion: 0.14
Nodes (11): ReviewModerationListProps, ApiEnvelope, ProductReviewsResult, reviewsApi, CreateReviewInput, ReviewRepository, toPublicDto(), ProductReview (+3 more)

### Community 20 - "RTK Query API Slices"
Cohesion: 0.16
Nodes (15): categoriesApi, ApiEnvelope, geoApi, Zone, ApiEnvelope, mediaApi, ApiEnvelope, socialApi (+7 more)

### Community 21 - "Dashboard Overview & CSV"
Cohesion: 0.18
Nodes (18): Stable-hash entity badge color rotation, AdminOverviewPage(), buildCsvText(), CSV_HEADERS, csvEscape(), CustomRange, downloadCsv(), parseLocalDate() (+10 more)

### Community 23 - "Order Notifications & Email"
Cohesion: 0.15
Nodes (11): Order-placed notification (customer WhatsApp + admin email), EmailService, Country, CustomerAnalytics, N8nOrderNotification, N8nSendRequest, N8nSendResponse, ProductSearchResult (+3 more)

### Community 24 - "Testimonials Display"
Cohesion: 0.18
Nodes (13): TestimonialsPage(), ProductForm(), TestimonialList(), TestimonialListProps, ProductThumbRow(), ProductThumbRowProps, getInitials(), Testimonials() (+5 more)

### Community 25 - "Social OAuth Providers"
Cohesion: 0.21
Nodes (6): SocialTokenResult, FacebookProvider, getCredentials(), SCOPES, VALID_PLATFORMS, ISocialProvider

### Community 26 - "Admin UX Spec History"
Cohesion: 0.15
Nodes (17): Category entity, Create category as dedicated page (US2), Categories Admin UX Fix Spec, Edit category as dedicated page (US3), Single Categories sidebar entry (US1), Admin Dashboard Arabic + RTL Plan (SUPERSEDED), One-way Arabic/RTL flip approach (superseded), Admin Dashboard Arabic + RTL Spec (SUPERSEDED) (+9 more)

### Community 27 - "App Layouts & Providers"
Cohesion: 0.15
Nodes (8): No-FOUC theme mitigation strategy, metadata, metadata, metadata, AuthHydrator(), ReduxProvider(), store, preview

### Community 28 - "n8n Integration & Zones"
Cohesion: 0.19
Nodes (7): GET(), POST(), GET(), GET(), POST(), GeoService, requireN8nAccess()

### Community 29 - "Store Category Pages"
Cohesion: 0.15
Nodes (9): PageProps, metadata, CategoryLabel(), CategoryLabelProps, AsHeading, Default, mockCategory, Story (+1 more)

### Community 30 - "Social Connections Core"
Cohesion: 0.21
Nodes (4): SocialConnection, SocialPlatform, SocialFactory, SocialRepository

### Community 31 - "Admin Shell & Theme"
Cohesion: 0.19
Nodes (11): Light/Dark theme toggle (US1), Coinix dashboard visual reference adapted to 7alm brand, Admin Bento Grid Redesign Plan, Admin Bento Grid Redesign Tasks, Shell rebuilt as horizontal top bar (mid-implementation amendment), EN/AR + LTR/RTL runtime toggle (US1), AdminLayoutClient(), applyTheme() (+3 more)

### Community 32 - "Product Filtering UI"
Cohesion: 0.17
Nodes (12): CategoryFilterBar(), CategoryFilterBarProps, SORT_OPTIONS, CategoryProductsView(), CategoryProductsViewProps, ProductSortOption, useProductFilters(), ClickSort (+4 more)

### Community 33 - "Category Grid & Repository"
Cohesion: 0.18
Nodes (9): CategoryGrid(), CategoryGridProps, CategoryRepository, Category, Default, Empty, mockCategories, SingleCategory (+1 more)

### Community 34 - "Social Connections UI"
Cohesion: 0.21
Nodes (8): Same-tab redirect UX (no popup/postMessage), Banner, ConnectionsPage(), PLATFORMS, PLATFORM_ACCENT, PLATFORM_NAME_KEY, PlatformCard(), useConnectionsManager()

### Community 35 - "Testimonials Admin CRUD"
Cohesion: 0.29
Nodes (9): CreateTestimonialPage(), EditTestimonialPage(), TestimonialForm(), TestimonialFormProps, ApiEnvelope, TestimonialInput, testimonialsApi, EMPTY_FORM (+1 more)

### Community 36 - "Customer Detail & Geo"
Cohesion: 0.23
Nodes (9): CustomerDetail(), CustomerDetailProps, formatCurrency(), formatDate(), GeoRepository, Address, City, Zone (+1 more)

### Community 37 - "Button Component"
Cohesion: 0.15
Nodes (12): Button, ButtonProps, sizeClasses, variantClasses, CssCheck, Danger, Disabled, Large (+4 more)

### Community 38 - "Instagram Provider"
Cohesion: 0.19
Nodes (4): SocialAccountInfo, getCredentials(), InstagramProvider, SCOPES

### Community 39 - "Token Encryption & OAuth State"
Cohesion: 0.24
Nodes (10): Social Platform Connections Spec, Signed httpOnly OAuth state cookie (CSRF), social_connections table, Token encryption (lib/crypto.ts), SocialConnectionStatus, UpsertConnectionInput, decrypt(), encrypt() (+2 more)

### Community 40 - "Landing Funnel Pages"
Cohesion: 0.20
Nodes (4): metadata, PageProps, Footer(), ProductCheckoutFunnelProps

### Community 41 - "Store Pages & Footer"
Cohesion: 0.17
Nodes (6): metadata, metadata, PageProps, StoreFooter(), Default, Story

### Community 42 - "Hero & Search Hooks"
Cohesion: 0.24
Nodes (8): HeroContentLayerProps, HeroImageLayer(), HeroImageLayerProps, padTo01(), StoreSearchBar(), LookbookSection, UseProductFiltersResult, useProductSearch()

### Community 43 - "Store Navbar & Branding"
Cohesion: 0.21
Nodes (9): BrandLogo(), BrandLogoProps, StoreNavbar(), StoreNavbarProps, useHeroNavVisible(), CssCheck, Default, Large (+1 more)

### Community 44 - "Input Component"
Cohesion: 0.17
Nodes (10): Input, InputProps, CssCheck, Default, Disabled, Password, Story, TypeInteraction (+2 more)

### Community 45 - "Select Component"
Cohesion: 0.17
Nodes (10): Select, SelectOption, SelectProps, ChangeSelection, Default, Preselected, Story, WithError (+2 more)

### Community 46 - "Lookbook Hero"
Cohesion: 0.25
Nodes (8): HeroContentLayer(), padTo01(), LookbookGlow(), LookbookGlowProps, halftoneStyle, LookbookHero(), LookbookHeroProps, useLookbookSections()

### Community 49 - "Auth State & API"
Cohesion: 0.24
Nodes (8): ApiEnvelope, authApi, LoginRequest, LoginResponse, AdminUser, authSlice, AuthState, initialState

### Community 50 - "MSW Mock Worker"
Cohesion: 0.42
Nodes (8): activeClientIds, getResponse(), handleRequest(), IS_MOCKED_RESPONSE, resolveMainClient(), respondWithMock(), sendToClient(), serializeRequest()

### Community 51 - "i18n Dictionary"
Cohesion: 0.25
Nodes (8): Admin EN/AR + LTR/RTL Runtime Toggle Plan, Admin EN/AR + LTR/RTL Runtime Toggle Tasks, ar, dictionaries, DictKey, en, Locale, LocaleContextValue

### Community 52 - "Checkbox Component"
Cohesion: 0.25
Nodes (7): Checkbox, CheckboxProps, Checked, Disabled, Story, Toggle, Unchecked

### Community 53 - "Radio Component"
Cohesion: 0.25
Nodes (7): Radio, RadioProps, Checked, Default, Disabled, SelectRadio, Story

### Community 54 - "Textarea Component"
Cohesion: 0.22
Nodes (7): Textarea, TextareaProps, Default, Story, TypeInteraction, WithError, WithLabel

### Community 55 - "Customers Admin List"
Cohesion: 0.43
Nodes (5): CustomersPage(), CustomerList(), formatCurrency(), formatDate(), useCustomersManager()

### Community 56 - "Admin Login"
Cohesion: 0.46
Nodes (5): AdminLoginPage(), LoginForm(), { useLoginMutation }, useAuth(), useAppSelector

### Community 57 - "TikTok Provider"
Cohesion: 0.39
Nodes (3): getCredentials(), SCOPES, TiktokProvider

### Community 58 - "WhatsApp OAuth Provider"
Cohesion: 0.36
Nodes (3): getCredentials(), SCOPES, WhatsappProvider

### Community 59 - "Dashboard Analytics Spec"
Cohesion: 0.29
Nodes (7): Dashboard Analytics Enhancements Plan, Average order value + custom date range (US3), Export current view to CSV (US4), Dashboard Analytics Enhancements Spec, Revenue by category widget (US2), Top-selling products widget (US1), Dashboard Analytics Enhancements Tasks

### Community 61 - "Stat Tiles"
Cohesion: 0.40
Nodes (4): AnimatedValue(), AnimatedValueProps, StatTile(), StatTileProps

### Community 62 - "Locale Provider"
Cohesion: 0.60
Nodes (4): applyLocale(), getInitialLocale(), LocaleContext, LocaleProvider()

## Knowledge Gaps
- **307 isolated node(s):** `session-context.sh script`, `common.sh script`, `config`, `preview`, `eslintConfig` (+302 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useLocale()` connect `Testimonials Display` to `Order Lifecycle & Webhooks`, `Admin Product & CRM Pages`, `Storefront Cart & Checkout`, `Coupons Feature`, `Dashboard Charts`, `Categories Admin UX`, `Product Reviews UI`, `Reviews Data & Moderation`, `Dashboard Overview & CSV`, `Store Category Pages`, `Admin Shell & Theme`, `Product Filtering UI`, `Category Grid & Repository`, `Social Connections UI`, `Testimonials Admin CRUD`, `Customer Detail & Geo`, `Store Pages & Footer`, `Hero & Search Hooks`, `Store Navbar & Branding`, `Lookbook Hero`, `Customers Admin List`, `Admin Login`, `Stat Tiles`, `Locale Provider`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `Product` connect `Product Repository` to `Product Filtering UI`, `Order Lifecycle & Webhooks`, `Storefront Cart & Checkout`, `Admin Product & CRM Pages`, `Landing Funnel Pages`, `Admin CRUD API Routes`, `Hero & Search Hooks`, `Lookbook Hero`, `Order Analytics`, `Product Reviews UI`, `RTK Query API Slices`, `Product Service & Public API`, `Order Notifications & Email`, `Testimonials Display`, `Store Category Pages`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `OrderWithDetails` connect `Order Lifecycle & Webhooks` to `Order Analytics`, `Customers Data Layer`, `Customer Detail & Geo`, `Order Notifications & Email`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `session-context.sh script`, `common.sh script`, `config` to the rest of the system?**
  _307 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Order Lifecycle & Webhooks` be split into smaller, more focused modules?**
  _Cohesion score 0.055534987041836355 - nodes in this community are weakly interconnected._
- **Should `Admin Product & CRM Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.05536723163841808 - nodes in this community are weakly interconnected._
- **Should `Storefront Cart & Checkout` be split into smaller, more focused modules?**
  _Cohesion score 0.055523085914669784 - nodes in this community are weakly interconnected._