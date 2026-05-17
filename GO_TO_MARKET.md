# ReFile — Go-To-Market Plan

> How to sell ReFile and who buys. The *action* companion to
> `COMPETITIVE_RESEARCH.md` (which holds the evidence — competitor landscape in
> Part I, buyer segments / willingness-to-pay in Part II). Read this for the
> plan; read that for the proof. Compiled 2026-05-18.

---

## 0. The one thing to internalize first

**Nobody pays to convert a file. They pay so they never have to figure out how
again — and only when the job recurs on a schedule someone bills for.**

The honest counter-evidence is real and documented (`COMPETITIVE_RESEARCH.md`
§10): PDF24 is free/unlimited/no-signup, Squoosh is free, ChatGPT absorbs the
long tail, and iLovePDF itself says **99.9% of its users never pay**. Generic
consumer "convert anything" as a subscription is structurally near-unmonetizable
(~0.1–1% conversion).

This does **not** kill the business. It kills the *generic* business. WTP
survives precisely where (a) the file job recurs on a **billable** schedule,
(b) free tools genuinely **can't** do it reliably, and (c) the buyer's time is
worth more than $20/mo. The entire GTM is: **go where those three conditions
hold, and ignore everywhere they don't.**

---

## 1. Who buys (the answer to "who'll pay for this?")

Full ranking + evidence in `COMPETITIVE_RESEARCH.md` §7 and §11. The decision:

### Primary beachhead — **Bookkeepers / accountants / tax preparers**
- **Why:** highest WTP × highest frequency × clearest "free tools fail" gap. An
  entire $20–159/mo SaaS category (DocuClipper et al.) exists *just* for "bank
  statement → Excel." Billable-hour ROI sells itself.
- **The catch (must respect):** brutal accuracy bar (~99.9% claimed by
  incumbents) and it directly stresses ReFile's **known CSV/data-redirect gap**
  (`COMPETITIVE_RESEARCH.md` Part I §"Three risks", risk 1). **Do not lead with
  this segment until that gap is closed.** It is the highest-value beachhead and
  the one with a product prerequisite.

### Fast wedge to start now — **Real-estate agents**
- **Why:** massive, well-defined, recurring every listing, painfully
  non-technical, commission-income (not budget-constrained), and the pain is
  concrete and SEO-huge ("HEIC won't upload to MLS", "photo too big for
  Zillow", "flyer PDF too big to email"). Lower accuracy bar than accounting —
  **no product prerequisite, can run today.** WTP moderate ($5–15/mo) but
  volume enormous and word-of-mouth travels inside brokerages.

### Distribution multiplier — **Virtual assistants / freelance admin / paralegals**
- **Why:** they do file work *all day for clients*, already shop for tools,
  value breadth (one tool replaces 5 tabs), and **become distribution** — one
  VA spreads ReFile across many clients. It's a business expense, not personal
  spend, so WTP is solid.

### Cash-demand-proven — **Freelance designers / Etsy & POD sellers**
- **Why:** people *already pay* $5–10 on Fiverr/Etsy for exactly this
  (AI/EPS/SVG/PSD/PDF juggling). Smaller TAM but high intent, low competition,
  exercises ReFile's image/vector breadth where PDF incumbents are weak.

**Explicitly NOT the buyer (don't spend a dollar here):** students/teachers
(near-zero budget), casual one-off consumers (PDF24 wins, accept it),
developers (they'll script ffmpeg or use an API), photographers (Lightroom
already batch-exports — no gap).

---

## 2. How to sell it (positioning)

**The pitch is never "convert files." It is: *"Stop figuring out how. Just say
what you want, drop the file, done."***

- **Sell the moment, not the feature.** Marketing assets = short screen
  recordings of a *hard thing made trivial*: "make this video small enough to
  text" → file back. "turn these 8 receipts into one PDF for taxes" → done.
  The contrast with writing an FFmpeg command (or 3 sketchy sites) *is* the ad.
- **Lead vertical, not horizontal.** Do **not** market a neutral "AI file
  converter" — that competes head-on with free PDF24 and the unbeatable
  iLovePDF SEO wall (188M visits/mo on exactly that long-tail). Instead:
  **dedicated landing pages per vertical** — "The file fixer for real-estate
  agents", "...for bookkeepers", "...for VAs" — same backend, vertically
  packaged. Evidence that vertical beats generic for a low-domain-authority
  entrant: `COMPETITIVE_RESEARCH.md` §11 + the SEO research below.
- **One-line umbrella positioning** (from competitive research): *"Everything
  LightPDF does for PDFs, ReFile does for every file."* — true, and aimed at
  the one real direct competitor.
- **The honest line for skeptics (your dad):** *"Nobody pays to convert a file.
  They pay so they never have to figure out how again."* Don't oversell;
  acknowledging the free alternatives builds credibility.

---

## 3. Channels — what actually works for a no-budget utility

The category is an **organic-search business**: CloudConvert gets **81.56% of
23.3M quarterly visits from organic search** (~77,800 keywords, programmatic
format-pair pages). That's the proven engine — but head terms ("png to jpg",
"pdf to word") are owned by DA-80+ incumbents you **cannot** outrank in 90 days.

Three winnable lanes for a new entrant:

1. **Long-tail intent / "how to" queries** — `how to make a video small enough
   to email`, `convert HEIC so windows can open it`, `combine scanned receipts
   into one pdf for taxes`. Buyer intent, low competition, maps directly to the
   NL value prop (user describes a *problem*, not a format).
2. **Programmatic page-per-task grid, titled as outcomes not format codes** —
   still build the templated grid (non-negotiable for a converter; it's how the
   whole category gets traffic), but frame as the job ("Compress a video to
   email it") not "MP4 to MP3". Each page = working tool above the fold +
   how-to content + the "or just describe what you need" NL box.
3. **Compound/chained-task pages competitors structurally can't rank for** —
   "convert HEIC *and* compress *and* remove background" in one step. Zero SEO
   competition because no incumbent's product can do it in one shot. This is
   ReFile's unique SEO moat.

> SEO is a 6–18 month compounding play — the long-term engine, **not** a 90-day
> result. Seed it now; harvest later.

**Other channels (one-time spikes that feed SEO, not engines):**
- **Intent-answering on Quora / Reddit / SuperUser** — PDFShift reached $9K MRR
  *primarily* by non-spammily answering every "how do I convert HTML→PDF"
  question. Thousands of unanswered "how to convert/compress X" questions exist
  right now. Compounds + builds backlinks. **#1 ban risk is Reddit self-promo —
  build karma + contribute genuinely for weeks first, never drop bare links.**
- **One well-prepared Product Hunt launch** (≥50 hrs prep, strong demo video) —
  realistic outcome ~800–1k visits, ~4–10 signups, but valuable as a one-time
  backlink + credibility asset + first-users feedback. Worst retention of any
  channel; do it once, don't build the plan on it. Skip if you can't commit the
  prep — half-effort launches return nothing.
- **Vertical communities** — subreddits/FB groups per beachhead (see
  `COMPETITIVE_RESEARCH.md` §8 for the exact list: r/realtors, r/Bookkeeping,
  r/virtualassistants, r/Etsy, etc.). "I made this" demo posts, be a genuine
  member first. ~1% impression→install with a good demo video.

---

## 4. Pricing & packaging

**Keep the locked 4-tier flat ladder** (Free/Student/Pro/Power — `lib/plans.js`
is the source of truth; don't change prices). Flat low monthly is correct: it
matches habitual convenience-utility use, is the simplest mental model for
non-technical buyers (no "what's a credit?"), and TinyWow proved $5.99
unlimited works at exactly this price/audience. WTP band evidence:
`COMPETITIVE_RESEARCH.md` §9 ($5–20/mo non-technical sweet spot; $39–159/mo for
the bookkeeping vertical).

### The one pricing change that matters: the free tier

**The current free tier (15 conversions/mo) is an acquisition liability** and is
flagged independently in both research parts. The entire GTM funnels into a
free experience; the category's biggest acquisition lever is **no-signup,
sub-5-minute first success** (utilities with sub-5-min time-to-value convert
~13–16% of visitors to signup). At 15/mo behind a signup wall, the strategy
leaks out the bottom before any channel can compound.

**Recommended free-tier reshape (size on the dimension that doesn't cannibalize
and respects the Modal-cost caveat in memory):**
- **First success requires zero signup.** Gate on download/scale/volume, not on
  *trying*. One free result, no account, then "sign up to keep your files /
  do more."
- **Be generous on cheap, habit-forming ops** (image convert/compress, small
  PDF ops) — these cost near-zero on Modal and build the habit + word-of-mouth
  + SEO that the whole plan depends on.
- **Gate the expensive/professional use** — large media transcode, big batch,
  compound multi-tool chains, big files. That's where Modal cost lives and
  where the pro buyer (who pays) actually is.

This is a **pricing-model decision, not a growth tweak** — it intersects the
locked pricing model and the Modal-accuracy/cost caveat. Treat accordingly.

---

## 5. Retention — the category's structural weakness (and ReFile's biggest non-product risk)

Utilities don't retain by default — "did the thing, left" is *why* they
convert (CloudConvert sessions: 1m35s, 2.4 pages). A subscription has to be
*engineered*, not assumed. Highest-leverage stickiness investments:

1. **Browser extension / right-click "send to ReFile."** Puts ReFile *inside*
   the workflow so it's summoned without a site visit — the single highest-ROI
   retention mechanism for a converter (remove.bg's Figma/Photoshop embeds are
   the model).
2. **Saved presets / recipes.** "Save this as a preset" ("my Etsy listing
   photo: resize+compress+strip EXIF"). ReFile's NL layer makes this natural;
   **no competitor's NL tool does saved compound recipes** — switching cost +
   differentiator in one. (Presets infra already exists — `convex/presets.ts`.)
3. **Job history + one-click re-run on a new file** — the daily-driver behavior
   that justifies a subscription over a one-off site.
4. **Breadth as retention** — the user stays because ReFile does *every* file
   task; they never leave to chain a 2nd/3rd tool. The moat *is* the retention
   mechanism.

---

## 6. First-90-days plan (prioritized)

| Pri | Action | Why / evidence | 90-day outcome |
|---|---|---|---|
| **P0** | Reshape free tier: no-signup first success; generous on cheap ops; gate heavy/batch/compound | §4 — every channel funnels into the free experience; current 15/mo kills it | Unblocks the entire funnel |
| **P0** | Build the templated page-per-task SEO grid, titled by *outcome/intent*, working tool + NL box above fold | §3 — converters are *the* canonical programmatic-SEO category; 80%+ of incumbent traffic | Indexed now; compounds months 4–12 |
| **P1** | Launch **real-estate-agent** vertical: dedicated landing page + long-tail content + r/realtors presence (no product prerequisite) | §1 — fastest wedge, concrete SEO-huge pain, no accuracy blocker | First low-comp vertical rankings; first paying users |
| **P1** | Intent-answering: find unanswered "how to convert/compress X" Qs on Quora/Reddit/SuperUser, give real answers, soft-mention | §3 — PDFShift's primary $9K-MRR channel; compounds + backlinks | Steady high-intent trickle + SEO backlinks |
| **P1** | Ship browser extension + saved presets + job history | §5 — utilities don't retain by default; this is the subscription justification | Repeat-use → paid conversion |
| **P2** | Close the **CSV / data-redirect gap** (Part I risk 1) to unlock the bookkeeper beachhead | §1 — highest-WTP segment, blocked only by this product gap | Unlocks primary beachhead for next quarter |
| **P2** | One well-prepared Product Hunt launch + Show HN (≥50 hrs prep, strong video) | §3 — one-time backlink/credibility/first-users; not a channel | ~800–1k visits, backlink, feedback |
| **P3** | Compound-task SEO pages (convert+compress+bg-remove in one step) | §3 — zero competition; only ReFile can do it | Durable long-tail moat |

**Sequencing logic:** P0 unblocks the funnel and seeds the long-term engine
*now* (SEO is a 6–18 mo compound — start day 1). P1 is the only SEO winnable
inside 90 days (real-estate vertical long-tail + intent answering) plus the
retention machinery that makes any acquired user worth more. P2 closes the
product gap that unlocks the highest-value beachhead (bookkeepers) for the
following quarter. **Do not expect SEO revenue inside 90 days** — the 90-day
deliverable is *seeded SEO infrastructure + first 100–500 users from
vertical/community/launch + a working retention loop*. The revenue engine
matures over the following 2–3 quarters.

**Single highest-leverage move:** reshape the free tier (P0). Every channel
above funnels into the free experience; at 15 conv/mo behind a signup wall, the
whole acquisition strategy leaks out the bottom before any channel compounds.

---

## 7. The honest risk statement

The product works. The moat (NL layer across all media + the hardened recipe
book) is real and not trivially copied. The **unknown is not the product — it
is whether enough of the vertical-pro audience converts at $5–7/mo against free
alternatives**, and at what acquisition cost. This is *not* solved by a better
pitch. It is solved by running the cheapest possible test (organic
real-estate-vertical SEO + community, no paid ads) and watching one number:
**do free users in that vertical hit the wall during real work, and then
convert?** If yes in real estate at <1% but with cheap organic acquisition, the
bookkeeper beachhead (3–7% potential) is the scale path — *after* the CSV gap
is closed. If no, the thesis is wrong cheaply, before any money is spent.

> Sources for every claim here live in `COMPETITIVE_RESEARCH.md` (§ Sources,
> Parts I & II).
