# Baker News

A mono repo containing multiple implementations of a [Hacker News](https://news.ycombinator.com/) clone,
each built with a different tech stack. The goal is to learn and experiment with new technologies by
building the same product over and over.

![Screenshot of baker-news](https://github.com/thevtm/baker-news/blob/master/docs/screenshots/Screen%20Shot%202025-01-04%20at%2022.01.39.png?raw=true)

## Projects

### [baker-news-go](./baker-news-go)

A Hacker News clone built while learning Go.

| Layer    | Technology                                                                     |
| -------- | ------------------------------------------------------------------------------ |
| Language | Go                                                                             |
| Frontend | [Templ](https://templ.guide/), [HTMX](https://htmx.org/), Tailwind CSS         |
| Backend  | Go, [Dapr](https://dapr.io/), [pgx](https://github.com/jackc/pgx)              |
| Database | PostgreSQL                                                                     |
| Queue    | Redis (via Dapr)                                                               |

---

### [baker-news-ts](./baker-news-ts)

A Hacker News clone built to experiment with Deno as a backend runtime and PGMQ for message queuing.

| Layer    | Technology                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| Language | TypeScript                                                                                                       |
| Frontend | React, TypeScript, [Vanilla Extract](https://vanilla-extract.style/)                                             |
| Backend  | [Deno](https://deno.com/), [ConnectRPC (gRPC)](https://connectrpc.com/), [DrizzleORM](https://orm.drizzle.team/) |
| Database | PostgreSQL                                                                                                       |
| Queue    | [pgmq](https://github.com/tembo-io/pgmq)                                                                         |

---

### [baker-news-rb](./baker-news-rb) *(work in progress)*

A Hacker News clone built while learning Ruby on Rails.

| Layer    | Technology                                                                     |
| -------- | ------------------------------------------------------------------------------ |
| Language | Ruby                                                                           |
| Frontend | [Hotwire](https://hotwired.dev/) (Turbo + Stimulus), Tailwind CSS              |
| Backend  | [Rails 8](https://rubyonrails.org/), Puma                                      |
| Database | MySQL                                                                          |
| Queue    | [Solid Queue](https://github.com/rails/solid_queue)                            |
