FROM alpine:3.20

ARG TARGETARCH
RUN apk add --no-cache curl tar \
  && case "${TARGETARCH}" in \
       "arm64") ARCH="arm64" ;; \
       *) ARCH="amd64" ;; \
     esac \
  && curl -fsSL -o /tmp/supabase.tar.gz "https://github.com/supabase/cli/releases/latest/download/supabase_linux_${ARCH}.tar.gz" \
  && tar -xzf /tmp/supabase.tar.gz -C /usr/local/bin \
  && rm /tmp/supabase.tar.gz

WORKDIR /workspace
ENTRYPOINT ["supabase"]
