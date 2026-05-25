# Pinscape — Backend API

FastAPI backend powering Pinscape: Pinterest OAuth, board/pin fetching, and Claude AI vision analysis.

## Stack

- **FastAPI** — API framework
- **Claude claude-sonnet-4-20250514** — multimodal vision analysis (Anthropic)
- **Pinterest API v5** — OAuth2, boards, pins
- **PyJWT** — session tokens
- **httpx** — async HTTP client

---

## Project structure

```
pinscape/
├── main.py                  # App entry point, CORS, router registration
├── config.py                # Settings (loaded from .env)
├── requirements.txt
├── .env.example
├── models/
│   └── schemas.py           # Pydantic request/response models
├── routers/
│   ├── auth.py              # Pinterest OAuth2 login + callback + JWT refresh
│   ├── pinterest.py         # GET /boards, GET /boards/{id}/pins
│   └── analyze.py           # POST /upload-photos, POST /analyze
└── services/
    ├── auth_service.py      # JWT decode FastAPI dependency
    ├── storage_service.py   # Save/load uploads (local; swap for S3)
    └── vision_service.py    # Claude vision prompt + response parsing
```

---

## Setup

### 1. Clone & install

```bash
cd pinscape
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your keys — see comments in .env.example
```

**Pinterest app setup:**
1. Go to https://developers.pinterest.com/apps/
2. Create a new app
3. Add `http://localhost:8000/auth/pinterest/callback` as a redirect URI
4. Request scopes: `boards:read`, `pins:read`, `user_accounts:read`
5. Copy Client ID and Client Secret into `.env`

**Anthropic key:**
- Get your key from https://console.anthropic.com

### 3. Run

```bash
uvicorn main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs

---

## API reference

### Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/pinterest/login` | Redirect to Pinterest OAuth consent |
| GET | `/auth/pinterest/callback` | OAuth callback — issues JWT |
| POST | `/auth/refresh` | Refresh an expiring JWT |

### Pinterest

All endpoints require `Authorization: Bearer <jwt>`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/pinterest/boards` | List user's boards + profile |
| GET | `/pinterest/boards/{board_id}/pins` | List pins in a board (paginated) |

### Analyze

| Method | Path | Description |
|--------|------|-------------|
| POST | `/analyze/upload-photos` | Upload room/body photos → returns storage keys |
| POST | `/analyze/analyze` | Run Claude vision → returns 3 ranked results |

---

## Frontend integration

### Step 1 — Connect Pinterest

```js
// Open in popup or redirect
window.location.href = 'http://localhost:8000/auth/pinterest/login'

// After redirect back, grab token from fragment
const token = window.location.hash.slice(1)
localStorage.setItem('pinscape_token', token)
```

### Step 2 — Fetch boards

```js
const res = await fetch('http://localhost:8000/pinterest/boards', {
  headers: { Authorization: `Bearer ${token}` }
})
const { boards, user } = await res.json()
```

### Step 3 — Upload photos

```js
const form = new FormData()
photos.forEach(f => form.append('files', f))
form.append('category', 'bedroom')

const res = await fetch('http://localhost:8000/analyze/upload-photos', {
  method: 'POST', body: form
})
const { keys } = await res.json()
```

### Step 4 — Analyze

```js
const res = await fetch('http://localhost:8000/analyze/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    category: 'bedroom',
    photo_keys: keys,
    pin_image_urls: selectedPins.map(p => p.image_url),
    angles_covered: ['Front wall', 'Left side']
  })
})
const { results } = await res.json()
// results = [{ rank, title, description, tags, badge, reasoning }, ...]
```

---

## Deploying to production

- Swap `storage_service.py` to write/read from **S3 or GCS** instead of local disk
- Replace the in-memory `_state_store` in `auth.py` with **Redis**
- Set `SECRET_KEY` to a cryptographically random 64-char string
- Put behind **HTTPS** (Nginx, Caddy, or a managed load balancer)
- Update `PINTEREST_REDIRECT_URI` and frontend CORS origins to your production domain
