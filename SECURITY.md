# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Contact the ulmind
team privately at **security@ulmind.in** with details and reproduction steps.

## Secret handling

- This app ships **no secrets**. The only runtime config is `VITE_API_BASE_URL`
  (a public URL) and `VITE_APP_NAME`, supplied via a local, git-ignored `.env`.
- Note: anything prefixed `VITE_` is **embedded in the client bundle** and is
  therefore public — never put a real secret (API key, token) in a `VITE_` var.
- Only `.env.example` (placeholders) is tracked; `.gitignore` blocks `.env` and
  `.env.*` (except the example).

## If you leak a secret

Rotate it at the provider immediately, remove it from the working tree and from
git history (`git filter-repo` / BFG), then force-push. Treat anything pushed
to a public repo as already compromised.
