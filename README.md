# MetaMend (SEOForge) ⚡

> **"Your SEO score, fixed in one pull request."**

MetaMend is an AI-powered, developer-first automated SEO auditing and code remediation platform. It connects directly to your GitHub repositories, analyzes framework architecture, crawls live deployed websites, detects technical SEO vulnerabilities, renders real-time social & search preview simulations, and generates surgical, framework-specific source code patches ready for review and automated pull requests.

---

## 🌟 Key Features at a Glance

| Feature | Description | Status |
| :--- | :--- | :---: |
| **Feature 1: Repository Inspection & Framework Detection** | Deep GitHub repo scanning, framework detection (Next.js App/Pages, React+Vite, Astro, Remix), package managers, deployment targets, and file trees. | ✅ Production |
| **Feature 2: Live Website Crawling & SEO Audit Engine** | SSRF-guarded crawler, 6-category analysis (Basic, Technical, Social, Content, Structured Data, Performance), and 0–100 dynamic scoring. | ✅ Production |
| **Feature 3: Visual Social & Search Previews** | Real-time Before/After simulations for Google Search, X (Twitter), LinkedIn, and WhatsApp with social image validation. | ✅ Production |
| **Feature 4: AI-Powered Automated SEO Code Fix Engine** | Generates framework-compliant source code fixes (Next.js Metadata API, HTML, Astro), unified/split diffs, AST validation, and approval workflow. | ✅ Production |
| **Feature 5: One-Click GitHub PR Staging** | Bundles approved code patches into a dedicated Git branch and submits a single unified pull request. | 🚀 Staged |

---

## 🏗️ System Architecture

```
                                  +------------------------------------+
                                  |       Developer / Browser UI       |
                                  |    (React 19, Tailwind CSS v4)     |
                                  +-----------------+------------------+
                                                    |
                                       Hash-based routing & JWT
                                                    v
                                  +------------------------------------+
                                  |        Express.js Backend          |
                                  |      (Node.js 18+ ES Modules)      |
                                  +--------+--------+--------+---------+
                                           |        |        |
                  +------------------------+        |        +-------------------------+
                  |                                 |                                  |
                  v                                 v                                  v
+-----------------------------------+ +---------------------------+ +-----------------------------------+
|     GitHub REST API Service       | |   SSRF-Guarded Crawler    | |     AI Code Fix Engine            |
| - OAuth 2.0 Token Authentication  | | - Multi-category analyzer | | - Framework File Resolver         |
| - Repository Tree Inspection      | | - Cheerio HTML extraction | | - Google Gemini / OpenAI Client   |
| - Source File Retrieval & Caching | | - Dynamic 0-100 Scoring   | | - Patch Generator (Unified Diff)  |
+-----------------+-----------------+ +-------------+-------------+ | - Code Validator & AST Safety     |
                  |                                 |               +-----------------+-----------------+
                  +------------------------+        |                                 |
                                           |        |        +------------------------+
                                           v        v        v
                                      +---------------------------+
                                      |     MongoDB Database      |
                                      | - Users (OAuth tokens)    |
                                      | - RepositoryAnalysis      |
                                      | - SeoAudits (History)     |
                                      | - SeoFixes (Review State) |
                                      +---------------------------+
```

---

## 🧩 Detailed Feature Walkthrough

### 1. Repository Inspection & Framework Detection (Feature 1)

When a repository is connected, MetaMend performs a zero-install static analysis of the codebase:
- **Framework Detection:**
  - **Next.js:** Accurately distinguishes between **App Router** (`app/layout.tsx`, file-based metadata) and **Pages Router** (`pages/_app.tsx`, `pages/_document.tsx`, `next/head`). Extracts exact versions from `package.json`.
  - **React (Vite / CRA):** Detects SPA routing, entry points (`index.html`, `src/App.tsx`), and head libraries (e.g. `react-helmet-async`).
  - **Astro:** Identifies static/hybrid configurations, layout hierarchies (`src/layouts/Layout.astro`), and `astro.config.mjs`.
  - **Remix & Nuxt:** Detects route architectures and meta functions.
- **Package Manager Detection:** Infers `npm`, `pnpm`, `yarn`, or `bun` from respective lockfiles.
- **Deployment Platform Recognition:** Detects deployment blueprints for **Vercel**, **Netlify**, **Docker**, and **GitHub Pages**.
- **Visual File Tree:** Renders an interactive repository explorer highlighting SEO-critical files.

---

### 2. Live Website Crawling & Comprehensive SEO Audit (Feature 2)

Audits the actual deployed website with a genuine, dynamic scoring engine (never hardcoded mock data):
- **SSRF Security Boundary:**
  - Validates all candidate URLs before initiating HTTP requests.
  - Blocks loopback addresses (`127.0.0.1`, `localhost`), private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), AWS/Cloud metadata endpoints (`169.254.169.254`), and IPv6 loopback (`::1`).
  - Strictly enforces `http:` and `https:` protocols with a 10-second timeout.
- **Comprehensive Multi-Category Audit:**
  - **Basic SEO (25% Weight):** Title tag presence and length (30–60 chars), meta description presence and length (120–160 chars), canonical tag verification, favicon presence, and viewport configuration.
  - **Technical SEO (20% Weight):** HTTPS enforcement, live `robots.txt` directive parsing, `sitemap.xml` presence, `charset` declaration, and HTML `<html lang="...">` attribute.
  - **Social SEO (20% Weight):** Complete OpenGraph audit (`og:title`, `og:description`, `og:image`, `og:url`) and Twitter Cards audit (`twitter:card`, `twitter:title`, `twitter:image`).
  - **Content & Structure (20% Weight):** H1 count and uniqueness, heading hierarchy (`h1` -> `h2` -> `h3`), image `alt` text coverage, and page text-to-code ratio.
  - **Structured Data (15% Weight):** Schema.org JSON-LD parsing, validation of schema types (`Organization`, `WebSite`, `Article`, `Product`), and syntax error detection.
  - **Performance Signals:** Time to First Byte (TTFB) latency, page payload weight, and DOM node count.
- **Dynamic SEO Health Score (0–100):**
  - Calculated transparently using weighted category sub-scores and calibrated deductions:
    - **Critical Issue:** -15 points (e.g. missing title, insecure HTTP)
    - **High Severity:** -10 points (e.g. missing meta description, missing og:image)
    - **Medium Severity:** -5 points (e.g. title too long, missing image alt)
    - **Low Severity:** -2 points (e.g. missing optional social tags)

---

### 3. Visual Social & Search Previews (Feature 3)

Developers can visually inspect how their website appears when shared across platforms:
- **Pixel-Accurate Platform Simulations:**
  - **Google Search:** Desktop and mobile result card with live favicon, breadcrumb URL hierarchy, title snippet (with truncation warning at 60 chars), and meta description preview (with truncation warning at 160 chars).
  - **X (Twitter):** Card simulation supporting both `summary_large_image` and `summary` variants. Includes automatic fallback attribution if `twitter:*` tags are missing but `og:*` tags exist.
  - **LinkedIn:** Business post card showing og:image aspect ratios, post headline, and source domain.
  - **WhatsApp:** Chat snippet with square thumbnail, title, description preview, and domain pill.
- **Interactive Before vs. After Mode:**
  - **Before (Current Deployed State):** Immutable view representing what search engines and scrapers currently see.
  - **After (Proposed Metadata):** Interactive simulation allowing developers to test proposed titles, descriptions, and preview images before committing code.
- **SSRF-Safe Image Validator:** Probes external image headers to verify accessibility, mime types (`image/png`, `image/jpeg`, `image/webp`), and dimensions.

---

### 4. AI-Powered Automated SEO Code Fix Engine (Feature 4)

Translates detected audit issues into production-ready source code patches:
- **Framework File Resolver:**
  - Next.js App Router -> Resolves `app/layout.tsx`, `src/app/layout.tsx`, `app/robots.ts`, or `app/sitemap.ts`.
  - Next.js Pages Router -> Resolves `pages/_document.tsx`, `pages/_app.tsx`, or `public/robots.txt`.
  - React + Vite -> Resolves `index.html` or `src/App.tsx`.
  - Astro -> Resolves `src/layouts/Layout.astro`.
  - Fetches original file content directly via GitHub API and computes a SHA-256 fingerprint.
- **Security-Hardened AI Engine:**
  - Dual Provider Support: **Google Gemini** (`gemini-2.0-flash` / `gemini-1.5-flash`) and **OpenAI** (`gpt-4o-mini` / `gpt-4o`).
  - Enforces framework-specific idioms:
    - **Next.js App Router:** Uses Next.js Metadata API (`export const metadata: Metadata = { ... }`). Strictly prohibits `<Head>` from `next/head`.
    - **Next.js Pages Router:** Uses `import Head from 'next/head'`. Strictly prohibits `export const metadata`.
    - **React + Vite:** Injects valid HTML5 meta tags into `index.html` or component head wrappers.
  - Enforces strict JSON output with zero markdown fences.
- **Code & AST Validation:**
  - **Path Traversal Guard:** Rejects `..`, leading slashes, and protected paths (`.env`, `.git/`, `node_modules/`).
  - **Hash Integrity Check:** Verifies remote file SHA-256 to prevent overwriting drifted code.
  - **Forbidden Constructs:** Blocks `eval()`, `child_process`, `execSync()`, and `process.exit()`.
  - **Delimiter Matching:** Asserts balanced braces `{}` `[]` `()` in TypeScript/JavaScript files.
- **Interactive Review UI:**
  - **Split Diff & Unified Diff:** Side-by-side original vs. proposed code viewer with line-by-line addition (`+`) and deletion (`-`) highlights.
  - **Approve Fix:** Marks the fix as approved with a timestamp.
  - **Reject Fix:** Prompts the developer for a rejection reason and records feedback for future regenerations.
  - **Regenerate Fix:** Allows custom developer guidance (e.g., *"Use react-helmet-async instead of editing index.html"*).

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 19 (`react`, `react-dom`)
- **Build Tool:** Vite 7 with React Plugin
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons:** Lucide React
- **Routing:** Hash-based SPA routing (`#dashboard/:repo/:tab`)

### Backend
- **Runtime:** Node.js 18+ (ES Modules)
- **Framework:** Express.js 5 (`express`, `cors`, `dotenv`)
- **Database:** MongoDB via Mongoose 9
- **Authentication:** JWT (`jsonwebtoken`) + GitHub OAuth 2.0
- **HTML Extraction:** Cheerio 1.2+
- **HTTP Client:** Native Node.js `fetch` with `AbortController` (zero Axios dependency bloat)
- **AI Providers:** Google Gemini API & OpenAI API

---

## 📁 Repository Structure

```
seoforge/
├── README.md                      # Comprehensive project documentation
├── package.json                   # Root workspace configuration
│
├── Backend/                       # Express.js REST API Server
│   ├── .env                       # Environment configuration
│   ├── server.js                  # Server entry point & MongoDB initialization
│   ├── test-analyzer.js           # Feature 1 test suite (24 tests)
│   ├── test-crawler.js            # Feature 2 test suite (32 tests)
│   ├── test-previews.js           # Feature 3 test suite (23 tests)
│   ├── test-fixes.js              # Feature 4 test suite (19 tests)
│   └── src/
│       ├── app.js                 # Express application & route mounts
│       ├── config/
│       │   └── database.config.js # MongoDB Mongoose connection
│       ├── controllers/
│       │   ├── auth.controller.js              # GitHub OAuth callback & JWT
│       │   ├── user.controller.js              # User profile & repo syncing
│       │   ├── repositoryAnalysisController.js # Feature 1 controller
│       │   ├── seoAuditController.js           # Feature 2 controller
│       │   ├── socialPreviewController.js      # Feature 3 controller
│       │   └── seoFixController.js             # Feature 4 controller
│       ├── middleware/
│       │   └── auth.middleware.js              # JWT Bearer token authentication
│       ├── models/
│       │   ├── user.model.js               # GitHub user schema
│       │   ├── repositoryAnalysis.model.js # Framework & structure analysis
│       │   ├── seoAudit.model.js           # Audit findings & scores
│       │   └── seoFix.model.js             # Staged code fixes & review state
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── user.routes.js
│       │   ├── repositoryAnalysisRoutes.js
│       │   ├── seoAuditRoutes.js
│       │   ├── socialPreviewRoutes.js
│       │   └── seoFixRoutes.js
│       └── services/
│           ├── analyzer/          # Framework detection & repo tree services
│           ├── crawler/           # SSRF validator & Cheerio crawler
│           ├── github/            # GitHub REST API v3 client
│           ├── seo-audit/         # Category analyzers & 0-100 scoring engine
│           ├── social-preview/    # Social platform simulation generators
│           └── ai-fix-engine/     # File resolver, prompts, diffs, validator
│
└── Frontend/                      # React 19 + Vite Client Application
    ├── index.html                 # Single page application entry
    ├── vite.config.js             # Vite configuration with Tailwind CSS v4
    └── src/
        ├── App.jsx                # Top-level application shell
        ├── main.jsx               # React DOM root mounting
        ├── context/
        │   └── useAuth.jsx        # AuthContext provider & state
        └── components/
            ├── Dashboard.jsx          # Primary dashboard & tab orchestrator
            ├── RepositoryAnalysis.jsx # Feature 1 UI component
            ├── SeoAuditReport.jsx     # Feature 2 UI component
            ├── SocialPreviews.jsx     # Feature 3 UI component
            ├── AiFixEngine.jsx        # Feature 4 UI component
            ├── Navbar.jsx             # Top navigation & user profile
            └── ScoreRing.jsx          # Animated SVG score ring
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: A local instance or MongoDB Atlas cluster connection string
- **GitHub OAuth App**: Client ID and Client Secret from [GitHub Developer Settings](https://github.com/settings/developers)
- **AI Provider API Key**: Free key from [Google AI Studio](https://aistudio.google.com/app/apikey) (`GEMINI_API_KEY`) or [OpenAI](https://platform.openai.com/api-keys) (`OPENAI_API_KEY`)

---

### 2. Environment Configuration

#### Backend Configuration (`Backend/.env`)
Create `Backend/.env` with the following variables:

```env
PORT=5000
CLIENT_URL=http://localhost:5173

# MongoDB Connection
MONGO_URL=mongodb+srv://<username>:<password>@cluster0.mongodb.net/metamend?retryWrites=true&w=majority

# JWT Secret
JWT_SEC=your_random_secure_jwt_secret_key_here

# GitHub OAuth App Credentials
CLIENT_ID=your_github_oauth_client_id
CLIENT_SEC=your_github_oauth_client_secret

# AI Code Fix Engine (Provide either Gemini or OpenAI)
GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here
# OR
# OPENAI_API_KEY=sk-...your_openai_api_key_here
```

> [!TIP]
> Google Gemini API keys are completely free for developer usage and start with `AIzaSy...`. Generate one at [Google AI Studio](https://aistudio.google.com/app/apikey).

#### Frontend Configuration (`Frontend/.env`)
Create `Frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

---

### 3. Installation & Local Development

#### Step 1: Install Dependencies
```bash
# Install Backend packages
cd Backend
npm install

# Install Frontend packages
cd ../Frontend
npm install
```

#### Step 2: Start the Development Servers
In your first terminal (Backend):
```bash
cd Backend
npm run dev
# Server will start on http://localhost:5000
```

In your second terminal (Frontend):
```bash
cd Frontend
npm run dev
# Frontend will start on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Automated Test Suites

MetaMend includes comprehensive unit and integration test suites covering all four features:

```bash
# Run Feature 1: Repository & Framework Analyzer Tests (24 tests)
node Backend/test-analyzer.js

# Run Feature 2: SSRF Guard, Live Crawler & SEO Scoring Tests (32 tests)
node Backend/test-crawler.js

# Run Feature 3: Social & Search Previews Engine Tests (23 tests)
node Backend/test-previews.js

# Run Feature 4: AI Code Fix Engine & AST Validator Tests (19 tests)
node Backend/test-fixes.js

# Run Frontend Linting & Build Verification
npm --prefix Frontend run lint
npm --prefix Frontend run build
```

---

## 🔒 Security & Safe Operation Principles

1. **Strict SSRF Guardrails:** The live crawler prohibits requests targeting `localhost`, `127.0.0.1`, RFC 1918 private subnets, cloud metadata services (`169.254.169.254`), or non-HTTP protocols.
2. **Read-Only Inspection During Audits:** Feature 1, Feature 2, and Feature 3 perform read-only analysis without making any repository commits or branch modifications.
3. **AST & Path Traversal Guards:** Generated patches are strictly validated against directory escaping (`..`), protected system paths (`.git/`, `.env`), and forbidden execution patterns (`eval()`, `child_process`).
4. **Developer Approval Workflow:** Code fixes are never auto-merged. Every fix must be explicitly approved or rejected by the repository owner in the interactive diff review interface.

---

## 📜 License

This project is licensed under the MIT License — see the repository for details.
