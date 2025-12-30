# baker-news

![Screenshot of baker-news](https://github.com/thevtm/baker-news/blob/master/docs/screenshots/Screen%20Shot%202025-01-04%20at%2022.01.39.png?raw=true)

A hacker news clone that I made while learning Go.

## Acknowledgements

- This projects main motivation is to be an environment to help me learn Go and try new things.
- I intentionally didn't bother with things like security in order to speed up development.
- I tried to follow, the "standard" Go project structure but not too strictly.
- Someone wrote about how they only used one single git command `git add --all && git commit -m "yolo 😎" && git push`, so I decided to try it.
- I tried making it "portable" | "easy to install". You should only need Go, Make, Docker and Docker Compose to run everything.
- I've used Jupyther notebooks to help with development in other languages but the kernels for Go are all broken. I've also tried interpreters but they are also not good enough.

## Running

- `docker-compose up` to run dependencies
- `make db/tidy` creates, migrates, dumps the schema and generate `sqlc` code
- `make run/live` runs the application in watch mode
- *OPTIONAL* `make db/seed` seed the database with fake data

## Project Structure

Read the `Makefile` (`make help`) and the `docker-compose.yml` to understand how the project is put together.

```
.
├── app - Contains Web Application Code
├── cmd - Entry point for applications / scripts
│   ├── app-configuration-sync - script to update DAPR configuration
│   ├── baker-news - Web application
│   ├── db-utils - script to help with database management
│   └── seed - script to seed database with fake data
├── commands - Operations that mutate the domain
├── docker-compose - Dev environment docker-compose related things
│   ├── dapr
│   ├── gonb - Jupyther notebook kernel (Not used anymore)
│   ├── pgadmin
│   ├── postgres
│   ├── redis
│   └── redis-insight
├── docs
│   └── screenshots
├── events - Domain events definitions
├── notebooks - I tried playing around with notebooks but I wasn't satisfied
├── scratch - Throwaway stuff
├── state - State (database) queries, models and migrations
│   ├── seed
│   └── sql
│       └── migrations
└── worker - Contains async worker code
```

## Docker-Compose

- [pgAdmin](http://localhost:50080)
- [Redis Insight](http://localhost:55540/)
  - Redis Address: `redis:6379`
- [Dapr Dashboard](http://localhost:58080/)
- [Zipkin](http://localhost:59411)

## Learning Resources

- [Go by Example](https://gobyexample.com/)
- [How to shutdown a Go application gracefully](https://josemyduarte.github.io/2023-04-24-golang-lifecycle/)
- [Parse, don’t validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)
