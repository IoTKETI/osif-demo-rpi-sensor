#!/bin/sh

docker build -f Dockerfile.rpi -t ciot/iotweek-demo-sensor:rpi .
docker tag ciot/iotweek-demo-sensor:rpi dev.synctechno.com:5000/iotweek-ciot-demo-sensor:rpi

