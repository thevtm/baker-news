# The Docker image provided by the PGMQ project was not working for us,
# so we are building our own image.
#
# Reference: https://userjot.com/blog/using-postgres-docker-pgmq-message-queue/

FROM postgres:17

# Install dependencies
RUN apt-get update && apt-get install -y \
  ca-certificates \
  clang \
  curl \
  gcc \
  git \
  libssl-dev \
  make \
  pkg-config \
  postgresql-server-dev-17 \
  && rm -rf /var/lib/apt/lists/*

# Install pgmq
RUN git clone --branch v1.5.1 --depth 1 https://github.com/tembo-io/pgmq.git /pgmq \
  && cd /pgmq/pgmq-extension \
  && make \
  && make install install-pg-partman
