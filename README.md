# douyu_danmu
Get barrages from 'https://www.douyu.com/', in addition provide user barrages query and real-time barrages display web service. 

## Usage
### Windows/Linux
Run python script 'danmu_server.py' with roomId in douyu to start the barrage server.
```sh
python ./danmu_server.py roomId
```
Change 'cwd' to www dir and run python script 'http_server.py' to start the web server.
```sh
cd www
python ./http_server.py
```
### Linux
run sh script 'monitor_restart' to monitor and run danmu_server. You should change the roomId inside this script.
```sh
sh ./monitor_restart.sh
```
