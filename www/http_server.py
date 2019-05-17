from http import HTTPStatus
import http.server
import json
import io
import re
import urllib
import sqlite3
import traceback

pattern = re.compile(b'"nickname": "(.*?)"')

conn = sqlite3.connect('../barrage_2550505.db')
cursor = conn.cursor()

class SSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers['Content-Length'])
        post_data = urllib.parse.parse_qs(self.rfile.read(length).decode('utf-8'))
        print("post_data", post_data)

        if self.path == "/search_user_barrages":
            self.search_user_barrages_in_db(post_data)       
        elif self.path == "/load_barrages":
            self.load_barrages(post_data)
        else:
            self.send_response_only(HTTPStatus.NOT_IMPLEMENTED)
            self.end_headers()  

    def search_user_barrages_in_db(self, post_data):
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin","*");
        self.end_headers()
        results = []
        try:
            username = post_data['username'][0]
            if 'start_id' in post_data:
                start_id = post_data['start_id'][0]
            else:
                start_id = 0xffffffff
            cursor.execute("select uid from barrage where nickname=? and id < ? order by id desc limit 1", (username, start_id))
            v = cursor.fetchone()
            if v:
                uid = v[0]
                cursor.execute("select * from barrage where uid=? and id < ? order by id desc limit 24", (uid, start_id))
                rows = cursor.fetchall()
                for v in rows:
                    dmDict = {'id':v[0], 'uid':v[1], 'nickname':v[2], 'content':v[3], 'level':v[4], 'bnn':v[5], 'bl':v[6], 'brid':v[7], 'cst':v[8]}
                    results.append(json.dumps(dmDict, ensure_ascii=False))
        except:
            traceback.print_exc()
        finally:
            json_response = json.dumps(results)
            self.wfile.write(bytes(json_response, "utf-8"))

    def load_barrages(self, post_data):
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin","*");
        self.end_headers()
        results = []
        try:
            start_id = post_data['start_id'][0]
            cursor.execute("select * from barrage where id<? order by id desc limit 24", (start_id,))
            rows = cursor.fetchall()
            for v in rows:
                dmDict = {'id':v[0], 'uid':v[1], 'nickname':v[2], 'content':v[3], 'level':v[4], 'bnn':v[5], 'bl':v[6], 'brid':v[7], 'cst':v[8]}
                results.append(json.dumps(dmDict, ensure_ascii=False))
        except:
            traceback.print_exc()
        finally:
            json_response = json.dumps(results)
            self.wfile.write(bytes(json_response, "utf-8"))


server_address = ('', 8080)
try:
    httpd = http.server.HTTPServer(server_address, SSHTTPRequestHandler)
    httpd.serve_forever()
finally:
    conn.close()