#!/bin/bash

DIR=$1

if [ ! -e "$DIR" ]
then
    mkdir -p $DIR
fi

openssl req -newkey rsa:2048 -nodes -keyout $DIR/key.pem -x509 -days 365 -out $DIR/cert.pem
