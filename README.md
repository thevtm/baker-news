# baker-news

A hacker news clone that I made while learning Go.

## Acknowledgements

- This projects main motivation is to be an environment to help me learn Go and try new things.
- I intentionally didn't bother with things like security in order to speed up development.
- I tried to follow, the "standard" Go project structure but not too strictly.
- Someone wrote about how they only used one single git command `git add --all && git commit -m "yolo 😎" && git push`, so I decided to try it.
- I tried making it "portable" | "easy to install". You should only need Go, Make, Docker and Docker Compose to run everything.
- I've used Jupyther notebooks to help with development in other languages but the kernels for Go are all broken. I've also tried interpreters but they are also not good enough.

## Project Structure

## Docker-Compose

- [Redis Insight](http://localhost:55540/)
  - Redis Address: `redis:6379`
- [Dapr Dashboard](http://localhost:58080/)
- [Adminer](http://localhost:58081)
- [Zipkin](http://localhost:59411)

## Learning Resources

- [Go by Example](https://gobyexample.com/)
- [How to shutdown a Go application gracefully](https://josemyduarte.github.io/2023-04-24-golang-lifecycle/)
- [Parse, don’t validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)
