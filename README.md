# Weather App

A NodeJS server that returns the temperature of a city.

This project is made to learn how to deploy projects on kubernetes.

## Run Locally

### Install Dependencies

`npm i`

### Build

`npm run build`

### Run

`npm start`

## Deploy

```
cd deployment/

kubectl apply -f namespace.yaml

kubectl apply -f pv.yaml

kubectl apply -f pvc.yaml

kubectl apply -f redis-deployment.yaml

kubectl apply -f redis-service.yaml

kubectl apply -f config-map.yaml

kubectl apply -f deployment.yaml

kubectl apply -f service.yaml
```

## Test Instruction

```
kubectl -n weather port-forward service/weather-app-service 8888:80

curl localhost:8888
```
