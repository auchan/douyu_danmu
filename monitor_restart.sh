#!/bin/sh

while true
do
	ps -ef | grep "python3 danmu_server.py 2550505" | grep -v "grep" >> /dev/null
if [ "$?" -eq 1 ]
then
	python3 danmu_server.py 2550505 2>> error.log >>danmu.log  &
	echo $(TZ='Asia/Shanghai' date "+%Y-%m-%d %H:%M:%S") "process has been restarted"
else
	echo "process already started" >> /dev/null
fi

sleep 10

done
