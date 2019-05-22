from __future__ import unicode_literals
import socket
import time
import re
import requests
from bs4 import BeautifulSoup
import json
import pytz
from datetime import datetime
import sys
import asyncio
import websockets
import queue
from queue import Queue
import threading
from concurrent.futures import ThreadPoolExecutor
import sqlite3
import os
import traceback

import logging
logger = logging.getLogger('websockets')
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())

in_q = Queue()
connected = set()
history_barrages = list()
HISTORY_BARRAGES_MAX_SIZE = 24
IN_QUEUE_MAX_SIZE = 20
TABLE_NAME="barrage"
isExit = False

# 获取用户昵称及弹幕信息的正则表达式
danmu = re.compile(b'type@=chatmsg.*?/uid@=(.*?)/nn@=(.*?)/txt@=(.*?)/.*?/level@=(.*?)/.*?/cst@=(.*?)/bnn@=(.*?)/bl@=(.*?)/brid@=(.*?)/')

# 获取中国-上海时区
tz = pytz.timezone('Asia/Shanghai')

def sendmsg(client, msgstr):
    '''
    客户端向服务器发送请求的函数，集成发送协议头的功能
    msgHead: 发送数据前的协议头，消息长度的两倍，及消息类型、加密字段和保密字段
    使用while循环发送具体数据，保证将数据都发送出去
    '''
    msg = msgstr.encode('utf-8')
    data_length = len(msg) + 8
    code = 689
    msgHead = int.to_bytes(data_length, 4, 'little') \
              + int.to_bytes(data_length, 4, 'little') + int.to_bytes(code, 4, 'little')
    client.send(msgHead)
    sent = 0
    while sent < len(msg):
        tn = client.send(msg[sent:])
        sent = sent + tn

def opendb(roomid):
    conn = sqlite3.connect('barrage_{0}.db'.format(roomid))
    cursor = conn.cursor()
    # cursor.execute('''drop table barrage''')
    cursor.execute('''SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name = "barrage";''')
    if cursor.fetchone()[0] == 0:
        cursor.execute('''CREATE TABLE barrage
               (id INTEGER PRIMARY KEY NOT NULL,
               uid INTEGER NOT NULL,
               nickname TEXT NOT NULL,
               content TEXT NOT NULL,
               level INTEGER,
               bnn TEXT,
               bl INTEGER,
               brid INTEGER,
               cst INTEGER);''')
        cursor.execute('''create index idx_nickname on barrage (nickname)''')

        text_file = 'barrage_{0}.txt'.format(roomid) 
        if os.path.exists(text_file):
            with open(text_file, "r", encoding='utf-8') as f:
                for line in f:
                    dmDict = json.loads(line)
                    cursor.execute('''INSERT INTO barrage (uid,nickname,content,level,bnn,bl,brid,cst) VALUES(?,?,?,?,?,?,?,?)''', 
                        (cast_to_int(dmDict['uid']), dmDict['nickname'], dmDict['content'], cast_to_int(dmDict['level']), dmDict['bnn'], cast_to_int(dmDict['bl']), cast_to_int(dmDict['brid']), dmDict['cst']))
                conn.commit()
    return (conn, cursor)

def cast_to_int(str_value):
    try:
        return int(str_value)
    except:
        return 0

def start(client, roomid, in_q):
    '''
    发送登录验证请求后，获取服务器返回的弹幕信息，同时提取昵称及弹幕内容
    登陆请求消息及入组消息末尾要加入\0
    '''
    global history_barrages
    global isExit
    msg = 'type@=loginreq/roomid@={}/\0'.format(roomid)
    sendmsg(client, msg)
    msg_more = 'type@=joingroup/rid@={}/gid@=-9999/\0'.format(roomid)
    sendmsg(client, msg_more)

    print('---------------欢迎连接到{}的直播间---------------'.format(get_name(roomid)))
    log_filename = "barrage_{0}.txt".format(roomid)
    try:
        conn, cursor = opendb(roomid)
        cursor.execute("select * from barrage order by id desc limit ?", (HISTORY_BARRAGES_MAX_SIZE,))
        history_list = cursor.fetchall()
        history_barrages = []
        for i in range(len(history_list)-1,-1,-1):
            v = history_list[i]
            dmDict = {'id':v[0], 'uid':v[1], 'nickname':v[2], 'content':v[3], 'level':v[4], 'bnn':v[5], 'bl':v[6], 'brid':v[7], 'cst':v[8]}
            history_barrages.append(json.dumps(dmDict, ensure_ascii=False))
    except Exception as e:
        isExit = True
        traceback.print_exc()
        return

    recvdata_time = time.time()
    while True:
        try:
            data = client.recv(4096)
            danmu_more = danmu.findall(data)
            recvdata_time = time.time()
            if not data:
                break
            else:
                try:
                    for i in danmu_more:
                        msg_content = data.decode(encoding='utf-8', errors='ignore').replace("@S", "/").replace("@A=", ":").replace("@=", ":")
                        
                        dmDict={}
                        idx = 0
                        dmDict['uid'] = cast_to_int(i[idx].decode(encoding='utf-8', errors='ignore'))
                        idx += 1
                        dmDict['nickname'] = i[idx].decode(encoding='utf-8', errors='ignore')
                        idx += 1
                        dmDict['content'] = i[idx].decode(encoding='utf-8', errors='ignore')
                        idx += 1
                        dmDict['level'] = cast_to_int(i[idx].decode(encoding='utf-8', errors='ignore'))
                        idx += 1
                        dmDict['cst'] = cast_to_int(i[idx].decode(encoding='utf-8', errors='ignore'))
                        idx += 1
                        dmDict['bnn'] = i[idx].decode(encoding='utf-8', errors='ignore')
                        idx += 1
                        dmDict['bl'] = cast_to_int(i[idx].decode(encoding='utf-8', errors='ignore'))
                        idx += 1
                        dmDict['brid'] = cast_to_int(i[idx].decode(encoding='utf-8', errors='ignore'))
                        #override cst
                        dmDict['cst'] = round(time.time() * 1000)
                        # time_str = datetime.now(tz).strftime('%Y-%m-%d %H:%M:%S')
                        # print("<" + time_str + "> " + dmDict['nickname'] + ": "+ dmDict['content'])
                        cursor.execute('''INSERT INTO barrage (uid,nickname,content,level,bnn,bl,brid,cst) VALUES(?,?,?,?,?,?,?,?)''', 
                            (dmDict['uid'], dmDict['nickname'], dmDict['content'], dmDict['level'], dmDict['bnn'], dmDict['bl'], dmDict['brid'], dmDict['cst']))

                        dmDict['id'] = cursor.lastrowid
                        dmJsonStr = json.dumps(dmDict, ensure_ascii=False)+'\n'
                        if in_q.qsize() > IN_QUEUE_MAX_SIZE:
                            try:
                                # remove one
                                in_q.get(False)
                            except queue.Empty:
                                # consume speed is too high!
                                pass
                        in_q.put(dmJsonStr)
                        # print(dmJsonStr)
                    conn.commit()
                except Exception as e:
                    traceback.print_exc()
                    continue
        except BlockingIOError:
            time.sleep(0.1)
            if time.time() - recvdata_time > 40:
                isExit = True
            if isExit:
                return
        except:
            isExit = True
            traceback.print_exc()
            conn.close()
            return

def sleep(duration):
    count = 0
    global isExit
    while not isExit and count < duration:
        time.sleep(1)
        count += 1

def keeplive(client):
    '''
    发送心跳信息，维持TCP长连接
    心跳消息末尾加入\0
    '''
    global isExit
    sleep(5)
    while not isExit:
        msg = 'type@=keeplive/tick@=' + str(int(time.time())) + '/\0'
        # print("sendmsg...", msg)
        sendmsg(client, msg)
        # print("sendmsg end",)
        sleep(20)


def get_name(roomid):
    '''
    利用BeautifulSoup获取直播间标题
    '''
    r = requests.get("http://www.douyu.com/" + roomid)
    soup = BeautifulSoup(r.text, 'lxml')
    find_res = soup.find('a', {'class', 'Title-anchorName'})
    if find_res:
        return find_res.string
    else:
        return "unknow"

async def async_producer():
    while True:
        try:
            return in_q.get(False) #doesn't block
        except queue.Empty: #raised when queue is empty
            return

async def producer_handler(websocket, path):
    global history_barrages
    #print("connected", websocket, path)
    # Register.
    connected.add(websocket)
    #print("connected count: ", len(connected))
    #send history
    for message in history_barrages:
        await websocket.send(message)
    try:
        if len(connected) == 1:
            while len(connected) > 0:
                try:
                    message = await async_producer()
                    if message:
                        history_barrages.append(message)
                        if len(history_barrages) > HISTORY_BARRAGES_MAX_SIZE:
                            history_barrages.pop(0)

                        await asyncio.wait([ws.send(message) for ws in connected if not ws.closed])
                        if websocket.closed:
                            #print("closed", websocket, path)
                            connected.remove(websocket)
                    else:
                        await asyncio.sleep(0.1)
                except websockets.exceptions.ConnectionClosed:
                    continue
                except:
                    continue
        else:
            while True:
                try:
                    await asyncio.sleep(1)
                    if websocket.closed:
                        break
                except websockets.exceptions.ConnectionClosed:
                    break
    finally:
        #print("closed", websocket, path)
        # Unregister.
        if websocket in connected:
            connected.remove(websocket)

async def wakeup():
    while True:
        await asyncio.sleep(1)
        if isExit:
            time_str = datetime.now(tz).strftime('%Y-%m-%d %H:%M:%S')
            print("exit at " + time_str)
            sys.exit(1)

def connect_to_openbarrage():
    # 配置socket的ip和端口
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    # host = socket.gethostbyname("openbarrage.douyutv.com")
    host = socket.gethostbyname("124.95.155.51")
    port = 8601
    client.connect((host, port))
    client.settimeout(0)
    return client

# 启动程序
if __name__ == '__main__':
    # room_id = input('请输入房间ID： ')
    room_id = sys.argv[1]

    client = connect_to_openbarrage()
    thread1 = threading.Thread(target=start, args=(client, room_id, in_q,))
    thread2 = threading.Thread(target=keeplive, args=(client,), daemon=True)
    thread1.start()
    thread2.start()

    start_server = websockets.serve(producer_handler, '', 8765)
    loop = asyncio.get_event_loop()
    loop.run_until_complete(start_server)
    loop.create_task(wakeup())
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        isExit = True