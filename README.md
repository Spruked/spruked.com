# spruked.com

Truth with teeth.

A modern web application built with Next.js, featuring a brand identity system and content management capabilities.

## Production Readiness Status

- Build status: `npm run build` passes
- Lint status: `npm run lint` passes (warnings only for `<img>` optimization)
- Core commerce routes live: `/cart`, `/checkout`
- Orb API routing active: `/api/orb` with `kaygee_hybrid` support
- Founder and About content published under `/about`

## Features

- **Brand Identity System**: Comprehensive brand guidelines and assets
- **Content Management**: Dynamic content powered by Supabase
- **Modern UI**: Built with Tailwind CSS and React
- **Type-Safe**: Full TypeScript implementation
- **Responsive Design**: Mobile-first approach

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/spruked.com.git
   cd spruked.com
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase credentials and other required environment variables.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3001](http://localhost:3001) in your browser**

## Project Structure

```
├── app/                 # Next.js app directory
├── components/          # Reusable React components
├── lib/                 # Utility functions and configurations
├── data/                # Static data and types
├── public/              # Static assets
└── styles/              # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Route Map (Current)

- `/` - Home
- `/about` - About + founder statement
- `/products` - Product index
- `/products/alpha-certsig`
- `/products/truemark-mint`
- `/products/truemark-mint/objects`
- `/products/truemark-mint/object-types`
- `/goat`
- `/orb`
- `/orb-skin-studio`
- `/artifacts`
- `/cart`
- `/checkout`
- `/admin`

## Production Checklist

Run this before each release:

1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. Validate env values (`.env.local`) for:
   - `CALI_API_URL`
   - `SPRUKED_ORB_COGNITION_PROVIDER`
   - `SPRUKED_ORB_PROVIDER_TIMEOUT_MS`
   - Supabase keys
5. Smoke test:
   - `GET /`
   - `POST /api/orb`
   - `/cart` and `/checkout` render
6. Start production server:
   - `npm run start`

## Orb Provider Routing

The site orb UI/behavior can stay unchanged while cognition/voice is routed by API config.

- `SPRUKED_ORB_COGNITION_PROVIDER=native|kaygee|calixone|kaygee_hybrid`
- `KAYGEE_API_BASE` (default `http://127.0.0.1:8011`)
- `KAYGEE_VOICE_ENABLED` (`1` or `0`)
- `KAYGEE_VOICE` (default `af_bella`)
- `CALIXONE_API_BASE` (default `http://127.0.0.1:8021`)
- `CALIXONE_INTERACT_PATH` (default `/api/interact`)
- `CALI_API_URL` (default `http://127.0.0.1:8002`)
- `KAYGEE_HYBRID_RESPOND_PATH` (default `/cali/orb/respond`)

The provider switch is handled under `app/api/orb/route.ts`; orb visuals are not required to change.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Bryan - bryan@spruked.com

Project Link: [https://github.com/yourusername/spruked.com](https://github.com/yourusername/spruked.com)
