# Sử dụng phiên bản LTS mới nhất của Jenkins
FROM jenkins/jenkins:lts

USER root

# Cài đặt Docker
RUN apt-get update && apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update && apt-get install -y docker-ce-cli containerd.io

# Cài đặt kubectl
RUN curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /" | tee /etc/apt/sources.list.d/kubernetes.list > /dev/null \
    && apt-get update && apt-get install -y kubectl

# Cấu hình quyền truy cập cho jenkins user
RUN groupadd docker
RUN usermod -aG docker jenkins
RUN mkdir -p /var/run/docker.sock && chown root:docker /var/run/docker.sock && chmod 660 /var/run/docker.sock

USER jenkins
