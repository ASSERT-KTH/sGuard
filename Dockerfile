FROM ubuntu:18.04

SHELL ["/bin/bash", "-c"]
RUN apt-get update -q && \
    apt-get install -y \
    pkg-config git build-essential software-properties-common curl wget && \
    apt-get clean -q && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -sL https://deb.nodesource.com/setup_10.x -o nodesource_setup.sh && bash nodesource_setup.sh && apt-get install -y nodejs
RUN nodejs -v
RUN npm -v

WORKDIR /sGuard
COPY src src
COPY contracts contracts
COPY results results
COPY smartbugs smartbugs
COPY package-lock.json package-lock.json
COPY package.json package.json
COPY run_on_smartbugs.py run_on_smartbugs.py

# Install node dependencies
RUN npm install
RUN apt-get install -y python3-pip
RUN pip3 install solc-select
RUN solc-select use 0.4.26 --always-install

CMD [ "python3", "run_on_smartbugs.py", "smartbugs", "results" ]