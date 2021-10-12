FROM node:16-alpine
COPY . /usr/src/app
WORKDIR /usr/src/app

RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python \
    && apk add --update make gcc musl musl-dev g++ libc-dev bash linux-headers jq \
    && npm install

COPY $PWD/docker/entrypoint.sh /usr/local/bin
COPY $PWD/docker/hardhat_node.sh /usr/local/bin
COPY $PWD/docker/deploy.sh /usr/local/bin
ENTRYPOINT ["/bin/sh", "/usr/local/bin/entrypoint.sh"]