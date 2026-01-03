#!/bin/bash
set -e

echo "=== Starting LMDeploy Setup (NVIDIA Container Toolkit) ==="

# 1. Add user to docker group
if ! groups $USER | grep &>/dev/null 'docker'; then
    echo "Adding $USER to docker group..."
    sudo usermod -aG docker $USER
    echo "User added to docker group. You may need to re-login for this to take effect."
else
    echo "User $USER is already in docker group."
fi

# 2. Install NVIDIA Container Toolkit
echo "Installing NVIDIA Container Toolkit..."
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt update
sudo apt install -y nvidia-container-toolkit
sudo systemctl restart docker

echo "=== LMDeploy Setup Complete ==="
echo "Please restart your WSL session or run 'newgrp docker' to apply group changes."
