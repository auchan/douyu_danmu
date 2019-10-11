#!/bin/sh

while true
do
	if [ -f "error.log" ]; then
		status=`wc -w "error.log" | awk '{print $1}'` 
		if [ $status != 0 ]; then
			pid=`ps -ef | grep "python3 danmu_server.py" | grep -v "grep" | awk '{print $2}'`		
			kill -9 $pid
			echo $(TZ='Asia/Shanghai' date "+%Y-%m-%d %H:%M:%S") "error occured, kill danmu_server(pid=$pid)."
			rm "error.log"
		fi
	fi
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
