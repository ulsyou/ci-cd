node {

    checkout scm

    env.DOCKER_API_VERSION="1.46"
    
    sh "git rev-parse --short HEAD > commit-id"

    tag = readFile('commit-id').trim()  
    appName = "hello-kenzan"
    registryHost = "192.168.49.2:30400/"
    imageName = "${registryHost}${appName}:${tag}"
    env.BUILDIMG=imageName

    stage("Build") {
        sh "docker build -t ${imageName} -f applications/hello-kenzan/Dockerfile applications/hello-kenzan"
    }
    
    stage("Push") {
        sh "docker push ${imageName}"
        sh "docker tag ${imageName} ${registryHost}${appName}:latest"  
        sh "docker push ${registryHost}${appName}:latest" 
    }

    stage("Deploy") {
        sh "kubectl apply -f applications/${appName}/k8s/"
    }
}
