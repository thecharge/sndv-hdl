FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
ARG OSS_CAD_SUITE_RELEASE=2026-03-11
ARG OSS_CAD_SUITE_TAG=20260311
ARG OPENFPGALOADER_TAG=v0.13.1

RUN apt-get update -o Acquire::Retries=5 && \
  apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  xz-utils \
  git \
  build-essential \
  cmake \
  pkg-config \
  python3 \
  python3-pip \
  libftdi1-dev \
  libusb-1.0-0-dev \
  libhidapi-dev \
  libudev-dev \
  libjson-c-dev \
  zlib1g-dev \
  libssl-dev \
  && pip3 install --no-cache-dir --break-system-packages numpy fastcrc \
  && rm -rf /var/lib/apt/lists/*

RUN curl -L --retry 3 --retry-delay 5 \
  -o /tmp/oss-cad-suite.tgz \
  "https://github.com/YosysHQ/oss-cad-suite-build/releases/download/${OSS_CAD_SUITE_RELEASE}/oss-cad-suite-linux-x64-${OSS_CAD_SUITE_TAG}.tgz" \
  && tar -xzf /tmp/oss-cad-suite.tgz -C /opt \
  && rm -f /tmp/oss-cad-suite.tgz

ENV PATH="/opt/oss-cad-suite/bin:${PATH}"

RUN git clone --depth 1 --branch "${OPENFPGALOADER_TAG}" \
  https://github.com/trabucayre/openFPGALoader.git /tmp/openFPGALoader \
  && cmake -S /tmp/openFPGALoader -B /tmp/openFPGALoader/build \
  && cmake --build /tmp/openFPGALoader/build --parallel \
  && cmake --install /tmp/openFPGALoader/build \
  && rm -rf /tmp/openFPGALoader

RUN yosys -V && nextpnr-himbaechel --version && gowin_pack --help >/dev/null && openFPGALoader --help >/dev/null && sby --help >/dev/null && yosys-smtbmc --help >/dev/null 2>&1 || true

WORKDIR /workspace
