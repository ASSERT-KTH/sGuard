FROM ubuntu:18.04

SHELL ["/bin/bash", "-c"]
RUN apt-get update -q && \
    apt-get install -y \
    pkg-config git build-essential software-properties-common curl wget && \
    apt-get clean -q && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -sL https://deb.nodesource.com/setup_13.x -o nodesource_setup.sh && bash nodesource_setup.sh && apt-get install -y nodejs
RUN nodejs -v
RUN npm -v

WORKDIR /sGuard
COPY . /sGuard

# Install node dependencies
RUN npm install
RUN apt-get install -y python3-pip
RUN pip3 install solc-select
RUN solc-select use 0.4.26 --always-install

CMD [ "python3", "run_on_smartbugs.py", "smartbugs", "results" ]