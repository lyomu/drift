# Outbound egress restriction — scope

The remaining half of tracker **5.5**. Scoped 2026-09-03 against the live box;
nothing here has been applied.

## What is actually true today

```
ufw:          Default: allow (outgoing)
DOCKER-USER:  (empty)
```

And demonstrated rather than assumed — from inside the API container:

```
docker exec drift-api node -e 'fetch("https://example.com")...'
  → example.com reachable: 200
```

So a compromised dependency in the API image can reach anything on the internet.

**The first thing to understand: UFW is the wrong tool here.** Container traffic
is routed by Docker and traverses the `DOCKER-USER` iptables chain, never UFW's
chains. Adding `ufw default deny outgoing` would restrict the *host* and leave
every container untouched — which is precisely backwards, since the containers
run the code most likely to be compromised.

## What legitimately needs to reach out

Losing any of these breaks something, and most fail quietly.

### From the containers

| Destination | Port | Purpose | How it fails |
|---|---|---|---|
| `mail.einsbrand.com` | 465 | All six transactional mail flows | Nobody can register, verify or reset a password |
| `payment.intasend.com` | 443 | Club billing | Checkout errors; no money collected |
| `api.pwnedpasswords.com` | 443 | HIBP breach screening | **Fails open by design** — degrades silently, which is the point |
| `accounts.google.com`, `www.googleapis.com` | 443 | Google OAuth JWKS | Google sign-in breaks |
| `appleid.apple.com` | 443 | Apple OAuth JWKS | Apple sign-in breaks |
| `places.googleapis.com` | 443 | Google Places | Court and location search break |
| `fcm.googleapis.com`, `oauth2.googleapis.com` | 443 | Push via firebase-admin | Push stops silently |
| `feeds.bbci.co.uk`, `www.atptour.com` | 443 | News ingestion | News cards empty |
| DNS resolver | 53 | Everything | Total failure |

### From the host

| Destination | Port | Purpose | How it fails |
|---|---|---|---|
| `acme-v02.api.letsencrypt.org` | 443 | certbot renewal | TLS expires ~90 days later |
| `deb.debian.org`, `security.debian.org` | 80/443 | unattended-upgrades | Security patches stop |
| `ghcr.io`, `registry-1.docker.io`, `auth.docker.io`, `production.cloudflare.docker.com` | 443 | Image pulls | Deploys break |
| `github.com` | 443 | `git pull` in `scripts/deploy.sh` | Deploys break |
| `ci.einsbrand.com` | 443 | `alert.sh` → Jenkins `ops-alert` | **Monitoring alerts stop, silently** — the failure 1.2 already had once |
| NTP | 123 | Clock | TLS and JWT validation start failing on skew |

## Why an IP allowlist is not the answer

Nearly every destination above is CDN-fronted with rotating addresses — Google,
Cloudflare in front of Docker Hub, the BBC, GitHub. An iptables allowlist of
resolved IPs would be correct on the day it was written and broken within days,
and it would break by *silently* severing mail or alerting.

## Options, in the order I would consider them

### 1. Port-based egress restriction — cheap, real, low risk

Allow outbound `53`, `80`, `443`, `465`, `123` from the `DOCKER-USER` chain and
the host; drop the rest.

Does not stop exfiltration over 443. Does stop reverse shells on odd ports,
miners dialling 3333, and most commodity malware that assumes open egress. It is
a genuine reduction for about an hour of work and near-zero breakage risk,
because everything in the tables above already uses those five ports.

### 2. Domain-allowlisting egress proxy — the real control, with a catch

Squid or tinyproxy with an allowlist of exactly the hosts above, containers
pointed at it, direct egress dropped.

**The catch that decides the effort: Node's global `fetch` ignores `HTTP_PROXY`
and `HTTPS_PROXY`.** It is built on undici, which requires an explicit
`ProxyAgent` — so this is not a deployment change, it is a code change touching
every outbound call we make (IntaSend, HIBP, Places, the news fetcher) plus
whatever `nodemailer`, `google-auth-library` and `firebase-admin` do internally,
each of which has its own proxy story. That is the honest cost, and it is why
this is not simply "put a proxy in front of it".

### 3. DNS allowlisting — not worth it alone

A local resolver answering only for allowed names is trivially bypassed by
connecting to an IP literal. Useful alongside (1) or (2), not instead.

## Recommendation

Do **(1)** now. It is proportionate to a staging box about to take real
payments, cannot plausibly break anything in the tables above, and closes the
"nothing constrains outbound traffic at all" finding.

Treat **(2)** as a separate, funded piece of work with a code component, and only
if the threat model justifies it. Writing it down as understood beats leaving
5.5 open indefinitely against an option nobody has costed.

## Before applying (1)

Egress rules on a live box cut things off quietly. In order:

1. Add the rules with `LOG` targets first and watch for a day, or apply and
   immediately exercise the six mail flows, a Google sign-in, a push, a news
   refresh, and `certbot renew --dry-run`.
2. Keep `ci.einsbrand.com` reachable — alerting failing silently is the exact
   failure mode 1.2 was raised for.
3. Have the rollback ready: `iptables -F DOCKER-USER`.
