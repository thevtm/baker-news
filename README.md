# WIP Hacker News Clone

A modern Hacker News clone **building** with **TypeScript**, **React**, **Node.js**, and **Deno**.

## Overview

This project is a full-stack application with the following key components:

- **Frontend**:**React** and **TypeScript**
- **Backend**: **Deno**, [ConnectRPC (gRPC)](https://connectrpc.com/), [DrizzleORM](https://orm.drizzle.team/) and [pgmq](https://github.com/tembo-io/pgmq)

The goal is to create a functional clone while experimenting with Deno as a backend runtime and [pgmq](https://github.com/tembo-io/pgmq) for message queuing.

## Features

- **Real-Time Updates**: Leveraging gRPC, the frontend listens to live updates from the backend for a dynamic user experience.
- **Type-Safe Codebase**: Written in TypeScript to ensure reliability and maintainability.
- **Message Queueing**: Incorporates PGMQ for reliable message handling, with "exactly once" delivery guarantees within a visibility timeout (see [PGMQ Features](https://github.com/tembo-io/pgmq#features)).
- **PostgreSQL Integration**: Uses PostgreSQL as the database, extended with PGMQ for queue management.

## Why Deno?

I chose Deno for the backend because I believe it has potential to replace Node in the future.

## Why pgmq?

[pgmq](https://github.com/tembo-io/pgmq) is a lightweight message queue built on PostgreSQL.
I find it to be an interesting solution for the dual write problem while also "saving budget" on infrastructure.
