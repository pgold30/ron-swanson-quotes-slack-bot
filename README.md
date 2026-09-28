# <img src="./public/ron-swanson.jpg" alt="Ron Swanson" width="48" height="48" align="absmiddle" /> Ron Swanson Quotes Slack Bot

Adds a `/ron` (or `/swanson`) slash command to post **Ron Swanson** quotes from ***Parks and Recreation*** directly to Slack, with support for topic and multi-word keyword matching.

---

## Who is Ron Swanson?

<img src="./public/ron-swanson.jpg" alt="Ron Swanson" width="96" align="left" />

**Ron Swanson** (portrayed by **Nick Offerman**) is the deadpan, mustache-sporting Director of the Parks and Recreation Department of Pawnee, Indiana in the NBC sitcom ***Parks and Recreation*** (2009–2015), created by Greg Daniels and Michael Schur.

A staunch libertarian and self-reliant outdoorsman working inside local government with the explicit goal of making it as unproductive as possible, Ron is famous for his love of breakfast food (especially bacon and eggs), woodworking, Lagavulin 16-year-old single malt Scotch, turf 'n' turf, and silence—as well as his deep distrust of government bureaucracy, taxes, skim milk, vegetables, and Tammy.

### Why this Slack Bot?

Whether your team just survived a pointless meeting, shipped a feature ("*Never half-ass two things. Whole-ass one thing.*"), or needs a reminder of life's simple priorities, `/ron` delivers instant Swanson wisdom straight to your Slack channel.

<br clear="left" />

---

## Usage in Slack

- **Random quote:**
  ```text
  /ron
  ```
  > *"Just give me all the bacon and eggs you have. Wait...wait. I worry what you just heard was: Give me a lot of bacon and eggs. What I said was: Give me all the bacon and eggs you have. Do you understand?"*

- **Quote by topic or keyword(s):**
  ```text
  /ron manly
  ```
  > *"Cultivating a manly musk puts your opponents on notice."*

  ```text
  /ron uncle yoga
  ```
  > *"Ann: Do you have any history of mental illness in your family?  
  > Ron: I have an uncle who does yoga."*

  ```text
  /ron canvas
  ```
  > *"That is a canvas sheet, the most versatile object known to man. It can be used to make tents, backpacks, shoes, stretchers, sails, tarpaulins, and I suppose, in the most dire of circumstances, it can be a surface on which to make art."*

  ```text
  /ron nothing
  ```
  > *"Normally, if given the choice between doing something and nothing, I’d choose to do nothing. But I will do something if it helps someone else do nothing. I’d work all night, if it meant nothing got done."*

- **Help:**
  ```text
  /ron help
  ```

---

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/ron` | Slack Slash Command webhook (`text` parameter optional) |
| `GET` | `/api/quote?text=<topic>` | JSON endpoint returning `{ origWord, wasFound, quote }` |
| `GET` | `/slack-oauth` | Slack OAuth callback endpoint |
| `GET` | `/health` | Health check returning `{ ok: true, quotesCount }` |

---

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Start the server:**
   ```bash
   npm start
   # or with auto-reload:
   npm run dev
   ```
   The server runs on `http://localhost:9015` by default (configurable via `PORT`).

4. **Run tests:**
   ```bash
   npm test
   ```

## Contributing

Contributions and quote additions are welcome! Add new quotes to [`quotes.js`](./quotes.js) and run `npm test` to verify indexing.
